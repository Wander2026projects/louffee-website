import { LUCHTHAVEN_TOESLAG } from '../lib/constants.js';
import { formatEuro } from '../lib/format.js';

export default function ScoreExplanation() {
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
            De goedkoopste retourvlucht vanaf de luchthavens die je hebt gekozen, plus het verblijf
            per dag maal het aantal dagen. Vliegt geen van jouw luchthavens erheen, dan rekenen we
            met de goedkoopste andere luchthaven plus ca. {formatEuro(LUCHTHAVEN_TOESLAG)} voor de
            reis ernaartoe.
          </p>
        </div>
      </div>
    </details>
  );
}
