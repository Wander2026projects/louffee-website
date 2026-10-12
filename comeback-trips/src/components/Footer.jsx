import { InfoIcoon } from './icons.jsx';

export const DISCLAIMER =
  'Deze app is een hulpmiddel. Controleer altijd het actuele reisadvies van het Ministerie van Buitenlandse Zaken voordat je boekt.';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <InfoIcoon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <p className="text-sm font-medium text-slate-700">{DISCLAIMER}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Comeback Trips · Alle bestemmingen en prijzen zijn voorbeelddata.</p>
          <a
            href="https://www.nederlandwereldwijd.nl/reisadvies"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
          >
            Officiële reisadviezen op nederlandwereldwijd.nl
          </a>
        </div>
      </div>
    </footer>
  );
}
