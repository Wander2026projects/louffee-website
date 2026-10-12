import { LUCHTHAVENS } from './constants.js';

const MAANDEN_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const luchthavenCode = (id) => LUCHTHAVENS.find((l) => l.id === id)?.code ?? 'AMS';

/** Google Flights met vertrek, bestemming en reismaand alvast ingevuld. */
export function googleFlightsUrl(vanCode, naarCode, maand) {
  const zoekvraag = `Flights from ${vanCode} to ${naarCode} in ${MAANDEN_EN[maand - 1]}`;
  return `https://www.google.com/travel/flights?hl=nl&curr=EUR&q=${encodeURIComponent(zoekvraag)}`;
}

/** Skyscanner-routepagina; toont onder meer de goedkoopste maanden voor deze route. */
export function skyscannerUrl(vanCode, naarCode) {
  return `https://www.skyscanner.nl/transport/vluchten/${vanCode.toLowerCase()}/${naarCode.toLowerCase()}/`;
}
