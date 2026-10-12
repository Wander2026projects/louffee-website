import { INCIDENTSOORTEN, LUCHTHAVENS, MAANDEN, MAANDEN_KORT, VAKANTIETYPES } from '../lib/constants.js';
import {
  formatDatum,
  formatDecimaal,
  formatEuro,
  formatMaandenGeleden,
  formatProcent,
  formatVliegduur,
} from '../lib/format.js';
import { googleFlightsUrl, luchthavenCode, skyscannerUrl } from '../lib/links.js';
import AdviceBadge from './AdviceBadge.jsx';
import SafetyScore from './SafetyScore.jsx';
import TrendIndicator from './TrendIndicator.jsx';
import { ExternIcoon, HartIcoon, InfoIcoon, KalenderIcoon, VliegtuigIcoon, WaarschuwingIcoon } from './icons.jsx';

function OranjeWaarschuwing() {
  return (
    <div role="note" className="flex gap-3 border-b border-orange-300 bg-orange-100 px-5 py-4 text-orange-950 sm:px-6">
      <WaarschuwingIcoon className="mt-0.5 h-6 w-6 shrink-0 text-orange-600" />
      <div className="text-sm">
        <p className="font-semibold">Code oranje: je reisverzekering keert vaak niet uit</p>
        <p className="mt-1 text-orange-900">
          Voor deze regio geldt ‘alleen noodzakelijke reizen’. Een vakantie valt daar meestal niet
          onder, waardoor veel reis- en annuleringsverzekeringen geen dekking geven voor
          bijvoorbeeld medische kosten of repatriëring. Check je polis vóór je boekt.
        </p>
      </div>
    </div>
  );
}

function Kenmerk({ titel, children }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-inset ring-stone-200/70">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{titel}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

const typeLabel = (id) => VAKANTIETYPES.find((t) => t.id === id)?.label ?? id;
const soortLabel = (id) => INCIDENTSOORTEN.find((s) => s.id === id)?.label ?? id;
const luchthavenLabel = (id) => LUCHTHAVENS.find((l) => l.id === id)?.label ?? id;

/** Alle vluchtprijzen naast elkaar, zodat je ziet waar het goedkoopst is. */
function Luchthavenprijzen({ vluchtPrijzen, gekozen, luchthavens }) {
  const prijzen = Object.entries(vluchtPrijzen).sort(([, a], [, b]) => a - b);

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Retourprijs per luchthaven">
      {prijzen.map(([luchthaven, prijs]) => {
        const isGekozen = luchthaven === gekozen;
        const isGeselecteerd = luchthavens.includes(luchthaven);
        return (
          <li
            key={luchthaven}
            className={`rounded-md px-2 py-1 text-xs tabular-nums ${
              isGekozen
                ? 'bg-teal-700 font-semibold text-white'
                : isGeselecteerd
                  ? 'bg-white text-slate-700 ring-1 ring-inset ring-stone-300'
                  : 'border border-dashed border-stone-300 bg-white text-slate-400'
            }`}
            title={isGeselecteerd ? undefined : 'Deze luchthaven heb je niet geselecteerd'}
          >
            {luchthavenLabel(luchthaven)} {formatEuro(prijs)}
          </li>
        );
      })}
    </ul>
  );
}

export default function DestinationCard({ bestemming, positie, criteria, isBewaard, onWisselBewaard }) {
  const {
    id,
    naam,
    land,
    regio,
    type,
    incident,
    reisadvies,
    adviesTrend,
    laatstGecontroleerd,
    besteReismaanden,
    reisadviesUrl,
    vluchtPrijzen,
    vliegveld,
    vliegduurUren,
    veiligheidsscore,
    prijsdaling,
    waardeScore,
    geschattePrijs,
    geschatteNormalePrijs,
    vlucht,
    besparingTovSchiphol,
    maandenGeleden,
    isRecent,
  } = bestemming;

  const isOranje = reisadvies === 'oranje';
  const vluchtTotaal = vlucht.prijs + vlucht.toeslag;
  const verblijf = geschattePrijs - vluchtTotaal;

  // Is er een niet-geselecteerde luchthaven die nóg goedkoper is? Dan geven we een tip.
  const [goedkoopsteLuchthaven, goedkoopstePrijs] = Object.entries(vluchtPrijzen).sort(([, a], [, b]) => a - b)[0];
  const goedkoperElders =
    goedkoopsteLuchthaven !== vlucht.luchthaven && goedkoopstePrijs < vluchtTotaal
      ? { luchthaven: goedkoopsteLuchthaven, verschil: vluchtTotaal - goedkoopstePrijs }
      : null;

  const vanCode = luchthavenCode(vlucht.luchthaven);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isOranje ? 'border-orange-300 ring-1 ring-orange-200' : 'border-stone-200'
      }`}
    >
      {isOranje && <OranjeWaarschuwing />}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              #{positie} · {land}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{naam}</h3>
            <p className="text-sm text-slate-500">
              {regio}, {land}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-teal-700">
              −{formatProcent(prijsdaling)}
            </p>
            <p className="text-xs text-slate-500">t.o.v. normale prijs</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AdviceBadge advies={reisadvies} />
          <SafetyScore score={veiligheidsscore} />
          {type.map((t) => (
            <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {typeLabel(t)}
            </span>
          ))}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Kenmerk titel={`Geschatte prijs · ${criteria.dagen} dagen`}>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {formatEuro(geschattePrijs)}
              <span className="ml-1 text-sm font-normal text-slate-500">p.p.</span>
            </p>
            <p className="text-sm text-slate-500">
              Normaal ca. <span className="line-through">{formatEuro(geschatteNormalePrijs)}</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              Vlucht {formatEuro(vluchtTotaal)} + verblijf {formatEuro(verblijf)}
            </p>
          </Kenmerk>

          <Kenmerk titel="Goedkoopste vlucht">
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">{formatEuro(vlucht.prijs)}</span>
              <span className="text-sm text-slate-500">retour</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <VliegtuigIcoon className="h-4 w-4 text-slate-400" />
              {luchthavenLabel(vlucht.luchthaven)} → {vliegveld} · {formatVliegduur(vliegduurUren)}
            </p>
            {vlucht.vanafGekozenLuchthaven ? (
              besparingTovSchiphol > 0 && (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  {formatEuro(besparingTovSchiphol)} goedkoper dan vanaf Schiphol
                </p>
              )
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Niet vanaf jouw luchthavens. Incl. ca. {formatEuro(vlucht.toeslag)} voor de reis naar{' '}
                {luchthavenLabel(vlucht.luchthaven)}.
              </p>
            )}
            <Luchthavenprijzen
              vluchtPrijzen={vluchtPrijzen}
              gekozen={vlucht.luchthaven}
              luchthavens={criteria.luchthavens}
            />
            {goedkoperElders && (
              <p className="mt-2 text-xs text-teal-800">
                💡 Vanaf {luchthavenLabel(goedkoperElders.luchthaven)} is de vlucht{' '}
                {formatEuro(goedkoperElders.verschil)} goedkoper.
              </p>
            )}
          </Kenmerk>
        </dl>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">Wat er gebeurde</h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {soortLabel(incident.soort)}
            </span>
            {isRecent && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                Recent
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{incident.omschrijving}</p>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            <span className="capitalize">{MAANDEN[incident.maand - 1]}</span> {incident.jaar} ·{' '}
            {formatMaandenGeleden(maandenGeleden)}
          </p>

          {isRecent && (
            <div className="mt-3 flex gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              <InfoIcoon className="h-4 w-4 shrink-0 text-slate-500" />
              <p>
                Dit gebeurde kort geleden. Houd het reisadvies in de gaten, volg het lokale nieuws en
                meld je reis aan bij de Informeerservice van Buitenlandse Zaken.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Trend reisadvies</span>
            <TrendIndicator trend={adviesTrend} />
            <span className="text-xs text-slate-500">
              Laatst gecontroleerd: {formatDatum(laatstGecontroleerd)} <span className="italic">(voorbeelddata)</span>
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-stone-200 pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <KalenderIcoon className="h-3.5 w-3.5" />
              Beste maanden: {besteReismaanden.map((m) => MAANDEN_KORT[m - 1]).join(', ')}
            </p>
            <p>
              Waardescore <span className="font-semibold text-slate-700">{formatDecimaal(waardeScore)}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => onWisselBewaard(id)}
              aria-pressed={isBewaard}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                isBewaard
                  ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-50'
              }`}
            >
              <HartIcoon className={`h-4 w-4 ${isBewaard ? 'fill-rose-500 text-rose-500' : ''}`} />
              {isBewaard ? 'Bewaard' : 'Bewaar'}
            </button>
            <a
              href={googleFlightsUrl(vanCode, vliegveld, criteria.maand)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Zoek vluchten
              <ExternIcoon className="h-4 w-4" />
              <span className="sr-only">(Google Flights, opent in een nieuw venster)</span>
            </a>
            <a
              href={reisadviesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
            >
              Bekijk actueel reisadvies
              <ExternIcoon className="h-4 w-4" />
              <span className="sr-only">(opent in een nieuw venster)</span>
            </a>
            <a
              href={skyscannerUrl(vanCode, vliegveld)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-xs font-medium text-teal-700 hover:underline sm:ml-auto"
            >
              Goedkoopste maand op Skyscanner
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
