import { useState } from 'react';
import {
  INCIDENTSOORTEN,
  LUCHTHAVENS,
  MAANDEN,
  MAX_DAGEN,
  MIN_DAGEN,
  RECENTHEID,
  VAKANTIETYPES,
  VEILIGHEIDSNIVEAUS,
} from '../lib/constants.js';
import { WaarschuwingIcoon, ZoekIcoon } from './icons.jsx';

const NIVEAU_KLEUREN = {
  groen: ['bg-emerald-500'],
  'groen-geel': ['bg-emerald-500', 'bg-yellow-400'],
  oranje: ['bg-emerald-500', 'bg-yellow-400', 'bg-orange-500'],
};

function Veld({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Groep({ legend, hint, fout, children }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="mt-1.5">{children}</div>
      {fout && <p className="mt-1.5 text-xs font-medium text-rose-600">{fout}</p>}
      {hint && !fout && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </fieldset>
  );
}

/** Aanvink-knop in chipvorm, gebruikt voor luchthavens, vakantietypes en soorten incidenten. */
function Keuzechip({ checked, onChange, children }) {
  return (
    <label className="relative">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className="flex h-full cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition
          hover:border-stone-400 peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-900
          peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600"
      >
        {children}
      </span>
    </label>
  );
}

const invoerStijl =
  'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-900 shadow-xs ' +
  'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

const NL_LUCHTHAVENS = LUCHTHAVENS.filter((l) => !l.buitenland);
const BUITENLANDSE_LUCHTHAVENS = LUCHTHAVENS.filter((l) => l.buitenland);

export default function SearchForm({ waarden, fouten, onChange, onSubmit }) {
  const [toonBuitenland, setToonBuitenland] = useState(() =>
    BUITENLANDSE_LUCHTHAVENS.some((l) => waarden.luchthavens.includes(l.id)),
  );

  const zet = (veld) => (waarde) => onChange({ ...waarden, [veld]: waarde });

  const wissel = (veld, id) => {
    const lijst = waarden[veld].includes(id)
      ? waarden[veld].filter((x) => x !== id)
      : [...waarden[veld], id];
    onChange({ ...waarden, [veld]: lijst });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
      aria-label="Zoek een comeback-bestemming"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Jouw reiswensen</h2>
        <p className="mt-1 text-sm text-slate-500">Vul in en wij zoeken de beste deals.</p>
      </div>

      <Veld label="Budget per persoon" htmlFor="budget" hint="Voor vlucht en verblijf samen.">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
            €
          </span>
          <input
            id="budget"
            type="number"
            inputMode="numeric"
            min="0"
            step="50"
            value={waarden.budget}
            onChange={(e) => zet('budget')(e.target.value)}
            aria-invalid={Boolean(fouten.budget)}
            aria-describedby={fouten.budget ? 'budget-fout' : undefined}
            className={`${invoerStijl} pl-8 ${fouten.budget ? 'border-rose-400' : ''}`}
            placeholder="1000"
          />
        </div>
        {fouten.budget && (
          <p id="budget-fout" className="mt-1.5 text-xs font-medium text-rose-600">
            {fouten.budget}
          </p>
        )}
      </Veld>

      <Groep
        legend="Vertrekken vanaf"
        hint="We kiezen per bestemming automatisch de goedkoopste vlucht."
        fout={fouten.luchthavens}
      >
        <div className="grid grid-cols-3 gap-2">
          {NL_LUCHTHAVENS.map(({ id, label }) => (
            <Keuzechip key={id} checked={waarden.luchthavens.includes(id)} onChange={() => wissel('luchthavens', id)}>
              <span className="w-full text-center">{label}</span>
            </Keuzechip>
          ))}
        </div>

        {toonBuitenland ? (
          <div className="mt-3 rounded-lg bg-stone-50 p-3 ring-1 ring-inset ring-stone-200">
            <p className="text-xs font-medium text-slate-600">Over de grens, vaak goedkoper</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BUITENLANDSE_LUCHTHAVENS.map(({ id, label }) => (
                <Keuzechip
                  key={id}
                  checked={waarden.luchthavens.includes(id)}
                  onChange={() => wissel('luchthavens', id)}
                >
                  <span className="w-full text-center">{label}</span>
                </Keuzechip>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Reken zelf de reiskosten naar het vliegveld mee.</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setToonBuitenland(true);
              onChange({
                ...waarden,
                luchthavens: [...new Set([...waarden.luchthavens, ...BUITENLANDSE_LUCHTHAVENS.map((l) => l.id)])],
              });
            }}
            className="mt-2 text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            + Ook Weeze, Düsseldorf en Charleroi vergelijken
          </button>
        )}
      </Groep>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <Veld label="Reismaand" htmlFor="maand">
          <select
            id="maand"
            value={waarden.maand}
            onChange={(e) => zet('maand')(Number(e.target.value))}
            className={`${invoerStijl} capitalize`}
          >
            {MAANDEN.map((maand, index) => (
              <option key={maand} value={index + 1} className="capitalize">
                {maand}
              </option>
            ))}
          </select>
        </Veld>

        <Veld label="Aantal dagen" htmlFor="dagen">
          <div className="flex items-center gap-3">
            <input
              id="dagen"
              type="range"
              min={MIN_DAGEN}
              max={MAX_DAGEN}
              value={waarden.dagen}
              onChange={(e) => zet('dagen')(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-teal-700"
              aria-valuetext={`${waarden.dagen} dagen`}
            />
            <output
              htmlFor="dagen"
              className="w-16 shrink-0 rounded-md bg-stone-100 py-1 text-center text-sm font-semibold tabular-nums text-slate-800"
            >
              {waarden.dagen} d
            </output>
          </div>
        </Veld>
      </div>

      <Groep legend="Type vakantie" hint="Niets geselecteerd? Dan zoeken we in alle types.">
        <div className="grid grid-cols-2 gap-2">
          {VAKANTIETYPES.map(({ id, label, icoon }) => (
            <Keuzechip key={id} checked={waarden.types.includes(id)} onChange={() => wissel('types', id)}>
              <span aria-hidden="true">{icoon}</span>
              {label}
            </Keuzechip>
          ))}
        </div>
      </Groep>

      <Groep legend="Wat er gebeurde" hint="Niets geselecteerd? Dan tonen we alle soorten incidenten.">
        <div className="grid grid-cols-2 gap-2">
          {INCIDENTSOORTEN.map(({ id, label }) => (
            <Keuzechip key={id} checked={waarden.soorten.includes(id)} onChange={() => wissel('soorten', id)}>
              {label}
            </Keuzechip>
          ))}
        </div>
      </Groep>

      <Veld
        label="Wanneer gebeurde het?"
        htmlFor="recentheid"
        hint="Vlak na een incident zijn de prijzen vaak het laagst."
      >
        <select
          id="recentheid"
          value={waarden.recentheid}
          onChange={(e) => zet('recentheid')(e.target.value)}
          className={invoerStijl}
        >
          {RECENTHEID.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Veld>

      <Groep legend="Minimaal veiligheidsniveau">
        <div className="space-y-2">
          {VEILIGHEIDSNIVEAUS.map((niveau) => (
            <label key={niveau.id} className="relative block">
              <input
                type="radio"
                name="veiligheidsniveau"
                value={niveau.id}
                checked={waarden.veiligheidsniveau === niveau.id}
                onChange={() => zet('veiligheidsniveau')(niveau.id)}
                className="peer sr-only"
              />
              <span
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-300 px-3 py-2.5 transition
                  hover:border-stone-400 peer-checked:border-teal-600 peer-checked:bg-teal-50/60
                  peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600"
              >
                <span className="mt-1 flex shrink-0 -space-x-1" aria-hidden="true">
                  {NIVEAU_KLEUREN[niveau.id].map((kleur) => (
                    <span key={kleur} className={`h-3 w-3 rounded-full ring-2 ring-white ${kleur}`} />
                  ))}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    {niveau.label}
                    {niveau.id === 'groen-geel' && (
                      <span className="ml-1.5 text-xs font-normal text-slate-500">(standaard)</span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-500">{niveau.omschrijving}</span>
                </span>
              </span>
            </label>
          ))}
        </div>

        {waarden.veiligheidsniveau === 'oranje' && (
          <div
            role="alert"
            className="mt-3 flex gap-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900"
          >
            <WaarschuwingIcoon className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <p>
              <strong className="font-semibold">Code oranje betekent: alleen noodzakelijke reizen.</strong>{' '}
              Een vakantie valt daar meestal niet onder. Veel reisverzekeringen keren dan niet uit.
              Rode bestemmingen tonen we nooit.
            </p>
          </div>
        )}
      </Groep>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition
          hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      >
        <ZoekIcoon className="h-4 w-4" />
        Zoek bestemmingen
      </button>
    </form>
  );
}
