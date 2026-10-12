import { HartIcoon, LogoIcoon, PrijsIcoon, SchildIcoon } from './icons.jsx';

const VOORDELEN = [
  { icoon: PrijsIcoon, titel: 'Goedkoop vliegen', tekst: 'We vergelijken vluchten vanaf zes luchthavens' },
  { icoon: SchildIcoon, titel: 'Weer veilig', tekst: 'Gefilterd op het reisadvies, ook na recente aanslagen' },
  { icoon: HartIcoon, titel: 'Help herstellen', tekst: 'Jouw bezoek steunt de lokale economie' },
];

export default function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5 text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <LogoIcoon className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Comeback Trips</span>
        </a>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          Voorbeelddata
        </span>
      </div>

      <div className="bg-gradient-to-b from-teal-50/70 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Reis slim, reis met impact
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Ontdek bestemmingen die klaar zijn voor hun comeback
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Na een aanslag, onrust of natuurramp blijven toeristen vaak nog lang weg – ook als het
            weer redelijk veilig is. Dat betekent mooie prijzen voor jou, en broodnodige inkomsten
            voor de mensen daar.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {VOORDELEN.map(({ icoon: Icoon, titel, tekst }) => (
              <li
                key={titel}
                className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white/80 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icoon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{titel}</span>
                  <span className="block text-sm text-slate-600">{tekst}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
