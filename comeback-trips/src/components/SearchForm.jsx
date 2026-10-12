import {
  LUCHTHAVENS,
  MAANDEN,
  MAX_DAGEN,
  MIN_DAGEN,
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

function Groep({ legend, hint, children }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </fieldset>
  );
}

const invoerStijl =
  'block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-900 shadow-xs ' +
  'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function SearchForm({ waarden, fouten, onChange, onSubmit }) {
  const zet = (veld) => (waarde) => onChange({ ...waarden, [veld]: waarde });

  const wisselType = (type) => {
    const types = waarden.types.includes(type)
      ? waarden.types.filter((t) => t !== type)
      : [...waarden.types, type];
    onChange({ ...waarden, types });
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

      <Veld label="Budget per persoon" htmlFor="budget" hint="Voor vlucht en hotel samen.">
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

      <Groep legend="Vertrekluchthaven">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
          {LUCHTHAVENS.map((luchthaven) => (
            <label key={luchthaven} className="relative">
              <input
                type="radio"
                name="luchthaven"
                value={luchthaven}
                checked={waarden.luchthaven === luchthaven}
                onChange={() => zet('luchthaven')(luchthaven)}
                className="peer sr-only"
              />
              <span
                className="block cursor-pointer rounded-md px-2 py-2 text-center text-sm font-medium text-slate-600 transition
                  hover:text-slate-900 peer-checked:bg-white peer-checked:text-teal-800 peer-checked:shadow-sm
                  peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600"
              >
                {luchthaven}
              </span>
            </label>
          ))}
        </div>
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
            <label key={id} className="relative">
              <input
                type="checkbox"
                checked={waarden.types.includes(id)}
                onChange={() => wisselType(id)}
                className="peer sr-only"
              />
              <span
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition
                  hover:border-stone-400 peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-900
                  peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600"
              >
                <span aria-hidden="true">{icoon}</span>
                {label}
              </span>
            </label>
          ))}
        </div>
      </Groep>

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
