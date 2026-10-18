// Server-side data layer: reads public Polymarket data (Gamma + CLOB) and
// turns it into legs. Read-only: no keys, no wallet, no order endpoints.
import { API, LIMITS, SCAN } from "./config";
import {
  classifyMatch,
  groupMatches,
  type Classified,
  type GammaEvent,
  type GammaMarket,
  type LegCandidate,
} from "./markets";
import { bestQuote, effectivePrice, feeScheduleFor, midpoint, normalize, type Book } from "./pricing";
import type { Leg, ScanResponse } from "./types";

export class PolymarketError extends Error {
  constructor(
    message: string,
    public readonly source: "Gamma" | "CLOB",
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** fetch with timeout, and retries with exponential backoff on 429, 5xx and network errors. */
async function request(url: string, source: "Gamma" | "CLOB", init: RequestInit = {}): Promise<unknown> {
  let lastError = "";
  for (let attempt = 0; attempt <= SCAN.maxRetries; attempt++) {
    if (attempt > 0) await sleep(SCAN.backoffMs * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(SCAN.requestTimeoutMs),
        headers: { Accept: "application/json", "User-Agent": SCAN.userAgent, ...init.headers },
      });
    } catch (err) {
      lastError = err instanceof Error ? (err.name === "TimeoutError" ? "time-out" : err.message) : String(err);
      continue;
    }
    if (res.ok) return res.json();
    lastError = `HTTP ${res.status}`;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0) await sleep(Math.min(retryAfter, 10) * 1000);
      continue;
    }
    break; // 4xx other than 429: retrying will not help
  }
  throw new PolymarketError(`${source} API: ${lastError}`, source);
}

/** Run `fn` over `items` with at most `limit` running at once. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------- Gamma: events ----------

const KEEP_TYPES = new Set([
  "moneyline",
  "totals",
  "tennis_match_totals",
  "tennis_set_totals",
  "table_tennis_match_totals",
  "both_teams_to_score",
]);

/** Keep only the fields and markets we use; count what is dropped per market type. */
function trimEvent(ev: GammaEvent, dropped: Map<string, number>): GammaEvent {
  const markets: GammaMarket[] = [];
  for (const m of ev.markets ?? []) {
    const smt = m.sportsMarketType ?? "";
    if (!KEEP_TYPES.has(smt)) {
      dropped.set(smt || "(geen type)", (dropped.get(smt || "(geen type)") ?? 0) + 1);
      continue;
    }
    markets.push({
      id: m.id,
      question: m.question,
      slug: m.slug,
      conditionId: m.conditionId,
      groupItemTitle: m.groupItemTitle,
      groupItemThreshold: m.groupItemThreshold,
      sportsMarketType: m.sportsMarketType,
      outcomes: m.outcomes,
      clobTokenIds: m.clobTokenIds,
      line: m.line,
      active: m.active,
      closed: m.closed,
      archived: m.archived,
      acceptingOrders: m.acceptingOrders,
      enableOrderBook: m.enableOrderBook,
      liquidityNum: m.liquidityNum,
      liquidity: m.liquidity,
      feesEnabled: m.feesEnabled,
      feeSchedule: m.feeSchedule,
    });
  }
  return {
    id: String(ev.id),
    slug: ev.slug,
    title: ev.title,
    startTime: ev.startTime,
    gameId: ev.gameId,
    active: ev.active,
    closed: ev.closed,
    live: ev.live,
    ended: ev.ended,
    tags: (ev.tags ?? []).map((t) => ({ id: String(t.id), slug: t.slug })),
    sport: ev.sport ? { sport: ev.sport.sport, name: ev.sport.name, tags: ev.sport.tags } : null,
    teams: (ev.teams ?? []).map((t) => ({ id: t.id, name: t.name, ordering: t.ordering })),
    eventMetadata: ev.eventMetadata ? { league: ev.eventMetadata.league, serie: ev.eventMetadata.serie } : null,
    markets,
  };
}

/**
 * All open game events with a kickoff in [from, to]. The window is cut into
 * slices that are paged in parallel (keyset paging itself is sequential).
 */
export async function fetchGameEvents(from: Date, to: Date, dropped: Map<string, number>): Promise<GammaEvent[]> {
  const slices = 8;
  const span = (to.getTime() - from.getTime()) / slices;
  const ranges = Array.from({ length: slices }, (_, i) => [
    new Date(from.getTime() + i * span),
    new Date(i === slices - 1 ? to.getTime() : from.getTime() + (i + 1) * span - 1),
  ]);
  const pages = await pool(ranges, SCAN.maxConcurrency, async ([min, max]) => {
    const events: GammaEvent[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 100; page++) {
      const url = new URL(`${API.gamma}/events/keyset`);
      url.searchParams.set("tag_id", String(SCAN.gamesTagId));
      url.searchParams.set("closed", "false");
      url.searchParams.set("limit", String(SCAN.eventsPageSize));
      url.searchParams.set("start_time_min", min.toISOString());
      url.searchParams.set("start_time_max", max.toISOString());
      if (cursor) url.searchParams.set("after_cursor", cursor);
      const data = (await request(url.toString(), "Gamma")) as { events?: GammaEvent[]; next_cursor?: string | null };
      for (const ev of data.events ?? []) events.push(trimEvent(ev, dropped));
      cursor = data.next_cursor ?? null;
      if (!cursor || !data.events?.length) break;
    }
    return events;
  });
  const byId = new Map<string, GammaEvent>();
  for (const ev of pages.flat()) byId.set(ev.id, ev);
  return [...byId.values()];
}

// ---------- CLOB: order books ----------

type RawBook = {
  asset_id: string;
  bids?: { price: string; size: string }[];
  asks?: { price: string; size: string }[];
};

const toLevels = (levels: RawBook["bids"]) =>
  (levels ?? []).map((l) => ({ price: Number(l.price), size: Number(l.size) })).filter((l) => l.price > 0 && l.size > 0);

/** Order books for many tokens, 500 per POST /books. Unknown tokens are simply absent. */
export async function fetchBooks(tokenIds: string[]): Promise<Map<string, Book>> {
  const unique = [...new Set(tokenIds)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += SCAN.booksBatchSize) chunks.push(unique.slice(i, i + SCAN.booksBatchSize));
  const results = await pool(chunks, SCAN.maxConcurrency, (chunk) =>
    request(`${API.clob}/books`, "CLOB", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((token_id) => ({ token_id }))),
    }),
  );
  const books = new Map<string, Book>();
  for (const list of results) {
    for (const raw of (list as RawBook[]) ?? []) {
      books.set(String(raw.asset_id), { bids: toLevels(raw.bids), asks: toLevels(raw.asks) });
    }
  }
  return books;
}

// ---------- legs ----------

/** Turn classified candidates plus order books into legs. Pure apart from its inputs. */
export function buildLegs(classified: Classified[], books: Map<string, Book>): Leg[] {
  const legs: Leg[] = [];
  for (const { info, candidates } of classified) {
    // Normalised midpoints per group of mutually exclusive outcomes.
    const fair = new Map<string, number[] | null>();
    for (const c of candidates) {
      if (fair.has(c.group)) continue;
      const mids = c.groupTokens.map((t) => {
        const book = books.get(t);
        return book ? midpoint(bestQuote(book)) : null;
      });
      fair.set(c.group, mids.some((m) => m === null) ? null : normalize(mids as number[]));
    }
    for (const c of candidates) {
      const probs = fair.get(c.group);
      const book = books.get(c.tokenId);
      if (!probs || !book) continue;
      const { bid, ask } = bestQuote(book);
      if (bid === null || ask === null) continue;
      const fairProb = c.complement ? 1 - probs[c.groupIndex] : probs[c.groupIndex];
      const spread = Math.round((ask - bid) * 1e6) / 1e6;
      if (!(fairProb > 0) || spread > LIMITS.maxSpread.max) continue;
      legs.push({
        id: c.tokenId,
        matchId: info.matchId,
        sport: info.sport,
        competition: info.competition,
        matchTitle: info.matchTitle,
        kickoff: info.kickoff,
        marketType: c.marketType,
        pickLabel: c.pickLabel,
        fairProb,
        askPrice: ask,
        effPrice: effectivePrice(ask, feeScheduleFor(c.market)),
        spread,
        liquidity: marketLiquidity(c),
        url: info.url,
      });
    }
  }
  return legs;
}

function marketLiquidity(c: LegCandidate): number {
  const n = Number(c.market.liquidityNum ?? c.market.liquidity);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Event has not started and is still open. `live` is only set minutes after
 * kickoff and books are wiped at the scheduled start, so keep a margin.
 */
export function isUpcoming(ev: GammaEvent, now: Date, until: Date): boolean {
  if (!ev.startTime || ev.closed === true || ev.live === true || ev.ended === true) return false;
  const t = Date.parse(ev.startTime);
  return Number.isFinite(t) && t > now.getTime() + SCAN.kickoffMarginMs && t <= until.getTime();
}

/** Full scan: events -> matches -> leg candidates -> order books -> legs. */
export async function scan(now = new Date()): Promise<ScanResponse> {
  const until = new Date(now.getTime() + SCAN.windowHours * 3_600_000);
  const dropped = new Map<string, number>();
  const events = (await fetchGameEvents(now, until, dropped)).filter((ev) => isUpcoming(ev, now, until));
  const classified = groupMatches(events)
    .map((m) => classifyMatch(m, API.site))
    .filter((c) => c.candidates.length > 0);

  const tokens = classified.flatMap((c) => c.candidates.flatMap((x) => [x.tokenId, ...x.groupTokens]));
  const books = await fetchBooks(tokens);
  const legs = buildLegs(classified, books);

  const skippedTypes = new Map(dropped);
  for (const c of classified) for (const s of c.skipped) skippedTypes.set(s.reason, (skippedTypes.get(s.reason) ?? 0) + 1);
  const skippedMarkets = [...skippedTypes.values()].reduce((a, b) => a + b, 0);
  console.info(
    `[scan] ${events.length} events, ${classified.length} wedstrijden, ${books.size} orderboeken, ${legs.length} legs; ` +
      `overgeslagen markten: ${[...skippedTypes].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(", ")}`,
  );

  const legMarkets = new Set(legs.map((l) => l.id));
  const markets = new Set<string>();
  for (const c of classified) for (const x of c.candidates) if (legMarkets.has(x.tokenId)) markets.add(x.market.id);
  return {
    ok: true,
    stats: {
      scannedAt: now.toISOString(),
      matches: new Set(legs.map((l) => l.matchId)).size,
      markets: markets.size,
      legs: legs.length,
      skippedMarkets,
    },
    legs,
  };
}
