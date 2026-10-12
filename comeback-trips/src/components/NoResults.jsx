import { MAANDEN } from '../lib/constants.js';
import { formatEuro } from '../lib/format.js';
import { KompasIcoon } from './icons.jsx';

function TipKnop({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-teal-600 bg-white px-3 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-700 hover:text-white"
    >
      {children}
    </button>
  );
}

export default function NoResults({ criteria, suggesties, onPasAan }) {
  const {
    minimaalBudget,
    andereMaanden = [],
    aantalZonderType = 0,
    aantalZonderSoort = 0,
    aantalZonderRecentheid = 0,
  } = suggesties ?? {};
  const aantal = (n) => `${n} ${n === 1 ? 'bestemming' : 'bestemmingen'}`;
  const snelleMaanden = andereMaanden.slice(0, 4);

  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center sm:p-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <KompasIcoon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Helaas, we vonden nog geen passende bestemming
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Geen zorgen, met een kleine aanpassing kom je vaak al een heel eind. Probeer je budget te
        verhogen of je filters wat ruimer te zetten.
      </p>

      <ul className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm text-slate-700">
        {minimaalBudget && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>
              💶 Vanaf <strong>{formatEuro(minimaalBudget)}</strong> p.p. vind je al een bestemming
              die verder aan je wensen voldoet.
            </p>
            <div className="mt-2">
              <TipKnop onClick={() => onPasAan({ budget: String(minimaalBudget) })}>
                Zoek met {formatEuro(minimaalBudget)}
              </TipKnop>
            </div>
          </li>
        )}

        {snelleMaanden.length > 0 && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>📅 In {MAANDEN[criteria.maand - 1]} is het aanbod beperkt. Probeer een andere maand:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {snelleMaanden.map((maand) => (
                <TipKnop key={maand} onClick={() => onPasAan({ maand })}>
                  <span className="capitalize">{MAANDEN[maand - 1]}</span>
                </TipKnop>
              ))}
            </div>
          </li>
        )}

        {aantalZonderType > 0 && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>🧭 Zonder filter op type vakantie vind je {aantal(aantalZonderType)}.</p>
            <div className="mt-2">
              <TipKnop onClick={() => onPasAan({ types: [] })}>Toon alle types</TipKnop>
            </div>
          </li>
        )}

        {aantalZonderRecentheid > 0 && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>🕒 Zonder tijdsfilter op het incident vind je {aantal(aantalZonderRecentheid)}.</p>
            <div className="mt-2">
              <TipKnop onClick={() => onPasAan({ recentheid: 'alle' })}>Toon alle incidenten</TipKnop>
            </div>
          </li>
        )}

        {aantalZonderSoort > 0 && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>📰 Met alle soorten incidenten vind je {aantal(aantalZonderSoort)}.</p>
            <div className="mt-2">
              <TipKnop onClick={() => onPasAan({ soorten: [] })}>Alle soorten tonen</TipKnop>
            </div>
          </li>
        )}

        {criteria.veiligheidsniveau === 'groen' && (
          <li className="rounded-xl bg-stone-50 p-4">
            <p>🛡️ Je zoekt nu alleen op groen. Met ‘groen en geel’ is er veel meer keuze.</p>
            <div className="mt-2">
              <TipKnop onClick={() => onPasAan({ veiligheidsniveau: 'groen-geel' })}>
                Ook geel tonen
              </TipKnop>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
