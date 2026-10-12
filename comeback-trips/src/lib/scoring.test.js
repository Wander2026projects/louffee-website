import { describe, expect, it } from 'vitest';
import data from '../data/destinations.json';
import { INCIDENTSOORTEN, LUCHTHAVENS } from './constants.js';
import {
  berekenPrijsdaling,
  berekenVeiligheidsscore,
  berekenWaardeScore,
  kiesVlucht,
  maandenGeleden,
  sorteer,
  verblijfPerWeek,
  zoekBestemmingen,
} from './scoring.js';

const VANDAAG = new Date('2026-10-12T12:00:00');

const maak = (overrides = {}) => ({
  id: 'test',
  naam: 'Test',
  land: 'Testland',
  regio: 'Testregio',
  type: ['strand'],
  incident: { omschrijving: 'Test', soort: 'aanslag', jaar: 2020, maand: 1 },
  reisadvies: 'groen',
  adviesTrend: 'stabiel',
  laatstGecontroleerd: '2026-10-01',
  normalePrijs: 1000,
  huidigePrijs: 700,
  vluchtPrijzen: { Schiphol: 280 },
  besteReismaanden: [6],
  vliegveld: 'TST',
  vliegduurUren: 3,
  reisadviesUrl: 'https://www.nederlandwereldwijd.nl/reisadvies/testland',
  ...overrides,
});

const incident = (jaar, maand) => ({ omschrijving: '', soort: 'aanslag', jaar, maand });

const criteria = (overrides = {}) => ({
  budget: 5000,
  luchthavens: ['Schiphol', 'Eindhoven', 'Rotterdam'],
  maand: 6,
  dagen: 7,
  types: [],
  soorten: [],
  recentheid: 'alle',
  veiligheidsniveau: 'groen-geel',
  ...overrides,
});

const ids = (lijst) => lijst.map((b) => b.id);

describe('berekenVeiligheidsscore', () => {
  it('gebruikt de basisscore per reisadvies', () => {
    const recent = incident(2026, 1);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'groen', incident: recent }), VANDAAG)).toBe(9);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', incident: recent }), VANDAAG)).toBe(7);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'oranje', incident: recent }), VANDAAG)).toBe(3);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'rood', incident: recent }), VANDAAG)).toBe(1);
  });

  it('geeft +1 alleen als het incident méér dan 3 jaar geleden was', () => {
    const geel = (jaar, maand) => maak({ reisadvies: 'geel', incident: incident(jaar, maand) });
    expect(berekenVeiligheidsscore(geel(2023, 10), VANDAAG)).toBe(7); // precies 36 maanden
    expect(berekenVeiligheidsscore(geel(2023, 9), VANDAAG)).toBe(8); // 37 maanden
  });

  it('verwerkt de trend, rondt af en begrenst tussen 1 en 10', () => {
    const recent = incident(2026, 6);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', adviesTrend: 'verbeterd', incident: recent }), VANDAAG)).toBe(8);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', adviesTrend: 'verslechterd', incident: recent }), VANDAAG)).toBe(6);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'groen', adviesTrend: 'verbeterd' }), VANDAAG)).toBe(10);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'rood', adviesTrend: 'verslechterd', incident: recent }), VANDAAG)).toBe(1);
  });
});

describe('prijzen en vluchten', () => {
  it('berekent prijsdaling en waardeScore', () => {
    const daling = berekenPrijsdaling(maak({ normalePrijs: 1000, huidigePrijs: 700 }));
    expect(daling).toBe(30);
    expect(berekenWaardeScore(daling, 9)).toBeCloseTo(27);
  });

  it('kiest de goedkoopste vlucht vanaf de gekozen luchthavens', () => {
    const b = maak({ vluchtPrijzen: { Schiphol: 280, Eindhoven: 200, Weeze: 150 } });
    expect(kiesVlucht(b, ['Schiphol', 'Eindhoven'])).toMatchObject({ luchthaven: 'Eindhoven', prijs: 200, toeslag: 0 });
    expect(kiesVlucht(b, ['Schiphol', 'Eindhoven', 'Weeze'])).toMatchObject({ luchthaven: 'Weeze', prijs: 150 });
  });

  it('rekent een toeslag als geen gekozen luchthaven erheen vliegt', () => {
    const vlucht = kiesVlucht(maak(), ['Rotterdam']);
    expect(vlucht).toMatchObject({ luchthaven: 'Schiphol', vanafGekozenLuchthaven: false });
    expect(vlucht.toeslag).toBeGreaterThan(0);
  });

  it('rekent het verblijf naar rato van het aantal dagen, de vlucht niet', () => {
    const b = maak({ huidigePrijs: 700, vluchtPrijzen: { Schiphol: 280 } }); // verblijf 420 per week
    expect(verblijfPerWeek(b)).toBe(420);
    const prijs = (dagen) => zoekBestemmingen([b], criteria({ dagen }), VANDAAG).passend[0].geschattePrijs;
    expect(prijs(7)).toBe(700);
    expect(prijs(14)).toBe(280 + 840);
    expect(prijs(3)).toBe(280 + 180);
  });
});

describe('zoekBestemmingen', () => {
  it('toont nooit rode bestemmingen, ook niet bij "ook oranje tonen"', () => {
    const lijst = [maak({ id: 'rood', reisadvies: 'rood', huidigePrijs: 300 }), maak({ id: 'groen' })];
    const { passend } = zoekBestemmingen(lijst, criteria({ veiligheidsniveau: 'oranje' }), VANDAAG);
    expect(ids(passend)).toEqual(['groen']);
  });

  it('filtert op veiligheidsniveau, type, maand en budget', () => {
    const lijst = [
      maak({ id: 'oranje', reisadvies: 'oranje' }),
      maak({ id: 'stad', type: ['stad'] }),
      maak({ id: 'winter', besteReismaanden: [1] }),
      maak({ id: 'duur', huidigePrijs: 4000 }),
      maak({ id: 'ok' }),
    ];
    const { passend } = zoekBestemmingen(lijst, criteria({ types: ['strand'], budget: 1000 }), VANDAAG);
    expect(ids(passend)).toEqual(['ok']);
  });

  it('filtert op soort incident en op hoe recent het was', () => {
    const lijst = [
      maak({ id: 'aanslag-recent', incident: incident(2026, 4) }),
      maak({ id: 'aanslag-oud', incident: incident(2016, 7) }),
      maak({ id: 'ramp-recent', incident: { ...incident(2026, 1), soort: 'natuurramp' } }),
    ];
    const zoek = (c) => ids(zoekBestemmingen(lijst, criteria(c), VANDAAG).passend).sort();
    expect(zoek({ soorten: ['aanslag'] })).toEqual(['aanslag-oud', 'aanslag-recent']);
    expect(zoek({ recentheid: '12' })).toEqual(['aanslag-recent', 'ramp-recent']);
    expect(zoek({ soorten: ['aanslag'], recentheid: '12' })).toEqual(['aanslag-recent']);
  });

  it('sorteert standaard op waardeScore en kan op andere volgordes sorteren', () => {
    const lijst = [
      maak({ id: 'grote-korting', huidigePrijs: 500, vluchtPrijzen: { Schiphol: 300 } }),
      maak({ id: 'goedkope-vlucht', huidigePrijs: 900, vluchtPrijzen: { Schiphol: 60 } }),
      maak({ id: 'recent', huidigePrijs: 800, incident: incident(2026, 9) }),
    ];
    const { passend } = zoekBestemmingen(lijst, criteria(), VANDAAG);
    expect(passend[0].id).toBe('grote-korting');
    expect(sorteer(passend, 'vlucht')[0].id).toBe('goedkope-vlucht');
    expect(sorteer(passend, 'recent')[0].id).toBe('recent');
    expect(sorteer(passend, 'prijs')[0].id).toBe('grote-korting');
  });

  it('geeft suggesties als er niets gevonden wordt', () => {
    const { passend, suggesties } = zoekBestemmingen([maak()], criteria({ budget: 100, recentheid: '12' }), VANDAAG);
    expect(passend).toHaveLength(0);
    expect(suggesties.aantalZonderRecentheid).toBe(0);
    const zonderRecent = zoekBestemmingen([maak()], criteria({ budget: 100 }), VANDAAG).suggesties;
    expect(zonderRecent.minimaalBudget).toBe(700);
  });
});

describe('maandenGeleden', () => {
  it('telt hele maanden', () => {
    expect(maandenGeleden(incident(2026, 4), VANDAAG)).toBe(6);
    expect(maandenGeleden(incident(2025, 10), VANDAAG)).toBe(12);
  });
});

describe('destinations.json', () => {
  const bestemmingen = data.bestemmingen;
  const luchthavenIds = LUCHTHAVENS.map((l) => l.id);
  const soorten = INCIDENTSOORTEN.map((s) => s.id);

  it('bevat complete en geldige bestemmingen', () => {
    expect(bestemmingen.length).toBeGreaterThanOrEqual(25);
    for (const b of bestemmingen) {
      expect(b.naam && b.land && b.regio, b.id).toBeTruthy();
      expect(['groen', 'geel', 'oranje', 'rood']).toContain(b.reisadvies);
      expect(['verbeterd', 'stabiel', 'verslechterd']).toContain(b.adviesTrend);
      expect(b.type.every((t) => ['strand', 'stad', 'natuur', 'cultuur'].includes(t)), b.id).toBe(true);
      expect(soorten, b.id).toContain(b.incident.soort);
      expect(b.incident.maand).toBeGreaterThanOrEqual(1);
      expect(b.incident.maand).toBeLessThanOrEqual(12);
      expect(maandenGeleden(b.incident, VANDAAG), `${b.id} ligt in de toekomst`).toBeGreaterThanOrEqual(0);
      expect(b.huidigePrijs, b.id).toBeLessThan(b.normalePrijs);
      expect(Object.keys(b.vluchtPrijzen).every((l) => luchthavenIds.includes(l)), b.id).toBe(true);
      expect(b.vluchtPrijzen.Schiphol, `${b.id} mist Schiphol`).toBeGreaterThan(0);
      expect(verblijfPerWeek(b), `${b.id}: vlucht duurder dan weekprijs`).toBeGreaterThan(0);
      expect(b.vliegveld).toMatch(/^[A-Z]{3}$/);
      expect(b.vliegduurUren).toBeGreaterThan(0);
      expect(b.reisadviesUrl).toMatch(/^https:\/\/www\.nederlandwereldwijd\.nl\/reisadvies\/[a-z-]+$/);
      expect(Number.isNaN(Date.parse(b.laatstGecontroleerd))).toBe(false);
      expect(b.besteReismaanden.every((m) => m >= 1 && m <= 12)).toBe(true);
    }
  });

  it('heeft unieke id’s', () => {
    expect(new Set(bestemmingen.map((b) => b.id)).size).toBe(bestemmingen.length);
  });

  it('bevat aanslagen uit het afgelopen jaar', () => {
    const recenteAanslagen = bestemmingen.filter(
      (b) => b.incident.soort === 'aanslag' && maandenGeleden(b.incident, VANDAAG) <= 12,
    );
    expect(recenteAanslagen.length).toBeGreaterThanOrEqual(5);
  });
});
