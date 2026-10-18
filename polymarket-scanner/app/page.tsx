import { Scanner } from "./components/Scanner";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">Polymarket Combo Scanner</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Combinaties van sportwedstrijden in de komende 48 uur met de hoogste slagingskans, bij een minimale return.
          Alleen openbare marktdata; je kunt hier niets inzetten.
        </p>
      </header>
      <main>
        <Scanner />
      </main>
      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        Analyse-tool met openbare Polymarket-data. Geen inzetadvies.
      </footer>
    </div>
  );
}
