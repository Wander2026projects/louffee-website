import { SchildIcoon } from './icons.jsx';

function kleur(score) {
  if (score >= 8) return 'text-emerald-700 bg-emerald-50 ring-emerald-200';
  if (score >= 6) return 'text-teal-800 bg-teal-50 ring-teal-200';
  if (score >= 4) return 'text-yellow-800 bg-yellow-50 ring-yellow-300';
  return 'text-orange-800 bg-orange-50 ring-orange-300';
}

export default function SafetyScore({ score }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${kleur(score)}`}
    >
      <SchildIcoon className="h-3.5 w-3.5" />
      Veiligheid {score}/10
    </span>
  );
}
