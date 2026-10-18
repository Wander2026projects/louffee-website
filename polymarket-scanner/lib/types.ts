export type MarketType = "winner" | "double_chance" | "totals" | "btts";

export const MARKET_TYPES: MarketType[] = ["winner", "double_chance", "totals", "btts"];

export type Leg = {
  id: string; // tokenId
  matchId: string; // one id per game; max 1 leg per match in a combo
  sport: string; // "Voetbal", "Basketbal", ...
  competition: string;
  matchTitle: string; // "Ajax – PSV"
  kickoff: string; // ISO time
  marketType: MarketType;
  pickLabel: string; // Dutch, e.g. "Over 2,5 goals"
  fairProb: number; // normalized midpoint probability
  askPrice: number; // best ask of exactly the token you would buy
  effPrice: number; // askPrice including taker fee
  spread: number; // ask - bid
  liquidity: number; // USD
  url: string; // link to the Polymarket event
};

export type ScanStats = {
  scannedAt: string; // ISO time
  matches: number;
  markets: number;
  legs: number;
  skippedMarkets: number;
};

export type ScanResponse = {
  ok: true;
  stats: ScanStats;
  legs: Leg[];
};

export type ScanErrorResponse = {
  ok: false;
  error: string;
};
