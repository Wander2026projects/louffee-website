import type { ComboSettings, LegFilter } from "./combos";
import type { MarketType } from "./types";

/** Public, read-only Polymarket endpoints. No keys, no order endpoints. */
export const API = {
  gamma: "https://gamma-api.polymarket.com",
  clob: "https://clob.polymarket.com",
  site: "https://polymarket.com",
} as const;

export const SCAN = {
  windowHours: 48, // kickoff within this many hours from now
  kickoffMarginMs: 2 * 60_000, // skip games kicking off within 2 minutes
  gamesTagId: 100639, // Gamma tag "games": every head-to-head sports game
  eventsPageSize: 100, // max for /events/keyset
  booksBatchSize: 500, // max tokens per POST /books
  maxConcurrency: 4, // parallel requests per API
  maxRetries: 4, // on 429 / 5xx / network errors, with exponential backoff
  backoffMs: 500,
  requestTimeoutMs: 20_000,
  cacheSeconds: 60, // server-side cache of a full scan
  userAgent: "polymarket-combo-scanner/1.0 (read-only analysis tool)",
} as const;

/**
 * Taker fees. Polymarket charges fee = shares x rate x (p x (1 - p))^exponent,
 * paid in pUSD on top of the price (you still receive every share).
 * Sports: rate 0.05 since 10 July 2026 (was 0.03); NFL markets currently 0.03.
 * Every market carries its own feeSchedule; the default is only used when a
 * market has none, or for every market when useMarketFeeSchedule is false.
 */
export const FEES = {
  useMarketFeeSchedule: true,
  defaultRate: 0.05,
  defaultExponent: 1,
} as const;

export const ALL_MARKET_TYPES: MarketType[] = ["winner", "double_chance", "totals", "btts"];

export const MARKET_TYPE_LABELS: Record<MarketType, string> = {
  winner: "Uitslag",
  double_chance: "Dubbele kans",
  totals: "Over/Under",
  btts: "Beide teams scoren",
};

export type Settings = ComboSettings & LegFilter;

export const DEFAULT_SETTINGS: Settings = {
  sports: ["Voetbal"],
  marketTypes: ALL_MARKET_TYPES,
  minReturn: 2,
  minLegs: 2,
  maxLegs: 5,
  minLiquidity: 500,
  maxSpread: 0.04,
  maxLegProb: 0.8, // legs above 80% add little return but still cost spread and fees
  maxResults: 25,
  maxLegReuse: 3, // the same leg in at most this many combos of the list
};

export const LIMITS = {
  minReturn: { min: 1.2, max: 20, step: 0.1 },
  legs: { min: 2, max: 5 },
  minLiquidity: { min: 0, max: 50_000 },
  maxSpread: { min: 0.005, max: 0.2, step: 0.005 },
  maxLegProb: { min: 0.5, max: 1 },
  maxResults: { min: 5, max: 100 },
} as const;
