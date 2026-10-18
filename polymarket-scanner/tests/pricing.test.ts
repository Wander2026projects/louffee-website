import { describe, expect, it } from "vitest";
import {
  askDepthUsd,
  bestQuote,
  effectivePrice,
  feeScheduleFor,
  midpoint,
  normalize,
  takerFeePerShare,
} from "@/lib/pricing";

describe("orderboek", () => {
  // Real shape of a CLOB book: bids ascending, asks descending (best last).
  const book = {
    bids: [
      { price: 0.01, size: 1000 },
      { price: 0.63, size: 200 },
      { price: 0.64, size: 150 },
    ],
    asks: [
      { price: 0.99, size: 1000 },
      { price: 0.66, size: 300 },
      { price: 0.65, size: 70 },
    ],
  };

  it("beste bid is de hoogste, beste ask de laagste", () => {
    expect(bestQuote(book)).toEqual({ bid: 0.64, ask: 0.65, askSize: 70 });
  });

  it("lege kant geeft null", () => {
    expect(bestQuote({ bids: [], asks: [] })).toEqual({ bid: null, ask: null, askSize: 0 });
    expect(midpoint({ bid: null, ask: 0.5 })).toBeNull();
  });

  it("midpoint = (bid + ask) / 2", () => {
    expect(midpoint({ bid: 0.64, ask: 0.65 })).toBeCloseTo(0.645, 12);
  });

  it("diepte: USD aan asks tot 2 cent boven de beste ask", () => {
    expect(askDepthUsd(book)).toBeCloseTo(0.65 * 70 + 0.66 * 300, 9);
  });
});

describe("normalisatie", () => {
  it("thuis/gelijk/uit tellen op tot 1", () => {
    const [home, draw, away] = normalize([0.645, 0.205, 0.155])!;
    expect(home + draw + away).toBeCloseTo(1, 12);
    expect(home).toBeCloseTo(0.645 / 1.005, 12);
    expect(draw).toBeCloseTo(0.205 / 1.005, 12);
  });

  it("over/under op dezelfde lijn tellen op tot 1", () => {
    const [over, under] = normalize([0.605, 0.395])!;
    expect(over).toBeCloseTo(0.605, 12);
    expect(under).toBeCloseTo(0.395, 12);
  });

  it("ongeldige invoer geeft null", () => {
    expect(normalize([])).toBeNull();
    expect(normalize([0, 0])).toBeNull();
    expect(normalize([0.5, Number.NaN])).toBeNull();
  });
});

describe("fees", () => {
  const sports = { rate: 0.05, exponent: 1 };

  it("fee per share = rate x p x (1 - p)", () => {
    expect(takerFeePerShare(0.5, sports)).toBeCloseTo(0.0125, 12);
    expect(takerFeePerShare(0.3, sports)).toBeCloseTo(takerFeePerShare(0.7, sports), 12);
  });

  it("komt overeen met de fee-tabel van Polymarket (100 shares, sport)", () => {
    // docs.polymarket.com/trading/fees: $0.50 -> $1.25, $0.10 -> $0.45, $0.80 -> $0.80
    expect(100 * takerFeePerShare(0.5, sports)).toBeCloseTo(1.25, 9);
    expect(100 * takerFeePerShare(0.1, sports)).toBeCloseTo(0.45, 9);
    expect(100 * takerFeePerShare(0.8, sports)).toBeCloseTo(0.8, 9);
  });

  it("klopt met een echte transactie: 33 shares a 0,36 kostte 12,26016 pUSD", () => {
    expect(33 * effectivePrice(0.36, sports)).toBeCloseTo(12.26016, 9);
  });

  it("effectieve prijs = ask + fee", () => {
    expect(effectivePrice(0.65, sports)).toBeCloseTo(0.661375, 12);
    expect(effectivePrice(0.65, { rate: 0, exponent: 1 })).toBe(0.65);
  });

  it("exponent werkt op p x (1 - p)", () => {
    expect(takerFeePerShare(0.5, { rate: 0.02, exponent: 2 })).toBeCloseTo(0.02 * 0.0625, 12);
  });

  it("fee-schema per markt, met terugval op config", () => {
    expect(feeScheduleFor({ feesEnabled: true, feeSchedule: { rate: 0.03, exponent: 1 } })).toEqual({
      rate: 0.03,
      exponent: 1,
    });
    expect(feeScheduleFor({ feesEnabled: false, feeSchedule: { rate: 0.05, exponent: 1 } }).rate).toBe(0);
    expect(feeScheduleFor({ feesEnabled: true, feeSchedule: null })).toEqual({ rate: 0.05, exponent: 1 });
  });
});
