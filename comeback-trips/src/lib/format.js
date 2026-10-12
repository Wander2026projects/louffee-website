const euroFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const datumFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const decimaalFormatter = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });

export const formatEuro = (bedrag) => euroFormatter.format(bedrag);

export const formatDatum = (isoDatum) => datumFormatter.format(new Date(`${isoDatum}T12:00:00`));

export const formatDecimaal = (getal) => decimaalFormatter.format(getal);

export const formatProcent = (getal) => `${Math.round(getal)}%`;

export function formatMaandenGeleden(maanden) {
  if (maanden <= 0) return 'deze maand';
  if (maanden === 1) return '1 maand geleden';
  if (maanden < 12) return `${maanden} maanden geleden`;
  return `${Math.floor(maanden / 12)} jaar geleden`;
}

export function formatVliegduur(uren) {
  if (uren < 1.5) return '± 1 uur';
  return `± ${formatDecimaal(Math.round(uren * 2) / 2)} uur`;
}
