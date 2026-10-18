// Fake data for tests only. The real app never uses this.
import type { Leg, MarketType } from "@/lib/types";

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TYPES: MarketType[] = ["winner", "double_chance", "totals", "btts"];

export function fakeLeg(partial: Partial<Leg> & Pick<Leg, "id" | "matchId" | "fairProb" | "effPrice">): Leg {
  return {
    sport: "Voetbal",
    competition: "Testcompetitie",
    matchTitle: `Wedstrijd ${partial.matchId}`,
    kickoff: "2026-10-19T19:00:00Z",
    marketType: "winner",
    pickLabel: `Keuze ${partial.id}`,
    askPrice: partial.effPrice,
    spread: 0.01,
    liquidity: 10_000,
    url: "https://polymarket.com/event/test",
    ...partial,
  };
}

/** `matches` fake matches with between minLegs and maxLegs legs each. */
export function fakeMatches(seed: number, matches: number, minLegs: number, maxLegs: number): Leg[] {
  const rand = rng(seed);
  const legs: Leg[] = [];
  for (let m = 0; m < matches; m++) {
    const n = minLegs + Math.floor(rand() * (maxLegs - minLegs + 1));
    const kickoffHour = Math.floor(rand() * 48);
    for (let i = 0; i < n; i++) {
      const fairProb = 0.05 + rand() * 0.9;
      const ask = Math.min(0.99, fairProb + 0.002 + rand() * 0.03);
      const effPrice = ask + 0.05 * ask * (1 - ask);
      legs.push(
        fakeLeg({
          id: `m${m}-l${i}`,
          matchId: `m${m}`,
          fairProb,
          askPrice: ask,
          effPrice,
          marketType: TYPES[i % TYPES.length],
          kickoff: new Date(Date.UTC(2026, 9, 19, 0) + kickoffHour * 3_600_000).toISOString(),
        }),
      );
    }
  }
  return legs;
}
