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

export function formatJarenGeleden(jaar, huidigJaar = new Date().getFullYear()) {
  const verschil = huidigJaar - jaar;
  if (verschil <= 0) return 'dit jaar';
  if (verschil === 1) return 'vorig jaar';
  return `${verschil} jaar geleden`;
}
