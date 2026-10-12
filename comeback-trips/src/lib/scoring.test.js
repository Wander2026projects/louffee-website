import { describe, expect, it } from 'vitest';
import data from '../data/destinations.json';
import {
  berekenPrijsdaling,
  berekenVeiligheidsscore,
  berekenWaardeScore,
  prijsVoorPeriode,
  zoekBestemmingen,
} from './scoring.js';

const JAAR = 2026;

const maak = (overrides = {}) => ({
  id: 'test',
  naam: 'Test',
  land: 'Testland',
  regio: 'Testregio',
  type: ['strand'],
  incident: { omschrijving: 'Test', jaar: 2020 },
  reisadvies: 'groen',
  adviesTrend: 'stabiel',
  laatstGecontroleerd: '2026-10-01',
  normalePrijs: 1000,
  huidigePrijs: 700,
  besteReismaanden: [6],
  vertrekVanaf: ['Schiphol'],
  reisadviesUrl: 'https://www.nederlandwereldwijd.nl/reisadvies/testland',
  ...overrides,
});

const criteria = (overrides = {}) => ({
  budget: 5000,
  luchthaven: 'Schiphol',
  maand: 6,
  dagen: 7,
  types: [],
  veiligheidsniveau: 'groen-geel',
  ...overrides,
});

describe('berekenVeiligheidsscore', () => {
  it('gebruikt de basisscore per reisadvies', () => {
    const recent = { jaar: JAAR - 1, omschrijving: '' };
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'groen', incident: recent }), JAAR)).toBe(9);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', incident: recent }), JAAR)).toBe(7);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'oranje', incident: recent }), JAAR)).toBe(3);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'rood', incident: recent }), JAAR)).toBe(1);
  });

  it('geeft +1 alleen als het incident méér dan 3 jaar geleden was', () => {
    const geel = (jaar) => maak({ reisadvies: 'geel', incident: { jaar, omschrijving: '' } });
    expect(berekenVeiligheidsscore(geel(JAAR - 3), JAAR)).toBe(7);
    expect(berekenVeiligheidsscore(geel(JAAR - 4), JAAR)).toBe(8);
  });

  it('verwerkt de trend, rondt af en begrenst tussen 1 en 10', () => {
    const recent = { jaar: JAAR, omschrijving: '' };
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', adviesTrend: 'verbeterd', incident: recent }), JAAR)).toBe(8);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'geel', adviesTrend: 'verslechterd', incident: recent }), JAAR)).toBe(6);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'groen', adviesTrend: 'verbeterd' }), JAAR)).toBe(10);
    expect(berekenVeiligheidsscore(maak({ reisadvies: 'rood', adviesTrend: 'verslechterd', incident: recent }), JAAR)).toBe(1);
  });
});

describe('prijzen en waarde', () => {
  it('berekent prijsdaling en waardeScore', () => {
    const daling = berekenPrijsdaling(maak({ normalePrijs: 1000, huidigePrijs: 700 }));
    expect(daling).toBe(30);
    expect(berekenWaardeScore(daling, 9)).toBeCloseTo(27);
  });

  it('rekent de weekprijs om naar het aantal dagen', () => {
    expect(prijsVoorPeriode(700, 7)).toBe(700);
    expect(prijsVoorPeriode(700, 14)).toBe(1120);
    expect(prijsVoorPeriode(700, 3)).toBeLessThan(700);
  });
});

describe('zoekBestemmingen', () => {
  it('toont nooit rode bestemmingen, ook niet bij "ook oranje tonen"', () => {
    const lijst = [maak({ id: 'rood', reisadvies: 'rood', huidigePrijs: 100 }), maak({ id: 'groen' })];
    const { resultaten } = zoekBestemmingen(lijst, criteria({ veiligheidsniveau: 'oranje' }), JAAR);
    expect(resultaten.map((b) => b.id)).toEqual(['groen']);
  });

  it('filtert op veiligheidsniveau, type, maand en budget', () => {
    const lijst = [
      maak({ id: 'oranje', reisadvies: 'oranje' }),
      maak({ id: 'stad', type: ['stad'] }),
      maak({ id: 'winter', besteReismaanden: [1] }),
      maak({ id: 'duur', huidigePrijs: 4000 }),
      maak({ id: 'ok' }),
    ];
    const { resultaten } = zoekBestemmingen(lijst, criteria({ types: ['strand'], budget: 1000 }), JAAR);
    expect(resultaten.map((b) => b.id)).toEqual(['ok']);
  });

  it('sorteert op waardeScore en geeft maximaal 5 resultaten', () => {
    const lijst = Array.from({ length: 8 }, (_, i) => maak({ id: `b${i}`, huidigePrijs: 900 - i * 50 }));
    const { resultaten, totaal } = zoekBestemmingen(lijst, criteria(), JAAR);
    expect(totaal).toBe(8);
    expect(resultaten).toHaveLength(5);
    expect(resultaten[0].id).toBe('b7');
    const scores = resultaten.map((b) => b.waardeScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('rekent een toeslag als de reis niet vanaf de gekozen luchthaven vertrekt', () => {
    const { resultaten } = zoekBestemmingen([maak()], criteria({ luchthaven: 'Rotterdam' }), JAAR);
    expect(resultaten[0].luchthavenToeslag).toBeGreaterThan(0);
    expect(resultaten[0].geschattePrijs).toBe(700 + resultaten[0].luchthavenToeslag);
  });

  it('geeft suggesties als er niets gevonden wordt', () => {
    const { resultaten, suggesties } = zoekBestemmingen([maak()], criteria({ budget: 100 }), JAAR);
    expect(resultaten).toHaveLength(0);
    expect(suggesties.minimaalBudget).toBe(700);
  });
});

describe('destinations.json', () => {
  const bestemmingen = data.bestemmingen;

  it('bevat ongeveer 25 complete bestemmingen', () => {
    expect(bestemmingen.length).toBeGreaterThanOrEqual(22);
    for (const b of bestemmingen) {
      expect(b.naam && b.land && b.regio).toBeTruthy();
      expect(['groen', 'geel', 'oranje', 'rood']).toContain(b.reisadvies);
      expect(['verbeterd', 'stabiel', 'verslechterd']).toContain(b.adviesTrend);
      expect(b.type.every((t) => ['strand', 'stad', 'natuur', 'cultuur'].includes(t))).toBe(true);
      expect(b.huidigePrijs).toBeLessThan(b.normalePrijs);
      expect(b.vertrekVanaf).toContain('Schiphol');
      expect(b.reisadviesUrl).toMatch(/^https:\/\/www\.nederlandwereldwijd\.nl\/reisadvies\/[a-z-]+$/);
      expect(Number.isNaN(Date.parse(b.laatstGecontroleerd))).toBe(false);
      expect(b.besteReismaanden.every((m) => m >= 1 && m <= 12)).toBe(true);
    }
  });

  it('heeft unieke id’s', () => {
    expect(new Set(bestemmingen.map((b) => b.id)).size).toBe(bestemmingen.length);
  });
});
