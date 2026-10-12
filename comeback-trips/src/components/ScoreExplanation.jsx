import { LUCHTHAVEN_TOESLAG, VAST_PRIJSAANDEEL } from '../lib/constants.js';
import { formatEuro } from '../lib/format.js';

export default function ScoreExplanation() {
  const vastProcent = Math.round(VAST_PRIJSAANDEEL * 100);

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white p-5 text-sm text-slate-600 open:shadow-sm sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-900">
        Hoe berekenen we de scores?
        <span className="text-slate-400 transition group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>

      <div className="mt-4 space-y-4 leading-relaxed">
        <div>
          <h3 className="font-semibold text-slate-800">Veiligheidsscore (1–10)</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Basis op reisadvies: groen = 9, geel = 7, oranje = 3.</li>
            <li>+1 als het incident meer dan 3 jaar geleden was.</li>
            <li>+0,5 als het reisadvies verbeterd is, −1 als het verslechterd is.</li>
            <li>Afgerond en begrensd tussen 1 en 10. Bestemmingen met code rood tonen we nooit.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Waardescore</h3>
          <p className="mt-1">
            Prijsdaling (%) × (veiligheidsscore ÷ 10). Een flinke korting op een veilige plek scoort
            dus het hoogst. We tonen de top 5.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Geschatte prijs</h3>
          <p className="mt-1">
            Prijzen zijn gebaseerd op een week (vlucht + hotel). Bij een andere reisduur blijft
            ongeveer {vastProcent}% (de vlucht) gelijk en schaalt de rest per dag mee. Wordt een reis
            niet vanaf jouw luchthaven aangeboden, dan tellen we er ca. {formatEuro(LUCHTHAVEN_TOESLAG)}{' '}
            bij op.
          </p>
        </div>
      </div>
    </details>
  );
}
