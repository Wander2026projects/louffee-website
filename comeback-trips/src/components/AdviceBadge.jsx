import { REISADVIES_INFO } from '../lib/constants.js';

const STIJLEN = {
  groen: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', stip: 'bg-emerald-500' },
  geel: { badge: 'bg-yellow-50 text-yellow-800 ring-yellow-300', stip: 'bg-yellow-400' },
  oranje: { badge: 'bg-orange-50 text-orange-800 ring-orange-300', stip: 'bg-orange-500' },
};

export default function AdviceBadge({ advies }) {
  const info = REISADVIES_INFO[advies];
  const stijl = STIJLEN[advies];
  if (!info || !stijl) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${stijl.badge}`}
      title={info.betekenis}
    >
      <span className={`h-2 w-2 rounded-full ${stijl.stip}`} aria-hidden="true" />
      Reisadvies {info.label.toLowerCase()}
      <span className="sr-only">: {info.betekenis}</span>
    </span>
  );
}
