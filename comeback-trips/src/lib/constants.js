export const LUCHTHAVENS = ['Schiphol', 'Eindhoven', 'Rotterdam'];

export const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
];

export const VAKANTIETYPES = [
  { id: 'strand', label: 'Strand', icoon: '🏖️' },
  { id: 'stad', label: 'Stad', icoon: '🏙️' },
  { id: 'natuur', label: 'Natuur', icoon: '🌿' },
  { id: 'cultuur', label: 'Cultuur', icoon: '🏛️' },
];

export const MIN_DAGEN = 3;
export const MAX_DAGEN = 21;

/** Keuzes voor het minimale veiligheidsniveau en de reisadviezen die daarbij horen. */
export const VEILIGHEIDSNIVEAUS = [
  {
    id: 'groen',
    label: 'Alleen groen',
    omschrijving: 'Geen bijzondere veiligheidsrisico’s',
    toegestaan: ['groen'],
  },
  {
    id: 'groen-geel',
    label: 'Groen en geel',
    omschrijving: 'Ook bestemmingen met “let op, veiligheidsrisico’s”',
    toegestaan: ['groen', 'geel'],
  },
  {
    id: 'oranje',
    label: 'Ook oranje tonen',
    omschrijving: 'Inclusief “alleen noodzakelijke reizen” – met waarschuwing',
    toegestaan: ['groen', 'geel', 'oranje'],
  },
];

export const STANDAARD_VEILIGHEIDSNIVEAU = 'groen-geel';

/** Officiële betekenis van de kleurcodes van het Ministerie van Buitenlandse Zaken. */
export const REISADVIES_INFO = {
  groen: { label: 'Groen', betekenis: 'Geen bijzondere veiligheidsrisico’s', basisScore: 9 },
  geel: { label: 'Geel', betekenis: 'Let op, veiligheidsrisico’s', basisScore: 7 },
  oranje: { label: 'Oranje', betekenis: 'Alleen noodzakelijke reizen', basisScore: 3 },
  rood: { label: 'Rood', betekenis: 'Niet reizen', basisScore: 1 },
};

export const TREND_INFO = {
  verbeterd: { label: 'Verbeterd', bonus: 0.5 },
  stabiel: { label: 'Stabiel', bonus: 0 },
  verslechterd: { label: 'Verslechterd', bonus: -1 },
};

/** Een incident telt als "lang geleden" als het meer dan zoveel jaar terug is. */
export const JAREN_VOOR_BONUS = 3;

/**
 * Prijzen in de data gelden voor 7 dagen. Bij omrekenen naar een andere reisduur
 * blijft dit deel (globaal de vlucht) gelijk en schaalt de rest (verblijf) per dag mee.
 */
export const VAST_PRIJSAANDEEL = 0.4;

/** Geschatte meerkosten als de reis niet vanaf de gekozen luchthaven wordt aangeboden. */
export const LUCHTHAVEN_TOESLAG = 80;

export const AANTAL_RESULTATEN = 5;

export const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
