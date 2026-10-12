import { AANTAL_RESULTATEN, MAANDEN, SORTEEROPTIES } from '../lib/constants.js';
import { sorteer } from '../lib/scoring.js';
import DestinationCard from './DestinationCard.jsx';
import NoResults from './NoResults.jsx';
import ScoreExplanation from './ScoreExplanation.jsx';

export default function Results({ ref, zoekresultaat, volgorde, onVolgorde, bewaard, onWisselBewaard, onPasAan }) {
  const { passend, totaal, criteria, suggesties } = zoekresultaat;

  if (passend.length === 0) {
    return (
      <section ref={ref} aria-live="polite" aria-label="Zoekresultaten" className="scroll-mt-6">
        <NoResults criteria={criteria} suggesties={suggesties} onPasAan={onPasAan} />
      </section>
    );
  }

  const resultaten = sorteer(passend, volgorde).slice(0, AANTAL_RESULTATEN);
  const volgordeLabel = SORTEEROPTIES.find((o) => o.id === volgorde)?.label.toLowerCase();

  return (
    <section ref={ref} aria-live="polite" aria-label="Zoekresultaten" className="scroll-mt-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {resultaten.length === 1 ? 'Jouw beste match' : `Jouw top ${resultaten.length}`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            <span className="capitalize">{MAANDEN[criteria.maand - 1]}</span> · {criteria.dagen} dagen ·{' '}
            {totaal} {totaal === 1 ? 'bestemming' : 'bestemmingen'} gevonden
            {totaal > AANTAL_RESULTATEN && <>, gesorteerd op {volgordeLabel}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="volgorde" className="shrink-0 text-sm text-slate-600">
            Sorteer op
          </label>
          <select
            id="volgorde"
            value={volgorde}
            onChange={(e) => onVolgorde(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          >
            {SORTEEROPTIES.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ol className="space-y-5">
        {resultaten.map((bestemming, index) => (
          <li key={bestemming.id}>
            <DestinationCard
              bestemming={bestemming}
              positie={index + 1}
              criteria={criteria}
              isBewaard={bewaard.includes(bestemming.id)}
              onWisselBewaard={onWisselBewaard}
            />
          </li>
        ))}
      </ol>

      <ScoreExplanation />
    </section>
  );
}
