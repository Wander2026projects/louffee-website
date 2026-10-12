import { HartIcoon, SpaarIcoon } from './icons.jsx';

const BESPAARTIPS = [
  'Vink ook Weeze, Düsseldorf en Charleroi aan. Daar vliegen prijsvechters vaak voor minder, maar reken de reis ernaartoe mee.',
  'Reis met alleen handbagage: bij budgetmaatschappijen scheelt dat snel tientallen euro’s per vlucht.',
  'Vertrek en keer terug midweek. Dinsdag en woensdag zijn vaak goedkoper dan het weekend.',
  'Vermijd de schoolvakanties; dan stijgen de prijzen het hardst.',
  'Zet een prijsalert in Google Flights of Skyscanner en boek als de prijs zakt.',
  'Stap je over in het Midden-Oosten? Check dan ook het reisadvies van dat land.',
];

const COMEBACK_TIPS = [
  'Slaap in een guesthouse of hotel van lokale eigenaren in plaats van bij een grote keten.',
  'Eet bij lokale restaurantjes en koop op de markt.',
  'Boek excursies bij gidsen en bureaus uit de regio zelf.',
  'Laat een eerlijke review achter. Dat helpt andere reizigers over de drempel.',
];

function Lijst({ items }) {
  return (
    <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
      {items.map((tip) => (
        <li key={tip} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TravelTips() {
  return (
    <section aria-label="Reistips" className="mt-12 grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <SpaarIcoon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Zo vlieg je zo goedkoop mogelijk</h2>
        </div>
        <Lijst items={BESPAARTIPS} />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <HartIcoon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Zo help je de comeback echt</h2>
        </div>
        <Lijst items={COMEBACK_TIPS} />
      </div>
    </section>
  );
}
