// Turning Gamma events and markets into leg candidates. Pure: no network.
import type { MarketType } from "./types";
import { competitionName, dutchSport } from "./sports";

// ---------- Gamma shapes (only the fields we use) ----------

export type GammaMarket = {
  id: string;
  question?: string;
  slug?: string;
  conditionId?: string;
  groupItemTitle?: string;
  groupItemThreshold?: string;
  sportsMarketType?: string | null;
  outcomes?: string; // JSON-encoded string array
  clobTokenIds?: string; // JSON-encoded string array, aligned with outcomes
  line?: number | null;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  acceptingOrders?: boolean;
  enableOrderBook?: boolean;
  liquidityNum?: number;
  liquidity?: number | string;
  feesEnabled?: boolean | null;
  feeSchedule?: { rate?: number | string | null; exponent?: number | string | null } | null;
};

export type GammaTeam = { id?: number | string; name?: string; ordering?: string; abbreviation?: string; alias?: string };

export type GammaEvent = {
  id: string;
  slug: string;
  title?: string;
  startTime?: string | null;
  gameId?: number | string | null;
  active?: boolean;
  closed?: boolean;
  live?: boolean | null;
  ended?: boolean | null;
  tags?: { id: string | number; slug?: string; label?: string }[] | null;
  sport?: { sport?: string | null; name?: string | null; tags?: string | null } | null;
  teams?: GammaTeam[] | null;
  eventMetadata?: { league?: unknown; serie?: unknown } | null;
  markets?: GammaMarket[] | null;
};

// ---------- matches ----------

/** Slug suffixes of companion events that belong to the same game. Longest first. */
const COMPANION_SUFFIXES = [
  "-first-half-first-to-score",
  "-second-half-first-to-score",
  "-first-half-exact-score",
  "-highest-scoring-quarter",
  "-second-half-result",
  "-toss-match-double",
  "-halftime-result",
  "-first-td-scorer",
  "-team-to-advance",
  "-first-to-score",
  "-team-top-batter",
  "-total-corners",
  "-more-markets",
  "-player-props",
  "-exact-score",
  "-most-sixes",
];

export function baseSlug(slug: string): string {
  for (const suffix of COMPANION_SUFFIXES) if (slug.endsWith(suffix)) return slug.slice(0, -suffix.length);
  return slug;
}

export type Match = {
  id: string; // stable id: main event id (max 1 leg per match)
  main: GammaEvent; // the event without companion suffix (holds the winner markets)
  events: GammaEvent[]; // main + companion events
};

/** Same teams (in any order) at the same kickoff: catches games listed twice with home/away swapped. */
function teamKey(ev: GammaEvent): string | null {
  const ids = (ev.teams ?? []).map((t) => t.id).filter((id) => id !== undefined && id !== null && id !== "");
  if (ids.length !== 2 || !ev.startTime) return null;
  return `t:${ids.map(String).sort().join("-")}|${ev.startTime}`;
}

/**
 * Group events into matches. Events belong together when they share a gameId,
 * the same base slug (companion events like "-more-markets", or games without
 * a gameId such as ITF tennis and cricket), or the same two teams at the same
 * kickoff (a game listed twice).
 */
export function groupMatches(events: GammaEvent[]): Match[] {
  const parent = events.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byKey = new Map<string, number>();
  events.forEach((ev, i) => {
    const keys = [`s:${baseSlug(ev.slug)}`];
    if (ev.gameId !== null && ev.gameId !== undefined && ev.gameId !== "") keys.push(`g:${ev.gameId}`);
    const tk = teamKey(ev);
    if (tk) keys.push(tk);
    for (const key of keys) {
      const j = byKey.get(key);
      if (j === undefined) byKey.set(key, i);
      else parent[find(i)] = find(j);
    }
  });
  const groups = new Map<number, GammaEvent[]>();
  events.forEach((ev, i) => {
    const root = find(i);
    const list = groups.get(root);
    if (list) list.push(ev);
    else groups.set(root, [ev]);
  });
  return [...groups.values()].map((list) => {
    const main =
      list.find((e) => baseSlug(e.slug) === e.slug && (e.markets ?? []).some((m) => m.sportsMarketType === "moneyline")) ??
      list.find((e) => baseSlug(e.slug) === e.slug) ??
      list[0];
    return { id: main.id, main, events: list };
  });
}

// ---------- labels ----------

/** Dutch number notation: 2.5 -> "2,5". */
export function formatLine(n: number): string {
  return String(n).replace(".", ",");
}

/**
 * "Ajax – PSV": the two teams in Polymarket's order (home first, except US
 * leagues), from event.teams; falls back to the title. Keeps "(BO3)" for esports.
 */
export function matchTitleOf(ev: GammaEvent): string {
  const title = (ev.title ?? "").trim();
  const bestOf = title.match(/\(BO\d+\)/i)?.[0];
  const names = (ev.teams ?? []).map((t) => (t.name ?? "").trim()).filter(Boolean);
  if (names.length === 2) return `${names[0]} – ${names[1]}${bestOf ? ` ${bestOf}` : ""}`;
  let t = title;
  const colon = t.indexOf(": ");
  if (colon >= 0 && /\svs\.?\s/i.test(t.slice(colon + 2))) t = t.slice(colon + 2);
  t = t.replace(/(\(BO\d+\)).*$/i, "$1").trim();
  return t.replace(/\s+vs\.?\s+/i, " – ");
}

const TOTALS_TYPES = new Set(["totals", "tennis_match_totals", "tennis_set_totals", "table_tennis_match_totals"]);

function totalsUnit(sport: string, smt: string, leagueCode: string): string {
  if (smt === "tennis_set_totals") return "sets";
  if (smt === "tennis_match_totals" || smt === "table_tennis_match_totals") return "games";
  switch (sport) {
    case "Voetbal":
    case "IJshockey":
    case "Handbal":
      return "goals";
    case "Basketbal":
    case "American football":
    case "Rugby":
      return "punten";
    case "Honkbal":
      return "runs";
    case "MMA":
    case "Boksen":
      return "ronden";
    case "Esports":
      return leagueCode === "cs2" || leagueCode === "val" ? "maps" : "games";
    default:
      return "";
  }
}

/** Soccer and rugby winners are settled on regular time only. */
function scopeSuffix(sport: string): string {
  if (sport === "Voetbal") return " (90 min)";
  if (sport === "Rugby") return " (80 min)";
  return "";
}

// ---------- leg candidates ----------

export type LegCandidate = {
  tokenId: string;
  market: GammaMarket;
  event: GammaEvent; // event that holds the market
  marketType: MarketType;
  pickLabel: string;
  group: string; // normalisation group: outcomes that exclude each other
  groupTokens: string[]; // tokens whose midpoints are normalised together
  groupIndex: number; // this pick's position in groupTokens
  complement: boolean; // fairProb = 1 - normalised[groupIndex] (the "No" of a 3-way member)
};

export type MatchInfo = {
  matchId: string;
  sport: string;
  competition: string;
  matchTitle: string;
  kickoff: string;
  url: string;
};

export type Classified = {
  info: MatchInfo;
  candidates: LegCandidate[];
  skipped: { market: GammaMarket; reason: string }[];
};

export function parseList(s: string | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Market is open for orders on the CLOB. */
export function isTradable(m: GammaMarket): boolean {
  return m.active === true && m.closed !== true && m.archived !== true && m.acceptingOrders === true && m.enableOrderBook === true;
}

const isDrawMarket = (m: GammaMarket): boolean =>
  (m.groupItemTitle ?? "").startsWith("Draw") || /end in a draw\?$/i.test(m.question ?? "") || (m.slug ?? "").endsWith("-draw");

/**
 * All leg candidates of one match: winner (and double chance when a draw is
 * possible), full-game over/under on every line, and both teams to score
 * (soccer). Everything else (handicaps, halves, player props, ...) is skipped.
 */
export function classifyMatch(match: Match, siteUrl: string): Classified {
  const main = match.main;
  const sport = dutchSport(main);
  const leagueCode = main.sport?.sport ?? "";
  const info: MatchInfo = {
    matchId: match.id,
    sport,
    competition: competitionName(main),
    matchTitle: matchTitleOf(main),
    kickoff: main.startTime ?? "",
    url: `${siteUrl}/event/${main.slug}`,
  };
  const candidates: LegCandidate[] = [];
  const skipped: Classified["skipped"] = [];
  const scope = scopeSuffix(sport);

  const winners: { market: GammaMarket; event: GammaEvent }[] = [];
  for (const event of match.events) {
    for (const market of event.markets ?? []) {
      const smt = market.sportsMarketType ?? "";
      const outcomes = parseList(market.outcomes);
      const tokens = parseList(market.clobTokenIds);
      if (!isTradable(market)) {
        skipped.push({ market, reason: "not_tradable" });
        continue;
      }
      if (outcomes.length !== 2 || tokens.length !== 2) {
        skipped.push({ market, reason: "not_binary" });
        continue;
      }
      if (smt === "moneyline") {
        winners.push({ market, event });
      } else if (TOTALS_TYPES.has(smt)) {
        const line = typeof market.line === "number" ? market.line : Number((market.question ?? "").match(/O\/U (\d+(?:\.\d+)?)/)?.[1]);
        const sides = outcomes.map((o) => (/^over/i.test(o) ? "Over" : /^under/i.test(o) ? "Under" : null));
        if (!Number.isFinite(line) || !sides[0] || !sides[1] || sides[0] === sides[1]) {
          skipped.push({ market, reason: "totals_shape" });
          continue;
        }
        const unit = totalsUnit(sport, smt, leagueCode);
        const group = `ou:${market.id}`;
        sides.forEach((side, i) =>
          candidates.push({
            tokenId: tokens[i],
            market,
            event,
            marketType: "totals",
            pickLabel: `${side} ${formatLine(line)}${unit ? ` ${unit}` : ""}`,
            group,
            groupTokens: tokens,
            groupIndex: i,
            complement: false,
          }),
        );
      } else if (smt === "both_teams_to_score" && sport === "Voetbal") {
        const yes = outcomes.findIndex((o) => o.toLowerCase() === "yes");
        const no = outcomes.findIndex((o) => o.toLowerCase() === "no");
        if (yes < 0 || no < 0) {
          skipped.push({ market, reason: "btts_shape" });
          continue;
        }
        const group = `btts:${market.id}`;
        for (const [i, label] of [
          [yes, "Beide teams scoren: ja"],
          [no, "Beide teams scoren: nee"],
        ] as const) {
          candidates.push({
            tokenId: tokens[i],
            market,
            event,
            marketType: "btts",
            pickLabel: label,
            group,
            groupTokens: tokens,
            groupIndex: i,
            complement: false,
          });
        }
      } else {
        skipped.push({ market, reason: smt ? `type:${smt}` : "no_type" });
      }
    }
  }

  // Winner markets: one 2-way market with two names, or three Yes/No markets (home, draw, away).
  const yesNo = winners.filter(({ market }) => parseList(market.outcomes).join("|").toLowerCase() === "yes|no");
  const named = winners.filter((w) => !yesNo.includes(w));
  for (const { market, event } of named) {
    const outcomes = parseList(market.outcomes);
    const tokens = parseList(market.clobTokenIds);
    const group = `ml:${market.id}`;
    outcomes.forEach((name, i) =>
      candidates.push({
        tokenId: tokens[i],
        market,
        event,
        marketType: "winner",
        pickLabel: `${name} wint${scope}`,
        group,
        groupTokens: tokens,
        groupIndex: i,
        complement: false,
      }),
    );
  }
  if (yesNo.length > 0) {
    const draws = yesNo.filter(({ market }) => isDrawMarket(market));
    const teams = yesNo.filter(({ market }) => !isDrawMarket(market));
    if (yesNo.length !== 3 || draws.length !== 1 || teams.length !== 2) {
      for (const { market } of yesNo) skipped.push({ market, reason: "unexpected_3way" });
    } else {
      // Home first (groupItemThreshold 0), then draw, then away.
      teams.sort((a, b) => Number(a.market.groupItemThreshold ?? 0) - Number(b.market.groupItemThreshold ?? 0));
      const ordered = [teams[0], draws[0], teams[1]];
      const names = [teams[0].market.groupItemTitle ?? "Thuis", teams[1].market.groupItemTitle ?? "Uit"];
      const yesTokens = ordered.map(({ market }) => parseList(market.clobTokenIds)[0]);
      const group = `1x2:${match.id}`;
      ordered.forEach(({ market, event }, i) => {
        const [yesToken, noToken] = parseList(market.clobTokenIds);
        const isDraw = i === 1;
        const team = isDraw ? "" : names[i === 0 ? 0 : 1];
        const other = isDraw ? "" : names[i === 0 ? 1 : 0];
        const base = { market, event, group, groupTokens: yesTokens, groupIndex: i };
        candidates.push({
          ...base,
          tokenId: yesToken,
          marketType: "winner",
          pickLabel: isDraw ? `Gelijkspel${scope}` : `${team} wint${scope}`,
          complement: false,
        });
        candidates.push({
          ...base,
          tokenId: noToken,
          marketType: "double_chance",
          pickLabel: isDraw
            ? `Geen gelijkspel (${names[0]} of ${names[1]} wint)${scope}`
            : `${team} wint níet (gelijk of ${other})${scope}`,
          complement: true,
        });
      });
    }
  }

  return { info, candidates, skipped };
}
