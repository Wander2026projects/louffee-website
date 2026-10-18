// Pure price and probability helpers.
import { FEES } from "./config";

export type BookLevel = { price: number; size: number };

export type Book = {
  bids: BookLevel[];
  asks: BookLevel[];
};

export type FeeSchedule = { rate: number; exponent: number };

export type Quote = {
  bid: number | null; // best bid
  ask: number | null; // best ask: what one share costs
  askSize: number; // shares at the best ask
};

/** Best bid = highest bid, best ask = lowest ask, whatever order the API sends. */
export function bestQuote(book: Book): Quote {
  let bid: number | null = null;
  for (const l of book.bids) if (l.size > 0 && (bid === null || l.price > bid)) bid = l.price;
  let ask: number | null = null;
  let askSize = 0;
  for (const l of book.asks) {
    if (l.size <= 0) continue;
    if (ask === null || l.price < ask) {
      ask = l.price;
      askSize = l.size;
    } else if (l.price === ask) {
      askSize += l.size;
    }
  }
  return { bid, ask, askSize };
}

/** Midpoint of bid and ask; null when one side is missing. */
export function midpoint(q: Pick<Quote, "bid" | "ask">): number | null {
  return q.bid === null || q.ask === null ? null : (q.bid + q.ask) / 2;
}

/**
 * Scale mutually exclusive outcomes so they add up to 1
 * (home/draw/away of one match, or over/under of one line).
 * Returns null when the input cannot be normalised.
 */
export function normalize(values: number[]): number[] | null {
  if (values.length === 0 || values.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum > 0 ? values.map((v) => v / sum) : null;
}

/** Taker fee per share bought at price p: rate x (p x (1 - p))^exponent. */
export function takerFeePerShare(price: number, schedule: FeeSchedule): number {
  if (!(schedule.rate > 0) || price <= 0 || price >= 1) return 0;
  return schedule.rate * Math.pow(price * (1 - price), schedule.exponent);
}

/** What one share really costs: the ask plus the taker fee on top. */
export function effectivePrice(ask: number, schedule: FeeSchedule): number {
  return ask + takerFeePerShare(ask, schedule);
}

/**
 * Fee schedule of a market as Gamma reports it. Markets without fees enabled
 * pay nothing; markets without a schedule fall back to the default in config.
 */
export function feeScheduleFor(market: {
  feesEnabled?: boolean | null;
  feeSchedule?: { rate?: number | string | null; exponent?: number | string | null } | null;
}): FeeSchedule {
  const fallback = { rate: FEES.defaultRate, exponent: FEES.defaultExponent };
  if (!FEES.useMarketFeeSchedule) return fallback;
  if (market.feesEnabled === false) return { rate: 0, exponent: 1 };
  const rate = Number(market.feeSchedule?.rate);
  const exponent = Number(market.feeSchedule?.exponent);
  if (!market.feeSchedule || !Number.isFinite(rate)) return fallback;
  return { rate, exponent: Number.isFinite(exponent) ? exponent : FEES.defaultExponent };
}

/** USD you can buy at most `withinCents` above the best ask. */
export function askDepthUsd(book: Book, withinCents = 0.02): number {
  const { ask } = bestQuote(book);
  if (ask === null) return 0;
  let usd = 0;
  for (const l of book.asks) if (l.price <= ask + withinCents + 1e-9) usd += l.price * l.size;
  return usd;
}
