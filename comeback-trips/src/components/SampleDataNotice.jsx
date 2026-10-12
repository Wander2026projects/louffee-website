import { InfoIcoon } from './icons.jsx';

export default function SampleDataNotice() {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <InfoIcoon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <p>
        <strong className="font-semibold">Let op: dit is voorbeelddata.</strong> De incidenten zijn
        echt gebeurd, maar de reisadviezen, trends, controledata en prijzen in deze app zijn
        schattingen ter illustratie.
      </p>
    </div>
  );
}
