// Dutch number and time formatting for the UI.

const TZ = "Europe/Amsterdam";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: min, maximumFractionDigits: max });

const n0 = nf(0, 0);
const n1 = nf(1, 1);
const n2 = nf(2, 2);
const n3 = nf(3, 3);

/** 0.4821 -> "48,2%" */
export function pct(p: number): string {
  return `${n1.format(p * 100)}%`;
}

/** 2.0534 -> "2,05×" */
export function times(x: number): string {
  return `${n2.format(x)}×`;
}

/** 0.9612 -> "€0,96" */
export function euro(x: number): string {
  return `€${n2.format(x)}`;
}

/** 12345.6 -> "$12.346" */
export function usd(x: number): string {
  return `$${n0.format(x)}`;
}

/** 0.661375 -> "0,661" (price per share, 0..1) */
export function price(x: number): string {
  return n3.format(x);
}

/** 0.015 -> "1,5¢" */
export function cents(x: number): string {
  return `${nf(0, 1).format(x * 100)}¢`;
}

/** Plain Dutch number: 1204 -> "1.204" */
export function count(x: number): string {
  return n0.format(x);
}

/** Number with up to `digits` decimals: 2.5 -> "2,5" */
export function num(x: number, digits = 1): string {
  return nf(0, digits).format(x);
}

const timeFmt = new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const kickoffFmt = new Intl.DateTimeFormat("nl-NL", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "22:41" in Amsterdam time */
export function clock(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "ma 19 okt 21:00" in Amsterdam time */
export function kickoff(iso: string): string {
  return kickoffFmt.format(new Date(iso)).replace(/,/g, "").replace(/\./g, "");
}
