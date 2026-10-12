import { MAANDEN_KORT, VAKANTIETYPES } from '../lib/constants.js';
import {
  formatDatum,
  formatDecimaal,
  formatEuro,
  formatJarenGeleden,
  formatProcent,
} from '../lib/format.js';
import AdviceBadge from './AdviceBadge.jsx';
import SafetyScore from './SafetyScore.jsx';
import TrendIndicator from './TrendIndicator.jsx';
import { ExternIcoon, KalenderIcoon, WaarschuwingIcoon } from './icons.jsx';

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

export default function DestinationCard({ bestemming, positie, dagen, luchthaven }) {
  const {
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
    veiligheidsscore,
    prijsdaling,
    waardeScore,
    geschattePrijs,
    geschatteNormalePrijs,
    luchthavenToeslag,
  } = bestemming;

  const isOranje = reisadvies === 'oranje';

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
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {naam}
            </h3>
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
            <span
              key={t}
              className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              {typeLabel(t)}
            </span>
          ))}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Kenmerk titel={`Geschatte prijs · ${dagen} dagen`}>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {formatEuro(geschattePrijs)}
              <span className="ml-1 text-sm font-normal text-slate-500">p.p.</span>
            </p>
            <p className="text-sm text-slate-500">
              Normaal ca. <span className="line-through">{formatEuro(geschatteNormalePrijs)}</span>
            </p>
            {luchthavenToeslag > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                Incl. ca. {formatEuro(luchthavenToeslag)} extra: niet aangeboden vanaf {luchthaven}.
              </p>
            )}
          </Kenmerk>

          <Kenmerk titel="Trend reisadvies">
            <TrendIndicator trend={adviesTrend} />
            <p className="mt-2 text-xs text-slate-500">
              Laatst gecontroleerd: {formatDatum(laatstGecontroleerd)}
              <span className="ml-1 italic">(voorbeelddata)</span>
            </p>
          </Kenmerk>
        </dl>

        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-900">Wat er gebeurde</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{incident.omschrijving}</p>
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            In {incident.jaar} · {formatJarenGeleden(incident.jaar)}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <KalenderIcoon className="h-3.5 w-3.5" />
              Beste maanden: {besteReismaanden.map((m) => MAANDEN_KORT[m - 1]).join(', ')}
            </p>
            <p>
              Waardescore <span className="font-semibold text-slate-700">{formatDecimaal(waardeScore)}</span>
            </p>
          </div>
          <a
            href={reisadviesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-700 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 transition
              hover:bg-teal-700 hover:text-white"
          >
            Bekijk actueel reisadvies
            <ExternIcoon className="h-4 w-4" />
            <span className="sr-only">(opent in een nieuw venster)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
