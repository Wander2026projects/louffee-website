import {
  AANTAL_RESULTATEN,
  JAREN_VOOR_BONUS,
  LUCHTHAVEN_TOESLAG,
  REISADVIES_INFO,
  TREND_INFO,
  VAST_PRIJSAANDEEL,
  VEILIGHEIDSNIVEAUS,
} from './constants.js';

/**
 * Veiligheidsscore van 1 tot 10:
 * basis op reisadvies, +1 als het incident meer dan 3 jaar geleden was,
 * +0,5 bij een verbeterde trend en -1 bij een verslechterde trend.
 */
export function berekenVeiligheidsscore(bestemming, huidigJaar = new Date().getFullYear()) {
  const basis = REISADVIES_INFO[bestemming.reisadvies]?.basisScore ?? 1;
  const jarenGeleden = huidigJaar - bestemming.incident.jaar;
  const incidentBonus = jarenGeleden > JAREN_VOOR_BONUS ? 1 : 0;
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

/** Rekent een weekprijs (7 dagen) om naar het gekozen aantal dagen, afgerond op € 5. */
export function prijsVoorPeriode(weekprijs, dagen) {
  const factor = VAST_PRIJSAANDEEL + (1 - VAST_PRIJSAANDEEL) * (dagen / 7);
  return Math.round((weekprijs * factor) / 5) * 5;
}

export function vertrektVanaf(bestemming, luchthaven) {
  return bestemming.vertrekVanaf?.includes(luchthaven) ?? false;
}

/** Verrijkt een bestemming met alle berekende waarden voor de gekozen reis. */
export function verrijkBestemming(bestemming, { dagen, luchthaven }, huidigJaar) {
  const veiligheidsscore = berekenVeiligheidsscore(bestemming, huidigJaar);
  const prijsdaling = berekenPrijsdaling(bestemming);
  const toeslag = vertrektVanaf(bestemming, luchthaven) ? 0 : LUCHTHAVEN_TOESLAG;

  return {
    ...bestemming,
    veiligheidsscore,
    prijsdaling,
    waardeScore: berekenWaardeScore(prijsdaling, veiligheidsscore),
    luchthavenToeslag: toeslag,
    geschattePrijs: prijsVoorPeriode(bestemming.huidigePrijs, dagen) + toeslag,
    geschatteNormalePrijs: prijsVoorPeriode(bestemming.normalePrijs, dagen) + toeslag,
  };
}

export function toegestaneAdviezen(veiligheidsniveau) {
  const niveau = VEILIGHEIDSNIVEAUS.find((n) => n.id === veiligheidsniveau);
  // Rood staat nooit in een toegestane lijst, dus rode bestemmingen worden nooit getoond.
  return (niveau?.toegestaan ?? ['groen']).filter((advies) => advies !== 'rood');
}

const filters = {
  veiligheid: (b, criteria) => toegestaneAdviezen(criteria.veiligheidsniveau).includes(b.reisadvies),
  type: (b, criteria) =>
    criteria.types.length === 0 || b.type.some((type) => criteria.types.includes(type)),
  maand: (b, criteria) => b.besteReismaanden.includes(criteria.maand),
  budget: (b, criteria) => b.geschattePrijs <= criteria.budget,
};

function pasFiltersToe(verrijkt, criteria, overslaan = []) {
  return verrijkt.filter((b) =>
    Object.entries(filters).every(([naam, filter]) => overslaan.includes(naam) || filter(b, criteria)),
  );
}

const sorteerOpWaarde = (a, b) => b.waardeScore - a.waardeScore;

/**
 * Zoekt de beste bestemmingen voor de opgegeven criteria.
 * Geeft de top 5 terug, plus het totaal aantal passende bestemmingen en
 * tips voor als er (bijna) niets gevonden wordt.
 */
export function zoekBestemmingen(bestemmingen, criteria, huidigJaar = new Date().getFullYear()) {
  const verrijkt = bestemmingen
    .filter((b) => b.reisadvies !== 'rood')
    .map((b) => verrijkBestemming(b, criteria, huidigJaar));

  const passend = pasFiltersToe(verrijkt, criteria).sort(sorteerOpWaarde);

  return {
    resultaten: passend.slice(0, AANTAL_RESULTATEN),
    totaal: passend.length,
    suggesties: passend.length === 0 ? maakSuggesties(verrijkt, criteria) : null,
  };
}

/** Kijkt welke aanpassing aan de zoekopdracht wél resultaten zou opleveren. */
function maakSuggesties(verrijkt, criteria) {
  const zonderBudget = pasFiltersToe(verrijkt, criteria, ['budget']);
  const zonderMaand = pasFiltersToe(verrijkt, criteria, ['maand']);
  const zonderType = pasFiltersToe(verrijkt, criteria, ['type']);

  return {
    minimaalBudget: zonderBudget.length
      ? Math.min(...zonderBudget.map((b) => b.geschattePrijs))
      : null,
    andereMaanden: [...new Set(zonderMaand.flatMap((b) => b.besteReismaanden))].sort((a, b) => a - b),
    aantalZonderType: criteria.types.length > 0 ? zonderType.length : 0,
  };
}
