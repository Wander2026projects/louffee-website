import { useRef, useState } from 'react';
import data from './data/destinations.json';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import Results from './components/Results.jsx';
import SampleDataNotice from './components/SampleDataNotice.jsx';
import SearchForm from './components/SearchForm.jsx';
import { MAX_DAGEN, MIN_DAGEN, STANDAARD_VEILIGHEIDSNIVEAU } from './lib/constants.js';
import { zoekBestemmingen } from './lib/scoring.js';

const volgendeMaand = (new Date().getMonth() + 1) % 12 + 1;

const STARTWAARDEN = {
  budget: '1000',
  luchthaven: 'Schiphol',
  maand: volgendeMaand,
  dagen: 7,
  types: [],
  veiligheidsniveau: STANDAARD_VEILIGHEIDSNIVEAU,
};

function valideer(waarden) {
  const fouten = {};
  const budget = Number(waarden.budget);
  if (waarden.budget === '' || Number.isNaN(budget)) {
    fouten.budget = 'Vul een budget in.';
  } else if (budget < 100) {
    fouten.budget = 'Kies een budget van minimaal € 100.';
  }
  return fouten;
}

function naarCriteria(waarden) {
  return {
    ...waarden,
    budget: Number(waarden.budget),
    dagen: Math.min(MAX_DAGEN, Math.max(MIN_DAGEN, waarden.dagen)),
  };
}

export default function App() {
  const [waarden, setWaarden] = useState(STARTWAARDEN);
  const [fouten, setFouten] = useState({});
  const [zoekresultaat, setZoekresultaat] = useState(null);
  const resultatenRef = useRef(null);

  const zoek = (zoekwaarden) => {
    const nieuweFouten = valideer(zoekwaarden);
    setFouten(nieuweFouten);
    if (Object.keys(nieuweFouten).length > 0) return;

    const criteria = naarCriteria(zoekwaarden);
    setZoekresultaat({ criteria, ...zoekBestemmingen(data.bestemmingen, criteria) });

    // Op mobiel staan de resultaten onder het formulier: scroll ernaartoe.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() =>
        resultatenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    }
  };

  const pasAanEnZoek = (wijzigingen) => {
    const nieuweWaarden = { ...waarden, ...wijzigingen };
    setWaarden(nieuweWaarden);
    zoek(nieuweWaarden);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6">
        <SampleDataNotice />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <div>
            <SearchForm
              waarden={waarden}
              fouten={fouten}
              onChange={setWaarden}
              onSubmit={() => zoek(waarden)}
            />
          </div>
          <Results ref={resultatenRef} zoekresultaat={zoekresultaat} onPasAan={pasAanEnZoek} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
