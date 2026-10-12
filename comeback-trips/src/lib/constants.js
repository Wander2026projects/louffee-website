/** Vertrekluchthavens. Die over de grens zijn vaak goedkoper voor wie in het zuiden of oosten woont. */
export const LUCHTHAVENS = [
  { id: 'Schiphol', code: 'AMS', label: 'Schiphol', buitenland: false },
  { id: 'Eindhoven', code: 'EIN', label: 'Eindhoven', buitenland: false },
  { id: 'Rotterdam', code: 'RTM', label: 'Rotterdam', buitenland: false },
  { id: 'Weeze', code: 'NRN', label: 'Weeze', buitenland: true },
  { id: 'Düsseldorf', code: 'DUS', label: 'Düsseldorf', buitenland: true },
  { id: 'Brussel-Charleroi', code: 'CRL', label: 'Charleroi', buitenland: true },
];

export const STANDAARD_LUCHTHAVENS = LUCHTHAVENS.filter((l) => !l.buitenland).map((l) => l.id);

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

export const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const VAKANTIETYPES = [
  { id: 'strand', label: 'Strand', icoon: '🏖️' },
  { id: 'stad', label: 'Stad', icoon: '🏙️' },
  { id: 'natuur', label: 'Natuur', icoon: '🌿' },
  { id: 'cultuur', label: 'Cultuur', icoon: '🏛️' },
];

export const INCIDENTSOORTEN = [
  { id: 'aanslag', label: 'Aanslag of geweld' },
  { id: 'onrust', label: 'Onrust' },
  { id: 'conflict', label: 'Oorlog of conflict' },
  { id: 'natuurramp', label: 'Natuurramp' },
];

/** Keuzes voor hoe lang geleden het incident mag zijn (in maanden; null = maakt niet uit). */
export const RECENTHEID = [
  { id: 'alle', label: 'Maakt niet uit', maxMaanden: null },
  { id: '12', label: 'In de laatste 12 maanden', maxMaanden: 12 },
  { id: '24', label: 'In de laatste 2 jaar', maxMaanden: 24 },
];

/** Een incident van minder dan zoveel maanden geleden krijgt het label "recent". */
export const RECENT_MAANDEN = 12;

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
 * Geschatte meerkosten als een reis vanaf geen van de gekozen luchthavens wordt aangeboden
 * (reis naar een andere luchthaven of een extra overstap).
 */
export const LUCHTHAVEN_TOESLAG = 80;

export const SORTEEROPTIES = [
  { id: 'waarde', label: 'Beste waarde' },
  { id: 'prijs', label: 'Laagste totaalprijs' },
  { id: 'vlucht', label: 'Goedkoopste vlucht' },
  { id: 'recent', label: 'Meest recente incident' },
];

export const AANTAL_RESULTATEN = 5;
