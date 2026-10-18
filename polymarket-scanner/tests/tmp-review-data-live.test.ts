import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { fetchGameEvents, isUpcoming } from "@/lib/polymarket";
import { classifyMatch, groupMatches } from "@/lib/markets";

const OUT = "/tmp/claude-0/-home-user-louffee-website/347568f2-6f17-5f80-8a1d-99be469371b9/scratchpad/review";

async function unsliced(from: Date, to: Date) {
  const out: { id: string; slug: string; startTime: string }[] = [];
  let cursor: string | null = null;
  for (let p = 0; p < 200; p++) {
    const u = new URL("https://gamma-api.polymarket.com/events/keyset");
    u.searchParams.set("tag_id", "100639");
    u.searchParams.set("closed", "false");
    u.searchParams.set("limit", "100");
    u.searchParams.set("start_time_min", from.toISOString());
    u.searchParams.set("start_time_max", to.toISOString());
    if (cursor) u.searchParams.set("after_cursor", cursor);
    const d = (await (await fetch(u, { headers: { "User-Agent": "review" } })).json()) as {
      events?: { id: string; slug: string; startTime: string }[];
      next_cursor?: string;
    };
    for (const e of d.events ?? []) out.push({ id: String(e.id), slug: e.slug, startTime: e.startTime });
    cursor = d.next_cursor ?? null;
    if (!cursor || !d.events?.length) break;
  }
  return out;
}

it("live: sliced fetch vs unsliced", async () => {
  const now = new Date();
  const until = new Date(now.getTime() + 48 * 3600_000);
  const dropped = new Map<string, number>();
  const t0 = performance.now();
  const sliced = await fetchGameEvents(now, until, dropped);
  const t1 = performance.now();
  const ref = await unsliced(now, until);
  const a = new Set(sliced.map((e) => e.id));
  const b = new Set(ref.map((e) => e.id));
  const onlyRef = ref.filter((e) => !a.has(e.id));
  const onlySliced = sliced.filter((e) => !b.has(e.id)).map((e) => e.slug);
  const upcoming = sliced.filter((e) => isUpcoming(e, now, until));
  const classified = groupMatches(upcoming).map((m) => classifyMatch(m, "https://polymarket.com"));
  const reasons = new Map<string, number>();
  for (const c of classified) for (const s of c.skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
  const notBinary = classified.flatMap((c) =>
    c.skipped.filter((s) => ["not_binary", "totals_shape", "btts_shape", "unexpected_3way"].includes(s.reason)).map((s) => [c.info.matchTitle, s.reason, s.market.question, s.market.outcomes]),
  );
  const noTradable = classified
    .flatMap((c) => c.skipped.filter((s) => s.reason === "not_tradable").map((s) => [c.info.matchTitle, s.market.sportsMarketType, s.market.active, s.market.closed, s.market.acceptingOrders, s.market.enableOrderBook]))
    .slice(0, 40);
  writeFileSync(
    `${OUT}/live-fetch.json`,
    JSON.stringify(
      {
        ms: t1 - t0,
        sliced: sliced.length,
        ref: ref.length,
        onlyRef,
        onlySliced,
        upcoming: upcoming.length,
        matches: classified.length,
        withCandidates: classified.filter((c) => c.candidates.length).length,
        reasons: [...reasons],
        notBinary,
        noTradable,
        dropped: [...dropped].sort((x, y) => y[1] - x[1]).slice(0, 15),
      },
      null,
      1,
    ),
  );
  writeFileSync(`${OUT}/classified.json`, JSON.stringify(classified.map((c) => ({ info: c.info, cands: c.candidates.map((x) => ({ t: x.tokenId, mt: x.marketType, label: x.pickLabel, g: x.group, gt: x.groupTokens, gi: x.groupIndex, comp: x.complement, ev: x.event.slug, mid: x.market.id, q: x.market.question })) }))));
}, 120_000);
