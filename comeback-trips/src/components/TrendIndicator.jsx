import { TREND_INFO } from '../lib/constants.js';
import { TrendOmhoogIcoon, TrendOmlaagIcoon, TrendVlakIcoon } from './icons.jsx';

const STIJLEN = {
  verbeterd: { icoon: TrendOmhoogIcoon, kleur: 'text-emerald-700 bg-emerald-50' },
  stabiel: { icoon: TrendVlakIcoon, kleur: 'text-slate-700 bg-slate-100' },
  verslechterd: { icoon: TrendOmlaagIcoon, kleur: 'text-rose-700 bg-rose-50' },
};

export default function TrendIndicator({ trend }) {
  const stijl = STIJLEN[trend] ?? STIJLEN.stabiel;
  const Icoon = stijl.icoon;

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${stijl.kleur}`}>
        <Icoon className="h-4 w-4" />
      </span>
      {TREND_INFO[trend]?.label ?? trend}
    </span>
  );
}
