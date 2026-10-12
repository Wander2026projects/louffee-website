import { AANTAL_RESULTATEN, MAANDEN } from '../lib/constants.js';
import DestinationCard from './DestinationCard.jsx';
import NoResults from './NoResults.jsx';
import ScoreExplanation from './ScoreExplanation.jsx';
import StartState from './StartState.jsx';

export default function Results({ ref, zoekresultaat, onPasAan }) {
  let inhoud;

  if (!zoekresultaat) {
    inhoud = <StartState />;
  } else if (zoekresultaat.resultaten.length === 0) {
    inhoud = (
      <NoResults
        criteria={zoekresultaat.criteria}
        suggesties={zoekresultaat.suggesties}
        onPasAan={onPasAan}
      />
    );
  } else {
    const { resultaten, totaal, criteria } = zoekresultaat;
    inhoud = (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {resultaten.length === 1 ? 'Jouw beste match' : `Jouw top ${resultaten.length}`}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            <span className="capitalize">{MAANDEN[criteria.maand - 1]}</span> · {criteria.dagen} dagen ·
            vanaf {criteria.luchthaven}
            {totaal > AANTAL_RESULTATEN && (
              <> · {totaal} bestemmingen gevonden, gesorteerd op beste waarde</>
            )}
          </p>
        </div>

        <ol className="space-y-5">
          {resultaten.map((bestemming, index) => (
            <li key={bestemming.id}>
              <DestinationCard
                bestemming={bestemming}
                positie={index + 1}
                dagen={criteria.dagen}
                luchthaven={criteria.luchthaven}
              />
            </li>
          ))}
        </ol>

        <ScoreExplanation />
      </div>
    );
  }

  return (
    <section ref={ref} aria-live="polite" aria-label="Zoekresultaten" className="scroll-mt-6">
      {inhoud}
    </section>
  );
}
