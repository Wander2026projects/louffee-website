import { HartIcoon } from './icons.jsx';

const STIP = { groen: 'bg-emerald-500', geel: 'bg-yellow-400', oranje: 'bg-orange-500' };

/** Compacte lijst met bewaarde bestemmingen, onthouden in deze browser. */
export default function SavedList({ bestemmingen, bewaard, onWisselBewaard }) {
  const lijst = bewaard.map((id) => bestemmingen.find((b) => b.id === id)).filter(Boolean);
  if (lijst.length === 0) return null;

  return (
    <section aria-label="Jouw bewaarlijst" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <HartIcoon className="h-4 w-4 fill-rose-500 text-rose-500" />
        Jouw bewaarlijst ({lijst.length})
      </h2>
      <ul className="mt-3 divide-y divide-stone-100">
        {lijst.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STIP[b.reisadvies] ?? 'bg-slate-400'}`} aria-hidden="true" />
              <span className="truncate font-medium text-slate-800">{b.naam}</span>
              <span className="truncate text-slate-500">{b.land}</span>
            </span>
            <button
              type="button"
              onClick={() => onWisselBewaard(b.id)}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-stone-100 hover:text-slate-800"
            >
              Verwijder<span className="sr-only"> {b.naam}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">Alleen bewaard in deze browser.</p>
    </section>
  );
}
