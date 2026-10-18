import { describe, expect, it } from "vitest";
import {
  comboEV,
  comboKey,
  comboProbability,
  comboReturn,
  compareCombos,
  filterLegs,
  findBestCombos,
  makeCombo,
  paretoFilter,
  selectDiverse,
  type Combo,
  type ComboSettings,
} from "@/lib/combos";
import type { Leg } from "@/lib/types";
import { fakeLeg, fakeMatches } from "./fake-legs";

const NO_DIVERSITY: ComboSettings = { minLegs: 2, maxLegs: 5, minReturn: 2, maxResults: 10, maxLegReuse: Infinity };

/** Every valid combo (one leg per match, leg count in range, return >= Rmin), best `keep` first. */
function bruteForce(legs: Leg[], settings: ComboSettings, keep: number): Combo[] {
  const groups = [...Map.groupBy(legs, (l) => l.matchId).values()];
  const best: Combo[] = []; // sorted, best first
  const chosen: Leg[] = [];

  const consider = () => {
    const combo = makeCombo([...chosen]);
    if (combo.ret < settings.minReturn) return;
    if (best.length >= keep && compareCombos(combo, best[best.length - 1]) >= 0) return;
    let lo = 0;
    let hi = best.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (compareCombos(best[mid], combo) <= 0) lo = mid + 1;
      else hi = mid;
    }
    best.splice(lo, 0, combo);
    if (best.length > keep) best.pop();
  };

  const walk = (g: number, prob: number) => {
    // Adding legs only lowers the probability, so a branch already below the
    // current number `keep` can never enter the list.
    const worstProb = best.length >= keep ? best[best.length - 1].prob : -1;
    if (prob < worstProb * (1 - 1e-9)) return;
    if (chosen.length >= settings.minLegs) consider();
    if (chosen.length === settings.maxLegs) return;
    for (let i = g; i < groups.length; i++) {
      for (const leg of groups[i]) {
        chosen.push(leg);
        walk(i + 1, prob * leg.fairProb);
        chosen.pop();
      }
    }
  };
  walk(0, 1);
  return best;
}

describe("rekenregels", () => {
  const a = fakeLeg({ id: "a", matchId: "1", fairProb: 0.8, effPrice: 0.82 });
  const b = fakeLeg({ id: "b", matchId: "2", fairProb: 0.6, effPrice: 0.625 });

  it("kans = product van de eerlijke kansen", () => {
    expect(comboProbability([a, b])).toBeCloseTo(0.48, 12);
  });

  it("return = 1 / product van de effectieve prijzen", () => {
    expect(comboReturn([a, b])).toBeCloseTo(1 / (0.82 * 0.625), 12);
  });

  it("EV = kans x return", () => {
    const combo = makeCombo([a, b]);
    expect(combo.ev).toBeCloseTo(0.48 / (0.82 * 0.625), 12);
    expect(comboEV(0.5, 1.9)).toBeCloseTo(0.95, 12);
  });

  it("eerste aftrap is de vroegste aftrap", () => {
    const early = fakeLeg({ id: "c", matchId: "3", fairProb: 0.5, effPrice: 0.52, kickoff: "2026-10-19T12:00:00Z" });
    expect(makeCombo([a, early, b]).firstKickoff).toBe("2026-10-19T12:00:00Z");
  });

  it("sorteert op kans, bij gelijke kans op EV", () => {
    const x = makeCombo([fakeLeg({ id: "x", matchId: "1", fairProb: 0.5, effPrice: 0.5 })]);
    const y = makeCombo([fakeLeg({ id: "y", matchId: "1", fairProb: 0.5, effPrice: 0.45 })]);
    const z = makeCombo([fakeLeg({ id: "z", matchId: "1", fairProb: 0.6, effPrice: 0.7 })]);
    expect([x, y, z].sort(compareCombos).map((c) => c.legs[0].id)).toEqual(["z", "y", "x"]);
  });
});

describe("filters", () => {
  it("Pareto: houdt per wedstrijd alleen legs die niet op kans én return verliezen", () => {
    const legs = [
      fakeLeg({ id: "safe", matchId: "1", fairProb: 0.8, effPrice: 0.82 }),
      fakeLeg({ id: "worse", matchId: "1", fairProb: 0.75, effPrice: 0.83 }), // lower prob and lower return
      fakeLeg({ id: "long", matchId: "1", fairProb: 0.3, effPrice: 0.32 }), // lower prob, higher return
      fakeLeg({ id: "other", matchId: "2", fairProb: 0.7, effPrice: 0.9 }), // other match: untouched
    ];
    expect(paretoFilter(legs).map((l) => l.id)).toEqual(["safe", "long", "other"]);
  });

  it("filtert op sport, markttype, liquiditeit en spread", () => {
    const legs = [
      fakeLeg({ id: "ok", matchId: "1", fairProb: 0.5, effPrice: 0.52, spread: 0.02, liquidity: 600 }),
      fakeLeg({ id: "wide", matchId: "2", fairProb: 0.5, effPrice: 0.52, spread: 0.05, liquidity: 600 }),
      fakeLeg({ id: "thin", matchId: "3", fairProb: 0.5, effPrice: 0.52, spread: 0.01, liquidity: 100 }),
      fakeLeg({ id: "nba", matchId: "4", fairProb: 0.5, effPrice: 0.52, spread: 0.01, liquidity: 900, sport: "Basketbal" }),
      fakeLeg({ id: "btts", matchId: "5", fairProb: 0.5, effPrice: 0.52, spread: 0.04, liquidity: 500, marketType: "btts" }),
    ];
    const kept = filterLegs(legs, {
      sports: ["Voetbal"],
      marketTypes: ["winner", "btts"],
      minLiquidity: 500,
      maxSpread: 0.04,
      maxLegProb: 1,
    });
    expect(kept.map((l) => l.id)).toEqual(["ok", "btts"]);
    expect(
      filterLegs(legs, { sports: null, marketTypes: ["winner"], minLiquidity: 0, maxSpread: 1, maxLegProb: 1 }),
    ).toHaveLength(4);
  });

  it("slaat bijna-zekere legs over boven de max. kans per leg", () => {
    const legs = [
      fakeLeg({ id: "safe", matchId: "1", fairProb: 0.97, effPrice: 0.976 }),
      fakeLeg({ id: "eighty", matchId: "2", fairProb: 0.8, effPrice: 0.81 }),
      fakeLeg({ id: "coin", matchId: "3", fairProb: 0.5, effPrice: 0.52 }),
    ];
    const filter = { sports: null, marketTypes: ["winner" as const], minLiquidity: 0, maxSpread: 1 };
    expect(filterLegs(legs, { ...filter, maxLegProb: 0.8 }).map((l) => l.id)).toEqual(["eighty", "coin"]);
    expect(filterLegs(legs, { ...filter, maxLegProb: 0.7 }).map((l) => l.id)).toEqual(["coin"]);
    expect(filterLegs(legs, { ...filter, maxLegProb: 1 })).toHaveLength(3);
  });

  it("diversiteit: dezelfde leg in maximaal N combos", () => {
    const legs = fakeMatches(7, 12, 3, 5);
    const all = bruteForce(legs, { ...NO_DIVERSITY, maxResults: 500 }, 500);
    const picked = selectDiverse(all, 25, 3);
    const usage = new Map<string, number>();
    for (const c of picked) for (const l of c.legs) usage.set(l.id, (usage.get(l.id) ?? 0) + 1);
    expect(Math.max(...usage.values())).toBeLessThanOrEqual(3);
    expect(picked.length).toBe(25);
  });
});

describe("optimizer vs. brute force", () => {
  const cases: [number, number][] = [
    [1, 2],
    [2, 1.5],
    [3, 3],
    [4, 5],
    [5, 10],
    [6, 2],
  ];

  it.each(cases)("seed %i, Rmin %d: top-10 gelijk aan brute force (zonder Pareto)", (seed, minReturn) => {
    const legs = fakeMatches(seed, 20, 3, 5);
    const settings = { ...NO_DIVERSITY, minReturn };
    const brute = bruteForce(legs, settings, 10);
    const { combos } = findBestCombos(legs, settings, { paretoPrune: false });
    expect(combos).toHaveLength(brute.length);
    combos.forEach((c, i) => {
      expect(c.prob).toBeCloseTo(brute[i].prob, 12);
      expect(comboKey(c.legs)).toBe(comboKey(brute[i].legs));
    });
  });

  it.each(cases)("seed %i, Rmin %d: top-10 gelijk aan brute force op Pareto-legs", (seed, minReturn) => {
    const legs = fakeMatches(seed + 100, 20, 3, 5);
    const settings = { ...NO_DIVERSITY, minReturn };
    const brute = bruteForce(paretoFilter(legs), settings, 10);
    const { combos } = findBestCombos(legs, settings);
    expect(combos.map((c) => c.prob)).toHaveLength(brute.length);
    combos.forEach((c, i) => expect(c.prob).toBeCloseTo(brute[i].prob, 12));
  });

  it("met diversiteit: zelfde lijst als greedy over de brute-force ranglijst", () => {
    const legs = fakeMatches(11, 20, 3, 5);
    const settings: ComboSettings = { minLegs: 2, maxLegs: 5, minReturn: 2, maxResults: 25, maxLegReuse: 3 };
    const brute = selectDiverse(bruteForce(paretoFilter(legs), { ...settings, maxLegReuse: Infinity }, 3000), 25, 3);
    const { combos } = findBestCombos(legs, settings);
    expect(combos.map((c) => comboKey(c.legs))).toEqual(brute.map((c) => comboKey(c.legs)));
  });

  it("2 tot 3 legs en een hoge Rmin", () => {
    const legs = fakeMatches(21, 20, 3, 5);
    const settings: ComboSettings = { minLegs: 2, maxLegs: 3, minReturn: 8, maxResults: 10, maxLegReuse: Infinity };
    const brute = bruteForce(legs, settings, 10);
    const { combos } = findBestCombos(legs, settings, { paretoPrune: false });
    expect(combos.map((c) => c.prob)).toEqual(brute.map((c) => c.prob));
  });
});

describe("harde regels", () => {
  it.each([1, 2, 3, 4, 5])("seed %i: legs binnen bereik, max. 1 per wedstrijd, return >= Rmin, leg max. 3x", (seed) => {
    const legs = fakeMatches(seed * 31, 60, 2, 7);
    for (const settings of [
      { minLegs: 2, maxLegs: 5, minReturn: 2, maxResults: 25, maxLegReuse: 3 },
      { minLegs: 3, maxLegs: 4, minReturn: 6.5, maxResults: 40, maxLegReuse: 2 },
      { minLegs: 2, maxLegs: 2, minReturn: 1.2, maxResults: 10, maxLegReuse: 1 },
    ]) {
      const { combos } = findBestCombos(legs, settings);
      expect(combos.length).toBeGreaterThan(0);
      const usage = new Map<string, number>();
      for (const c of combos) {
        expect(c.legs.length).toBeGreaterThanOrEqual(settings.minLegs);
        expect(c.legs.length).toBeLessThanOrEqual(settings.maxLegs);
        expect(new Set(c.legs.map((l) => l.matchId)).size).toBe(c.legs.length);
        expect(c.ret).toBeGreaterThanOrEqual(settings.minReturn);
        expect(comboReturn(c.legs)).toBe(c.ret);
        for (const l of c.legs) usage.set(l.id, (usage.get(l.id) ?? 0) + 1);
      }
      expect(Math.max(...usage.values())).toBeLessThanOrEqual(settings.maxLegReuse);
      for (let i = 1; i < combos.length; i++) expect(compareCombos(combos[i - 1], combos[i])).toBeLessThanOrEqual(0);
    }
  });

  it("negeert legs zonder bruikbare prijs of kans", () => {
    const legs = [
      fakeLeg({ id: "a", matchId: "1", fairProb: 0.9, effPrice: 1 }),
      fakeLeg({ id: "b", matchId: "2", fairProb: 0, effPrice: 0.5 }),
      fakeLeg({ id: "c", matchId: "3", fairProb: 0.7, effPrice: 0.72 }),
      fakeLeg({ id: "d", matchId: "4", fairProb: 0.6, effPrice: 0.62 }),
    ];
    const { combos } = findBestCombos(legs, { minLegs: 2, maxLegs: 5, minReturn: 1.5, maxResults: 5, maxLegReuse: 3 });
    expect(combos.map((c) => comboKey(c.legs))).toEqual(["c|d"]);
  });

  it("geeft een lege lijst als niets de minimale return haalt", () => {
    const legs = fakeMatches(3, 5, 3, 3).map((l) => ({ ...l, effPrice: 0.99, fairProb: 0.98 }));
    expect(findBestCombos(legs, { minLegs: 2, maxLegs: 5, minReturn: 20, maxResults: 25, maxLegReuse: 3 }).combos).toEqual([]);
  });
});

describe("snelheid", () => {
  it("300 wedstrijden x 6 legs in minder dan 1 seconde", () => {
    const legs = fakeMatches(42, 300, 6, 6);
    expect(legs).toHaveLength(1800);
    const settings: ComboSettings = { minLegs: 2, maxLegs: 5, minReturn: 2, maxResults: 25, maxLegReuse: 3 };
    findBestCombos(legs.slice(0, 200), settings); // warm-up (JIT)
    const t0 = performance.now();
    const { combos } = findBestCombos(legs, settings);
    const ms = performance.now() - t0;
    expect(combos).toHaveLength(25);
    expect(ms).toBeLessThan(1000);
  });
});
