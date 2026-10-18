import { describe, expect, it } from "vitest";
import { baseSlug, classifyMatch, formatLine, groupMatches, matchTitleOf, type GammaEvent } from "@/lib/markets";
import { buildLegs, isUpcoming } from "@/lib/polymarket";
import type { Book } from "@/lib/pricing";
import { competitionName, dutchSport } from "@/lib/sports";
import events from "./fixtures/events.json";

// Real Gamma events (trimmed), saved on 18 Oct 2026.
const EVENTS = events as unknown as GammaEvent[];
const SITE = "https://polymarket.com";

const matches = groupMatches(EVENTS);
const bySlug = (slug: string) => matches.find((m) => m.main.slug === slug)!;
const labels = (slug: string) => classifyMatch(bySlug(slug), SITE).candidates.map((c) => `${c.marketType}: ${c.pickLabel}`);

describe("wedstrijden groeperen", () => {
  it("hoofd-event en -more-markets zijn één wedstrijd", () => {
    expect(matches).toHaveLength(6);
    const epl = bySlug("epl-tot-cov-2026-10-19");
    expect(epl.events.map((e) => e.slug).sort()).toEqual([
      "epl-tot-cov-2026-10-19",
      "epl-tot-cov-2026-10-19-more-markets",
    ]);
    expect(epl.id).toBe(epl.main.id);
  });

  it("baseSlug haalt het achtervoegsel van companion-events weg, maar geen cijfers", () => {
    expect(baseSlug("epl-tot-cov-2026-10-19-more-markets")).toBe("epl-tot-cov-2026-10-19");
    expect(baseSlug("modus-self-sampson-2026-10-19-75699690")).toBe("modus-self-sampson-2026-10-19-75699690");
  });

  it("groepeert ook zonder gameId (ITF) op slug", () => {
    const ev = (slug: string, gameId: number | null): GammaEvent => ({ id: slug, slug, gameId, markets: [] });
    const m = groupMatches([ev("itf-a-b-2026-10-18", null), ev("itf-a-b-2026-10-18-more-markets", null), ev("x-2026", 7), ev("y-2026", 7)]);
    expect(m.map((x) => x.events.length).sort()).toEqual([2, 2]);
  });

  it("voegt een dubbel aangeboden wedstrijd (thuis/uit omgedraaid) samen", () => {
    const ev = (slug: string, gameId: number, a: number, b: number): GammaEvent => ({
      id: slug,
      slug,
      gameId,
      startTime: "2026-10-19T17:15:00Z",
      teams: [{ id: a }, { id: b }],
      markets: [],
    });
    const m = groupMatches([ev("bkisrsl-mac4-hap6-2026-10-19", 1, 10, 20), ev("bkisrsl-hap6-mac4-2026-10-19", 2, 20, 10)]);
    expect(m).toHaveLength(1);
  });
});

describe("voetbal (3-weg)", () => {
  const { info, candidates, skipped } = classifyMatch(bySlug("epl-tot-cov-2026-10-19"), SITE);

  it("wedstrijdgegevens", () => {
    expect(info).toEqual({
      matchId: "1140915",
      sport: "Voetbal",
      competition: "Premier League",
      matchTitle: "Tottenham Hotspur FC – Coventry City FC",
      kickoff: "2026-10-19T19:00:00Z",
      url: "https://polymarket.com/event/epl-tot-cov-2026-10-19",
    });
  });

  it("uitslag, dubbele kans, over/under op elke lijn en beide teams scoren", () => {
    const l = labels("epl-tot-cov-2026-10-19");
    expect(l).toContain("winner: Tottenham Hotspur FC wint (90 min)");
    expect(l).toContain("winner: Gelijkspel (90 min)");
    expect(l).toContain("winner: Coventry City FC wint (90 min)");
    expect(l).toContain("double_chance: Tottenham Hotspur FC wint níet (gelijk of Coventry City FC) (90 min)");
    expect(l).toContain("double_chance: Geen gelijkspel (Tottenham Hotspur FC of Coventry City FC wint) (90 min)");
    expect(l).toContain("double_chance: Coventry City FC wint níet (gelijk of Tottenham Hotspur FC) (90 min)");
    expect(l).toContain("totals: Over 2,5 goals");
    expect(l).toContain("totals: Under 8,5 goals");
    expect(l).toContain("btts: Beide teams scoren: ja");
    expect(l).toContain("btts: Beide teams scoren: nee");
    expect(candidates.filter((c) => c.marketType === "totals")).toHaveLength(18);
    expect(candidates).toHaveLength(6 + 18 + 2);
  });

  it("slaat handicaps, helften en teamtotalen over", () => {
    const reasons = new Set(skipped.map((s) => s.reason));
    expect(reasons).toContain("type:spreads");
    expect(reasons).toContain("type:first_half_totals");
    expect(reasons).toContain("type:soccer_team_totals");
    expect(reasons).toContain("type:both_teams_to_score_first_half");
  });

  it("dubbele kans is het Nee-token van dezelfde markt, normalisatie over de drie Ja-tokens", () => {
    const home = candidates.filter((c) => c.market.groupItemThreshold === "0");
    expect(home.map((c) => c.marketType)).toEqual(["winner", "double_chance"]);
    expect(home[0].groupTokens).toEqual(home[1].groupTokens);
    expect(home[0].groupTokens).toHaveLength(3);
    expect(home[1].complement).toBe(true);
    expect(home[1].tokenId).not.toBe(home[0].tokenId);
  });
});

describe("andere sporten (2-weg)", () => {
  it("tennis: winnaar en games/sets, competitie met toernooi", () => {
    const m = bySlug("atp-struff-giron-2026-10-19");
    const { info } = classifyMatch(m, SITE);
    expect(info.sport).toBe("Tennis");
    expect(info.competition).toBe("ATP Tour · European Open");
    expect(info.matchTitle).toBe("Jan-Lennard Struff – Marcos Giron");
    const l = labels("atp-struff-giron-2026-10-19");
    expect(l).toContain("winner: Jan-Lennard Struff wint");
    expect(l).toContain("totals: Over 21,5 games");
    expect(l).toContain("totals: Under 2,5 sets");
    expect(l.some((x) => x.startsWith("double_chance"))).toBe(false);
  });

  it("ijshockey, esports en American football", () => {
    expect(classifyMatch(bySlug("nhl-cbj-min-2026-10-18"), SITE).info.sport).toBe("IJshockey");
    expect(labels("nhl-cbj-min-2026-10-18")).toContain("totals: Over 4,5 goals");
    const cs2 = classifyMatch(bySlug("cs2-big5-priv-2026-10-19"), SITE).info;
    expect(cs2).toMatchObject({ sport: "Esports", competition: "CS2 · 1win Private Club #2", matchTitle: "BIG – PRIVATE (BO3)" });
    expect(labels("cs2-big5-priv-2026-10-19")).toContain("totals: Over 2,5 maps");
    expect(classifyMatch(bySlug("nfl-dal-gb-2026-10-19"), SITE).info.sport).toBe("American football");
    expect(labels("nfl-dal-gb-2026-10-19")).toContain("totals: Over 45,5 punten");
  });

  it("ITF zonder gameId", () => {
    const { info } = classifyMatch(bySlug("itf-cook1-ito2-2026-10-18"), SITE);
    expect(info).toMatchObject({ sport: "Tennis", competition: "ITF · M25 Tamworth", matchTitle: "Ethan Cook – Kuma Ito" });
  });
});

describe("sport en competitie", () => {
  it("sport via categorie-tag, anders via competitiecode", () => {
    expect(dutchSport({ tags: [{ id: "1" }, { id: "100350" }] })).toBe("Voetbal");
    expect(dutchSport({ tags: [{ id: "1" }, { id: "450" }], sport: { sport: "nfl", tags: "1,450,100639" } })).toBe(
      "American football",
    );
    expect(dutchSport({ sport: { sport: "bkxyz", tags: "1" } })).toBe("Basketbal");
    expect(dutchSport({ sport: { sport: "rus", tags: "1,100350" } })).toBe("Voetbal");
    expect(dutchSport({ sport: { sport: "zzz", tags: "1" } })).toBe("Overig");
  });

  it("dubbelzinnige competitienamen krijgen een land", () => {
    expect(competitionName({ sport: { sport: "sea", name: "Serie A" } })).toBe("Serie A (Italië)");
  });

  it("titels en getallen", () => {
    expect(matchTitleOf({ id: "1", slug: "x", title: "Ajax vs. PSV" })).toBe("Ajax – PSV");
    expect(formatLine(2.5)).toBe("2,5");
    expect(formatLine(224.5)).toBe("224,5");
  });
});

describe("legs uit orderboeken", () => {
  const book = (bid: number, ask: number, size = 100): Book => ({
    bids: [{ price: bid, size }],
    asks: [{ price: ask, size }],
  });
  // A Yes book and its mirrored No book.
  const pair = (bid: number, ask: number): [Book, Book] => [book(bid, ask), book(1 - ask, 1 - bid)];

  it("eerlijke kans, prijs met fee, spread en liquiditeit", () => {
    const c = classifyMatch(bySlug("epl-tot-cov-2026-10-19"), SITE);
    const books = new Map<string, Book>();
    const quotes: Record<string, [number, number]> = { "0": [0.64, 0.65], "1": [0.2, 0.21], "2": [0.15, 0.16] };
    for (const x of c.candidates) {
      if (x.marketType === "winner" || x.marketType === "double_chance") {
        const [bid, ask] = quotes[x.market.groupItemThreshold!];
        const [yes, no] = pair(bid, ask);
        books.set(x.tokenId, x.complement ? no : yes);
      } else if (x.groupIndex === 0) {
        const [yes, no] = pair(0.6, 0.61);
        books.set(x.groupTokens[0], yes);
        books.set(x.groupTokens[1], no);
      }
    }
    const legs = buildLegs([c], books);
    const get = (label: string) => legs.find((l) => l.pickLabel === label)!;

    const sum = 0.645 + 0.205 + 0.155;
    const home = get("Tottenham Hotspur FC wint (90 min)");
    expect(home.fairProb).toBeCloseTo(0.645 / sum, 6);
    expect(home.askPrice).toBe(0.65);
    expect(home.effPrice).toBeCloseTo(0.65 + 0.05 * 0.65 * 0.35, 6);
    expect(home.spread).toBeCloseTo(0.01, 12);
    expect(home.liquidity).toBeGreaterThan(1000);
    expect(home.matchId).toBe("1140915");

    const notHome = get("Tottenham Hotspur FC wint níet (gelijk of Coventry City FC) (90 min)");
    expect(notHome.fairProb).toBeCloseTo(1 - 0.645 / sum, 6);
    expect(notHome.askPrice).toBeCloseTo(0.36, 12); // own No book: 1 - 0.64
    expect(get("Over 2,5 goals").fairProb).toBeCloseTo(0.605, 6);
    expect(new Set(legs.map((l) => l.matchId)).size).toBe(1);
  });

  it("gebruikt het fee-tarief van de markt (NFL 0,03)", () => {
    const c = classifyMatch(bySlug("nfl-dal-gb-2026-10-19"), SITE);
    const ml = c.candidates.filter((x) => x.marketType === "winner");
    const [a, b] = pair(0.39, 0.4);
    const books = new Map([
      [ml[0].tokenId, a],
      [ml[1].tokenId, b],
    ]);
    const legs = buildLegs([{ ...c, candidates: ml }], books);
    expect(legs).toHaveLength(2);
    expect(legs[0].effPrice).toBeCloseTo(0.4 + 0.03 * 0.4 * 0.6, 6);
  });

  it("geen orderboek of een lege kant: geen leg", () => {
    const c = classifyMatch(bySlug("atp-struff-giron-2026-10-19"), SITE);
    const ml = c.candidates.filter((x) => x.marketType === "winner");
    const books = new Map<string, Book>([
      [ml[0].tokenId, { bids: [], asks: [{ price: 0.5, size: 10 }] }],
      [ml[1].tokenId, book(0.5, 0.52)],
    ]);
    expect(buildLegs([{ ...c, candidates: ml }], books)).toEqual([]);
  });

  it("alleen wedstrijden die nog moeten beginnen, binnen 48 uur", () => {
    const now = new Date("2026-10-18T21:00:00Z");
    const until = new Date("2026-10-20T21:00:00Z");
    const ev = (startTime: string, extra: Partial<GammaEvent> = {}): GammaEvent => ({ id: "1", slug: "x", startTime, ...extra });
    expect(isUpcoming(ev("2026-10-19T19:00:00Z"), now, until)).toBe(true);
    expect(isUpcoming(ev("2026-10-18T20:59:00Z"), now, until)).toBe(false);
    expect(isUpcoming(ev("2026-10-18T21:01:00Z"), now, until)).toBe(false); // within the 2-minute margin
    expect(isUpcoming(ev("2026-10-21T19:00:00Z"), now, until)).toBe(false);
    expect(isUpcoming(ev("2026-10-19T19:00:00Z", { live: true }), now, until)).toBe(false);
    expect(isUpcoming(ev("2026-10-19T19:00:00Z", { closed: true }), now, until)).toBe(false);
  });
});
