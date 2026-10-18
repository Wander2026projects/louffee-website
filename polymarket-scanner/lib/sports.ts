// Sport (Dutch name) and competition of a Polymarket game event.
// Built from GET /sports and GET /tags (see docs/data-notes.md).

/** Sport-category tag ids, highest priority first. */
const CATEGORY_TAGS: [string, string][] = [
  ["100350", "Voetbal"], // soccer
  ["28", "Basketbal"],
  ["864", "Tennis"],
  ["100088", "IJshockey"], // hockey (all leagues using it are ice hockey)
  ["900", "IJshockey"], // ice-hockey
  ["678", "Honkbal"],
  ["1186", "American football"],
  ["517", "Cricket"],
  ["64", "Esports"],
  ["102883", "Volleybal"],
  ["102897", "Handbal"],
  ["102193", "Rugby"],
  ["103767", "Tafeltennis"], // table-tennis
  ["105715", "Tafeltennis"], // setka
  ["103768", "Tafeltennis"], // ping-pong
  ["101437", "Darts"],
  ["683", "Boksen"],
  ["281", "MMA"],
  ["279", "MMA"], // ufc
  ["100219", "Golf"],
  ["102393", "Lacrosse"],
  ["102471", "Pickleball"],
  ["102142", "Wielrennen"],
  ["104450", "Wielrennen"],
  ["105847", "Snooker"],
  ["256", "Schaken"],
  ["100277", "Poker"],
  ["104814", "Rodeo"],
  ["1229", "Paardenrennen"],
  ["102166", "Motorsport"], // nascar
  ["435", "Motorsport"], // formula1
  ["100389", "Motorsport"], // f1
  ["101411", "Motorsport"], // motorsports
  ["434", "Motorsport"], // racing
  ["104362", "Vechtsport"], // combat-sports
];
const TAG_PRIORITY = new Map(CATEGORY_TAGS.map(([id, nl], i) => [id, { nl, i }]));

/** Leagues whose tags carry no sport category at all. */
const LEAGUE_SPORT: Record<string, string> = {
  nba: "Basketbal",
  wnba: "Basketbal",
  nbasl: "Basketbal",
  euroleague: "Basketbal",
  ncaab: "Basketbal",
  cbb: "Basketbal",
  nfl: "American football",
  cfb: "American football",
  mlb: "Honkbal",
  wbc: "Honkbal",
  nhl: "IJshockey",
  ufc: "MMA",
  powerslap: "Slapfighting",
  f1: "Motorsport",
  indycar: "Motorsport",
  afl: "Australian football",
  aflw: "Australian football",
  acn: "Voetbal",
  chess: "Schaken",
  poker: "Poker",
  rodeo: "Rodeo",
  boxing: "Boksen",
  darts: "Darts",
};

/** Last resort for leagues added later. Order matters (rus = soccer, rl = Rocket League). */
const LEAGUE_PREFIX: [RegExp, string][] = [
  [/^bk/, "Basketbal"],
  [/^cric/, "Cricket"],
  [/^cr[a-z0-9]{2,}/, "Cricket"],
  [/^vb/, "Volleybal"],
  [/^hb/, "Handbal"],
  [/^(tt|wtt|setka)/, "Tafeltennis"],
  [/^ru[a-z0-9]{3,}/, "Rugby"],
  [/^rl[a-z0-9]{3,}/, "Rugby"],
  [/^nascar/, "Motorsport"],
  [/^w?nba/, "Basketbal"],
  [/^(atp|wta|itf)/, "Tennis"],
];

export const UNKNOWN_SPORT = "Overig";

/** Competition names that exist in more than one country or sport. */
const AMBIGUOUS_NAMES: Record<string, string> = {
  enl: "National League (Engeland)",
  snhl: "National League (Zwitserland)",
  hun: "NB I (Hongarije)",
  hbnbi: "NB I (Hongarije)",
  nor: "Eliteserien (Noorwegen)",
  hbeliteserien: "Eliteserien (Noorwegen)",
  hbsuperliga: "Superliga (Polen)",
  rou1: "SuperLiga (Roemenië)",
  per1: "Liga 1 (Peru)",
  sea: "Serie A (Italië)",
  serc: "Serie C (Italië)",
};

export type SportInfo = { sport?: string | null; name?: string | null; tags?: string | null };

export type EventLike = {
  slug?: string;
  tags?: { id: string | number }[] | null;
  sport?: SportInfo | null;
  eventMetadata?: { league?: unknown; serie?: unknown } | null;
};

/** Dutch sport name: category tag first, then league code, then prefix rules. */
export function dutchSport(event: EventLike): string {
  const ids = new Set<string>();
  for (const t of event.tags ?? []) ids.add(String(t.id));
  for (const id of (event.sport?.tags ?? "").split(",")) if (id.trim()) ids.add(id.trim());
  let best: { nl: string; i: number } | null = null;
  for (const id of ids) {
    const hit = TAG_PRIORITY.get(id);
    if (hit && (!best || hit.i < best.i)) best = hit;
  }
  if (best) return best.nl;
  const code = event.sport?.sport ?? "";
  if (LEAGUE_SPORT[code]) return LEAGUE_SPORT[code];
  for (const [re, nl] of LEAGUE_PREFIX) if (re.test(code)) return nl;
  return UNKNOWN_SPORT;
}

/**
 * Competition shown to the user: the league name, plus the tournament from
 * the event metadata for tennis, esports, darts and cricket ("ATP Tour · European Open").
 * Companion events lack that metadata, so pass the main event.
 */
export function competitionName(event: EventLike): string {
  const code = event.sport?.sport ?? "";
  const name = AMBIGUOUS_NAMES[code] ?? (event.sport?.name ?? "").trim();
  const league = typeof event.eventMetadata?.league === "string" ? event.eventMetadata.league.trim() : "";
  const serie = typeof event.eventMetadata?.serie === "string" ? event.eventMetadata.serie.trim() : "";
  const detail = [league, serie].filter(Boolean).join(" ");
  if (!detail || detail.toLowerCase() === name.toLowerCase()) return name || code.toUpperCase();
  if (!name || name === "International") return detail;
  return `${name} · ${detail}`;
}
