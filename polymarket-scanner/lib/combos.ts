// Pure combo optimizer: no network, no DOM. Runs in the browser so the
// settings sliders can recompute instantly without a new scan.
import type { Leg, MarketType } from "./types";

export type ComboSettings = {
  minLegs: number;
  maxLegs: number;
  minReturn: number; // Rmin, e.g. 2.0 = at least 2x payout per 1 staked
  maxResults: number;
  maxLegReuse: number; // diversity: a leg may appear in at most this many combos
};

export type LegFilter = {
  sports: string[] | null; // null = all sports
  marketTypes: MarketType[];
  minLiquidity: number; // USD
  maxSpread: number; // price units, 0.04 = 4 cents
};

export type OptimizerOptions = {
  topK?: number; // partial combos kept per DP state (default 50)
  capTopK?: number; // partial combos kept per "return already reached" state
  step?: number; // bucket width of sum(ln(1/effPrice)) (default 0.005)
  paretoPrune?: boolean; // keep only Pareto-optimal legs per match (default true)
  maxRounds?: number; // diversity rounds (default 8)
};

export type Combo = {
  legs: Leg[];
  prob: number; // product of fairProb
  ret: number; // 1 / product of effPrice
  ev: number; // prob * ret, payout expectation per 1 staked
  firstKickoff: string;
};

export type OptimizerStats = {
  inputLegs: number;
  usableLegs: number;
  matches: number;
  rounds: number;
  candidates: number;
};

export type OptimizerResult = {
  combos: Combo[];
  stats: OptimizerStats;
};

const DEFAULT_TOP_K = 50;
const DEFAULT_STEP = 0.005;
const EPS = 1e-12;

// ---------- basic arithmetic ----------

export function comboProbability(legs: Pick<Leg, "fairProb">[]): number {
  let p = 1;
  for (const leg of legs) p *= leg.fairProb;
  return p;
}

export function comboReturn(legs: Pick<Leg, "effPrice">[]): number {
  let price = 1;
  for (const leg of legs) price *= leg.effPrice;
  return 1 / price;
}

export function comboEV(prob: number, ret: number): number {
  return prob * ret;
}

/** Legs sorted by kickoff (then id), so equal leg sets give bit-identical numbers. */
export function makeCombo(legs: Leg[]): Combo {
  const sorted = [...legs].sort((a, b) =>
    a.kickoff !== b.kickoff ? (a.kickoff < b.kickoff ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const prob = comboProbability(sorted);
  const ret = comboReturn(sorted);
  return { legs: sorted, prob, ret, ev: comboEV(prob, ret), firstKickoff: sorted[0]?.kickoff ?? "" };
}

export function comboKey(legs: Pick<Leg, "id">[]): string {
  return legs
    .map((l) => l.id)
    .sort()
    .join("|");
}

/** Highest probability first; equal probability: higher EV first; then a stable key. */
export function compareCombos(a: Combo, b: Combo): number {
  if (a.prob !== b.prob) return b.prob - a.prob;
  if (a.ev !== b.ev) return b.ev - a.ev;
  const ka = comboKey(a.legs);
  const kb = comboKey(b.legs);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** A leg can enter the optimizer only with a real probability and a price below 1. */
export function isUsableLeg(leg: Pick<Leg, "fairProb" | "effPrice">): boolean {
  return (
    Number.isFinite(leg.fairProb) &&
    Number.isFinite(leg.effPrice) &&
    leg.fairProb > 0 &&
    leg.fairProb <= 1 &&
    leg.effPrice > 0 &&
    leg.effPrice < 1
  );
}

// ---------- filters ----------

export function filterLegs(legs: Leg[], filter: LegFilter): Leg[] {
  const sports = filter.sports ? new Set(filter.sports) : null;
  const types = new Set(filter.marketTypes);
  return legs.filter(
    (leg) =>
      (!sports || sports.has(leg.sport)) &&
      types.has(leg.marketType) &&
      leg.liquidity >= filter.minLiquidity &&
      leg.spread <= filter.maxSpread + EPS,
  );
}

/**
 * Per match, drop legs that another leg of the same match beats on both
 * probability and return (higher-or-equal on both, strictly better on one).
 * Swapping such a leg for its dominator never makes a combo worse.
 */
export function paretoFilter<T extends Pick<Leg, "matchId" | "fairProb" | "effPrice">>(legs: T[]): T[] {
  const byMatch = groupByMatch(legs);
  const keep = new Set<T>();
  for (const group of byMatch.values()) {
    for (const leg of group) {
      const dominated = group.some(
        (other) =>
          other !== leg &&
          other.fairProb >= leg.fairProb &&
          other.effPrice <= leg.effPrice &&
          (other.fairProb > leg.fairProb || other.effPrice < leg.effPrice),
      );
      if (!dominated) keep.add(leg);
    }
  }
  return legs.filter((leg) => keep.has(leg));
}

function groupByMatch<T extends Pick<Leg, "matchId">>(legs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const leg of legs) {
    const group = map.get(leg.matchId);
    if (group) group.push(leg);
    else map.set(leg.matchId, [leg]);
  }
  return map;
}

// ---------- diversity ----------

/** Greedy: walk the sorted list, take a combo only if none of its legs is used up. */
export function selectDiverse(sorted: Combo[], maxResults: number, maxLegReuse: number): Combo[] {
  const usage = new Map<string, number>();
  const picked: Combo[] = [];
  for (const combo of sorted) {
    if (picked.length >= maxResults) break;
    if (combo.legs.some((leg) => (usage.get(leg.id) ?? 0) >= maxLegReuse)) continue;
    picked.push(combo);
    for (const leg of combo.legs) usage.set(leg.id, (usage.get(leg.id) ?? 0) + 1);
  }
  return picked;
}

// ---------- group-knapsack DP ----------

type DpLeg = { index: number; q: number; r: number };

/** One DP result: per leg count, the partial combos that reach Rmin. */
type DpResult = {
  perCount: number[][]; // node ids, per leg count
  q: Float64Array; // sum ln(fairProb) per node
  legOf: Int32Array; // leg index per node (-1 = empty combo)
  prevOf: Int32Array; // previous node per node (-1 = none)
};

/**
 * Optimistic bound for pruning. Entry [t * (cap + 1) + j] = highest sum q of
 * exactly t legs whose sum r covers j buckets, where legs may repeat, may come
 * from any match and have their r rounded up. Every real completion of a
 * partial combo satisfies these relaxed rules, so it can never beat the bound.
 */
function completionBounds(matches: DpLeg[][], maxT: number, cap: number, step: number): Float64Array {
  const width = cap + 1;
  // Best q per number of covered buckets (r rounded up, capped at `cap`).
  const bestQ = new Float64Array(width).fill(-Infinity);
  for (const m of matches) {
    for (const l of m) {
      const k = Math.min(cap, Math.ceil(l.r / step));
      if (l.q > bestQ[k]) bestQ[k] = l.q;
    }
  }
  // Only the frontier matters: covering more buckets with a higher q wins.
  const frontK: number[] = [];
  const frontQ: number[] = [];
  let run = -Infinity;
  for (let k = cap; k >= 0; k--) {
    if (bestQ[k] > run) {
      run = bestQ[k];
      frontK.push(k);
      frontQ.push(bestQ[k]);
    }
  }
  const out = new Float64Array((maxT + 1) * width).fill(-Infinity);
  out[0] = 0; // t = 0 covers nothing
  for (let t = 1; t <= maxT; t++) {
    for (let j = 0; j <= cap; j++) {
      let v = -Infinity;
      for (let f = 0; f < frontK.length; f++) {
        const w = frontQ[f] + out[(t - 1) * width + Math.max(0, j - frontK[f])];
        if (w > v) v = w;
      }
      out[t * width + j] = v;
    }
  }
  return out;
}

/**
 * One DP pass over the matches (group knapsack). State = (number of legs,
 * bucket of sum r). Buckets have width `step`; a partial combo whose exact
 * sum r reaches ln(Rmin) goes to the single top bucket ("cap") of its leg
 * count. Each normal state keeps its `topK` best partial combos on sum q,
 * sorted best first; each cap state keeps `capTopK` in a min-heap.
 * Partial combos are stored in typed arrays and linked to their parent.
 */
function runDp(
  matches: DpLeg[][],
  minLegs: number,
  maxLegs: number,
  lnR: number,
  step: number,
  topK: number,
  capTopK: number,
): DpResult {
  const cap = lnR > 0 ? Math.ceil(lnR / step) : 0;
  const width = cap + 1;
  const lnRmin = lnR - EPS;
  const bounds = completionBounds(matches, maxLegs, cap, step);

  // Node pool.
  let size = 1 << 15;
  let nQ = new Float64Array(size);
  let nR = new Float64Array(size);
  let nLeg = new Int32Array(size);
  let nPrev = new Int32Array(size);
  let nodes = 0;
  const newNode = (q: number, r: number, leg: number, prev: number): number => {
    if (nodes === size) {
      size *= 2;
      const grow = <T extends Float64Array | Int32Array>(a: T, make: (n: number) => T): T => {
        const b = make(size);
        b.set(a);
        return b;
      };
      nQ = grow(nQ, (n) => new Float64Array(n));
      nR = grow(nR, (n) => new Float64Array(n));
      nLeg = grow(nLeg, (n) => new Int32Array(n));
      nPrev = grow(nPrev, (n) => new Int32Array(n));
    }
    nQ[nodes] = q;
    nR[nodes] = r;
    nLeg[nodes] = leg;
    nPrev[nodes] = prev;
    return nodes++;
  };

  // Normal states (bucket < cap): sorted slots, best q first.
  const slots = new Int32Array(Math.max(1, (maxLegs + 1) * cap * topK));
  const lens = new Int32Array(Math.max(1, (maxLegs + 1) * cap));
  // Cap states: min-heaps on q, one per leg count.
  const heaps: Int32Array[] = [];
  const heapLen = new Int32Array(maxLegs + 1);
  for (let c = 0; c <= maxLegs; c++) heaps.push(new Int32Array(capTopK));

  const bucketOf = (r: number): number => {
    if (r >= lnRmin) return cap;
    const b = Math.floor(r / step);
    return b < 0 ? 0 : b >= cap ? cap - 1 : b;
  };

  // q a new entry of state (c, b) must beat.
  const thresholdOf = (c: number, b: number): number => {
    if (b === cap) return heapLen[c] < capTopK ? -Infinity : nQ[heaps[c][0]];
    const s = c * cap + b;
    return lens[s] < topK ? -Infinity : nQ[slots[s * topK + topK - 1]];
  };

  const insertSorted = (c: number, b: number, id: number): void => {
    const s = c * cap + b;
    const base = s * topK;
    let len = lens[s];
    const q = nQ[id];
    if (len === topK) len--; // the last one drops out
    let i = len;
    while (i > 0 && nQ[slots[base + i - 1]] < q) {
      slots[base + i] = slots[base + i - 1];
      i--;
    }
    slots[base + i] = id;
    lens[s] = len + 1;
  };

  const insertHeap = (c: number, id: number): void => {
    const h = heaps[c];
    const q = nQ[id];
    let n = heapLen[c];
    if (n < capTopK) {
      let i = n++;
      heapLen[c] = n;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (nQ[h[p]] <= q) break;
        h[i] = h[p];
        i = p;
      }
      h[i] = id;
      return;
    }
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= n) break;
      const rgt = l + 1;
      const m = rgt < n && nQ[h[rgt]] < nQ[h[l]] ? rgt : l;
      if (nQ[h[m]] >= q) break;
      h[i] = h[m];
      i = m;
    }
    h[i] = id;
  };

  // Worst q kept in the final (cap) list per leg count. A partial combo that
  // cannot beat it for any reachable leg count is useless.
  const floorQ = new Float64Array(maxLegs + 1).fill(-Infinity);
  const canStillWin = (count: number, q: number, r: number): boolean => {
    let need = Math.floor((lnR - r) / step);
    if (need < 0) need = 0;
    else if (need > cap) need = cap;
    for (let t = 1; count + t <= maxLegs; t++) {
      if (count + t >= minLegs && q + bounds[t * width + need] > floorQ[count + t]) return true;
    }
    return false;
  };
  // Lowest q at which a partial combo with `count` legs and `need` buckets to
  // go can still win (or, if `landsInCap`, enter its own final list); used to
  // cut a sorted list short.
  const aliveFrom = (count: number, need: number, landsInCap: boolean): number => {
    let qMin = landsInCap && count >= minLegs ? floorQ[count] : Infinity;
    for (let t = 1; count + t <= maxLegs; t++) {
      if (count + t >= minLegs) qMin = Math.min(qMin, floorQ[count + t] - bounds[t * width + need]);
    }
    return qMin;
  };

  const tryAdd = (c: number, node: number, leg: DpLeg): void => {
    const q = nQ[node] + leg.q;
    const r = nR[node] + leg.r;
    const nb = bucketOf(r);
    if (q <= thresholdOf(c + 1, nb)) return;
    // Keep it if it enters a final list itself or can still grow into one.
    const entersFinalList = nb === cap && c + 1 >= minLegs && q > floorQ[c + 1];
    if (!entersFinalList && !canStillWin(c + 1, q, r)) return;
    const id = newNode(q, r, leg.index, node);
    if (nb === cap) {
      insertHeap(c + 1, id);
      const t = thresholdOf(c + 1, cap);
      if (t > floorQ[c + 1]) floorQ[c + 1] = t;
    } else {
      insertSorted(c + 1, nb, id);
    }
  };

  const root = newNode(0, 0, -1, -1);
  if (bucketOf(0) === cap) insertHeap(0, root);
  else insertSorted(0, 0, root);

  const capSorted = new Int32Array(capTopK);
  let processed = 0;
  for (const legs of matches) {
    const top = Math.min(maxLegs - 1, processed);
    for (let c = top; c >= 0; c--) {
      // Normal buckets.
      for (let b = 0; b < cap; b++) {
        const s = c * cap + b;
        const len = lens[s];
        if (len === 0) continue;
        const base = s * topK;
        const rLow = b * step;
        const rHigh = (b + 1) * step;
        for (let li = 0; li < legs.length; li++) {
          const leg = legs[li];
          // Every item of this bucket lands in one of these target buckets.
          const lo = bucketOf(rLow + leg.r);
          const hi = bucketOf(rHigh + leg.r);
          let stopBelow = Infinity;
          for (let nb = lo; nb <= hi; nb++) stopBelow = Math.min(stopBelow, thresholdOf(c + 1, nb));
          // With the most optimistic r of this bucket, the first item (sorted
          // on q) that cannot win ends the useful part of the list.
          const needOpt = Math.max(0, Math.floor((lnR - rHigh - leg.r) / step));
          const qStop = Math.max(stopBelow, aliveFrom(c + 1, needOpt, hi === cap)) - leg.q;
          for (let i = 0; i < len; i++) {
            const node = slots[base + i];
            if (nQ[node] <= qStop) break;
            tryAdd(c, node, leg);
          }
        }
      }
      // Cap bucket: already valid, may still take more legs.
      const n = heapLen[c];
      if (n === 0) continue;
      const qAny = aliveFrom(c, 0, false);
      let m = 0;
      for (let i = 0; i < n; i++) if (nQ[heaps[c][i]] > qAny) capSorted[m++] = heaps[c][i];
      if (m === 0) continue;
      const view = capSorted.subarray(0, m).sort((x, y) => nQ[y] - nQ[x]);
      for (let li = 0; li < legs.length; li++) {
        const leg = legs[li];
        const qStop = Math.max(thresholdOf(c + 1, cap), aliveFrom(c + 1, 0, true)) - leg.q;
        for (let i = 0; i < m; i++) {
          const node = view[i];
          if (nQ[node] <= qStop) break;
          tryAdd(c, node, leg);
        }
      }
    }
    processed++;
  }

  const perCount: number[][] = [];
  for (let c = 0; c <= maxLegs; c++) perCount.push(Array.from(heaps[c].subarray(0, heapLen[c])));
  return { perCount, q: nQ, legOf: nLeg, prevOf: nPrev };
}

function nodeLegs(dp: DpResult, node: number): number[] {
  const out: number[] = [];
  for (let n = node; n >= 0 && dp.legOf[n] >= 0; n = dp.prevOf[n]) out.push(dp.legOf[n]);
  return out;
}

/**
 * Find combos with 2..5 legs (configurable), at most one leg per match and a
 * return of at least Rmin, ranked on highest probability.
 */
export function findBestCombos(
  inputLegs: Leg[],
  settings: ComboSettings,
  options: OptimizerOptions = {},
): OptimizerResult {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const step = options.step ?? DEFAULT_STEP;
  const maxRounds = options.maxRounds ?? 8;
  const minLegs = Math.max(1, Math.floor(settings.minLegs));
  const maxLegs = Math.max(minLegs, Math.floor(settings.maxLegs));
  const maxResults = Math.max(0, Math.floor(settings.maxResults));
  const reuse = settings.maxLegReuse > 0 ? settings.maxLegReuse : Infinity;
  const capTopK = options.capTopK ?? Math.max(4 * topK, Number.isFinite(reuse) ? 20 * maxResults : maxResults);
  const lnR = Math.log(settings.minReturn);

  let legs = inputLegs.filter(isUsableLeg);
  if (options.paretoPrune ?? true) legs = paretoFilter(legs);

  const stats: OptimizerStats = {
    inputLegs: inputLegs.length,
    usableLegs: legs.length,
    matches: groupByMatch(legs).size,
    rounds: 0,
    candidates: 0,
  };
  if (maxResults === 0 || legs.length === 0) return { combos: [], stats };

  const picked: Combo[] = [];
  const pickedKeys = new Set<string>();
  const usage = new Map<string, number>();
  const excluded = new Set<string>(); // leg ids that reached maxLegReuse
  let roundTopK = topK;
  let roundCapTopK = capTopK;

  for (let round = 0; round < maxRounds && picked.length < maxResults; round++) {
    stats.rounds++;
    const active = legs.filter((l) => !excluded.has(l.id));
    const indexOf = new Map(active.map((leg, i) => [leg, i]));
    const matches = [...groupByMatch(active).values()].map((group) =>
      group.map((leg) => ({ index: indexOf.get(leg)!, q: Math.log(leg.fairProb), r: -Math.log(leg.effPrice) })),
    );
    if (matches.length < minLegs) break;

    const dp = runDp(matches, minLegs, maxLegs, lnR, step, roundTopK, roundCapTopK);
    const perCount = dp.perCount;
    const candidates: Combo[] = [];
    let truncated = false;
    for (let c = minLegs; c <= maxLegs; c++) {
      if (perCount[c].length >= roundCapTopK) truncated = true;
      for (const node of perCount[c]) {
        const combo = makeCombo(nodeLegs(dp, node).map((i) => active[i]));
        if (combo.ret >= settings.minReturn) candidates.push(combo);
      }
    }
    candidates.sort(compareCombos);
    stats.candidates += candidates.length;

    let newlyExhausted = false;
    for (const combo of candidates) {
      if (picked.length >= maxResults) break;
      const key = comboKey(combo.legs);
      if (pickedKeys.has(key)) continue;
      if (combo.legs.some((leg) => (usage.get(leg.id) ?? 0) >= reuse)) continue;
      picked.push(combo);
      pickedKeys.add(key);
      for (const leg of combo.legs) {
        const n = (usage.get(leg.id) ?? 0) + 1;
        usage.set(leg.id, n);
        if (n >= reuse) {
          excluded.add(leg.id);
          newlyExhausted = true;
        }
      }
    }
    if (!newlyExhausted) {
      // Every candidate was looked at. Only a truncated list can hide more.
      if (!truncated) break;
      roundTopK *= 2;
      roundCapTopK *= 4;
    }
  }

  picked.sort(compareCombos);
  return { combos: picked, stats };
}
