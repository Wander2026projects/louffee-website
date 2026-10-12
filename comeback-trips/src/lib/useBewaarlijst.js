import { useCallback, useState } from 'react';

const SLEUTEL = 'comeback-trips:bewaard';

function lees() {
  try {
    const waarde = JSON.parse(window.localStorage.getItem(SLEUTEL) ?? '[]');
    return Array.isArray(waarde) ? waarde : [];
  } catch {
    return [];
  }
}

function schrijf(ids) {
  try {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(ids));
  } catch {
    // Opslag niet beschikbaar (bijv. privévenster): de lijst werkt dan alleen tijdens dit bezoek.
  }
}

/** Bewaarlijst met favoriete bestemmingen, onthouden in de browser van de gebruiker. */
export default function useBewaarlijst() {
  const [bewaard, setBewaard] = useState(lees);

  const wissel = useCallback((id) => {
    setBewaard((huidig) => {
      const nieuw = huidig.includes(id) ? huidig.filter((x) => x !== id) : [...huidig, id];
      schrijf(nieuw);
      return nieuw;
    });
  }, []);

  return { bewaard, wissel };
}
