import { KompasIcoon } from './icons.jsx';

const STAPPEN = [
  'Vul je budget, reismaand en wensen in.',
  'We filteren op het reisadvies en jouw voorkeuren.',
  'Je ziet de 5 bestemmingen met de beste prijs-veiligheidverhouding.',
];

export default function StartState() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 sm:p-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <KompasIcoon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Klaar om te ontdekken?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Zo vind je in drie stappen een bestemming die jou én de lokale bevolking blij maakt.
      </p>
      <ol className="mt-6 space-y-3">
        {STAPPEN.map((stap, index) => (
          <li key={stap} className="flex items-start gap-3 text-sm text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
              {index + 1}
            </span>
            <span className="pt-0.5">{stap}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
