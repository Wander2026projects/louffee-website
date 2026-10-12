import {
  JAREN_VOOR_BONUS,
  LUCHTHAVEN_TOESLAG,
  RECENT_MAANDEN,
  RECENTHEID,
  REISADVIES_INFO,
  TREND_INFO,
  VEILIGHEIDSNIVEAUS,
} from './constants.js';

/** Aantal hele maanden tussen het incident en vandaag. Zonder maand rekenen we met juni. */
export function maandenGeleden(incident, vandaag = new Date()) {
  const maand = incident.maand ?? 6;
  return (vandaag.getFullYear() - incident.jaar) * 12 + (vandaag.getMonth() + 1 - maand);
}

/**
 * Veiligheidsscore van 1 tot 10:
 * basis op reisadvies, +1 als het incident meer dan 3 jaar geleden was,
 * +0,5 bij een verbeterde trend en -1 bij een verslechterde trend.
 */
export function berekenVeiligheidsscore(bestemming, vandaag = new Date()) {
  const basis = REISADVIES_INFO[bestemming.reisadvies]?.basisScore ?? 1;
  const incidentBonus = maandenGeleden(bestemming.incident, vandaag) > JAREN_VOOR_BONUS * 12 ? 1 : 0;
  const trendBonus = TREND_INFO[bestemming.adviesTrend]?.bonus ?? 0;

  const score = Math.round(basis + incidentBonus + trendBonus);
  return Math.min(10, Math.max(1, score));
}

/** Prijsdaling in procenten ten opzichte van de normale prijs. */
export function berekenPrijsdaling(bestemming) {
  const { normalePrijs, huidigePrijs } = bestemming;
  if (!normalePrijs) return 0;
  return ((normalePrijs - huidigePrijs) / normalePrijs) * 100;
}

export function berekenWaardeScore(prijsdaling, veiligheidsscore) {
  return prijsdaling * (veiligheidsscore / 10);
}

const rondAf = (bedrag) => Math.round(bedrag / 5) * 5;

/**
 * Kiest de goedkoopste vlucht vanaf een van de gekozen luchthavens.
 * Vliegt geen van die luchthavens erheen, dan rekenen we met de goedkoopste
 * luchthaven die het wél aanbiedt plus een toeslag voor de extra reis.
 */
export function kiesVlucht(bestemming, luchthavens) {
  const aanbod = Object.entries(bestemming.vluchtPrijzen ?? {}).sort(([, a], [, b]) => a - b);
  const passend = aanbod.find(([luchthaven]) => luchthavens.includes(luchthaven));
  const [luchthaven, prijs] = passend ?? aanbod[0];

  return {
    luchthaven,
    prijs,
    toeslag: passend ? 0 : LUCHTHAVEN_TOESLAG,
    vanafGekozenLuchthaven: Boolean(passend),
  };
}

/** Hotel/verblijf voor 7 dagen: de weekprijs min de vlucht vanaf Schiphol waarop die is gebaseerd. */
export function verblijfPerWeek(bestemming) {
  return bestemming.huidigePrijs - bestemming.vluchtPrijzen.Schiphol;
}

/** Totaalprijs: vlucht (vast) plus verblijf naar rato van het aantal dagen, afgerond op € 5. */
export function prijsVoorPeriode(bestemming, vlucht, dagen) {
  return rondAf(vlucht.prijs + vlucht.toeslag + verblijfPerWeek(bestemming) * (dagen / 7));
}

/** Verrijkt een bestemming met alle berekende waarden voor de gekozen reis. */
export function verrijkBestemming(bestemming, { dagen, luchthavens }, vandaag = new Date()) {
  const veiligheidsscore = berekenVeiligheidsscore(bestemming, vandaag);
  const prijsdaling = berekenPrijsdaling(bestemming);
  const vlucht = kiesVlucht(bestemming, luchthavens);
  const geschattePrijs = prijsVoorPeriode(bestemming, vlucht, dagen);
  const maanden = maandenGeleden(bestemming.incident, vandaag);
  const schipholPrijs = bestemming.vluchtPrijzen.Schiphol;

  return {
    ...bestemming,
    veiligheidsscore,
    prijsdaling,
    waardeScore: berekenWaardeScore(prijsdaling, veiligheidsscore),
    vlucht,
    besparingTovSchiphol: vlucht.luchthaven !== 'Schiphol' ? schipholPrijs - vlucht.prijs : 0,
    geschattePrijs,
    geschatteNormalePrijs: rondAf((geschattePrijs * bestemming.normalePrijs) / bestemming.huidigePrijs),
    maandenGeleden: maanden,
    isRecent: maanden < RECENT_MAANDEN,
  };
}

export function toegestaneAdviezen(veiligheidsniveau) {
  const niveau = VEILIGHEIDSNIVEAUS.find((n) => n.id === veiligheidsniveau);
  // Rood staat nooit in een toegestane lijst, dus rode bestemmingen worden nooit getoond.
  return (niveau?.toegestaan ?? ['groen']).filter((advies) => advies !== 'rood');
}

const maxMaanden = (recentheid) => RECENTHEID.find((r) => r.id === recentheid)?.maxMaanden ?? null;

const filters = {
  veiligheid: (b, c) => toegestaneAdviezen(c.veiligheidsniveau).includes(b.reisadvies),
  type: (b, c) => c.types.length === 0 || b.type.some((type) => c.types.includes(type)),
  soort: (b, c) => c.soorten.length === 0 || c.soorten.includes(b.incident.soort),
  recentheid: (b, c) => maxMaanden(c.recentheid) === null || b.maandenGeleden < maxMaanden(c.recentheid),
  maand: (b, c) => b.besteReismaanden.includes(c.maand),
  budget: (b, c) => b.geschattePrijs <= c.budget,
};

function pasFiltersToe(verrijkt, criteria, overslaan = []) {
  return verrijkt.filter((b) =>
    Object.entries(filters).every(([naam, filter]) => overslaan.includes(naam) || filter(b, criteria)),
  );
}

const SORTERINGEN = {
  waarde: (a, b) => b.waardeScore - a.waardeScore,
  prijs: (a, b) => a.geschattePrijs - b.geschattePrijs || b.waardeScore - a.waardeScore,
  vlucht: (a, b) => a.vlucht.prijs + a.vlucht.toeslag - (b.vlucht.prijs + b.vlucht.toeslag) || a.geschattePrijs - b.geschattePrijs,
  recent: (a, b) => a.maandenGeleden - b.maandenGeleden || b.waardeScore - a.waardeScore,
};

export function sorteer(bestemmingen, volgorde = 'waarde') {
  return [...bestemmingen].sort(SORTERINGEN[volgorde] ?? SORTERINGEN.waarde);
}

/**
 * Zoekt alle passende bestemmingen (rood nooit), gesorteerd op waardeScore,
 * plus tips voor als er niets gevonden wordt.
 */
export function zoekBestemmingen(bestemmingen, criteria, vandaag = new Date()) {
  const verrijkt = bestemmingen
    .filter((b) => b.reisadvies !== 'rood')
    .map((b) => verrijkBestemming(b, criteria, vandaag));

  const passend = sorteer(pasFiltersToe(verrijkt, criteria), 'waarde');

  return {
    passend,
    totaal: passend.length,
    suggesties: passend.length === 0 ? maakSuggesties(verrijkt, criteria) : null,
  };
}

/** Kijkt welke aanpassing aan de zoekopdracht wél resultaten zou opleveren. */
function maakSuggesties(verrijkt, criteria) {
  const zonder = (filter) => pasFiltersToe(verrijkt, criteria, [filter]);
  const zonderBudget = zonder('budget');

  return {
    minimaalBudget: zonderBudget.length ? Math.min(...zonderBudget.map((b) => b.geschattePrijs)) : null,
    andereMaanden: [...new Set(zonder('maand').flatMap((b) => b.besteReismaanden))].sort((a, b) => a - b),
    aantalZonderType: criteria.types.length > 0 ? zonder('type').length : 0,
    aantalZonderSoort: criteria.soorten.length > 0 ? zonder('soort').length : 0,
    aantalZonderRecentheid: maxMaanden(criteria.recentheid) !== null ? zonder('recentheid').length : 0,
  };
}
