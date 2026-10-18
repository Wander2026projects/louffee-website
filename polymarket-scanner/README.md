# Polymarket Combo Scanner

Een website die alle sportwedstrijden op Polymarket in de komende 48 uur scant en daar combinaties (combos) van 2 tot 5 legs van maakt. Hij toont de combos met de **hoogste slagingskans** die **minstens een ingestelde return** halen (standaard 2×).

- **Alleen-lezen.** Geen inzetfunctie, geen wallet, geen login en geen API-keys; alleen openbare marktdata.
- **Analyse- en leerproject.** Polymarket is in Nederland verboden door de Kansspelautoriteit. Dit is geen inzetadvies.

## Zo werkt het

| Onderdeel | Wat het doet |
|---|---|
| `app/api/scan/route.ts` | Haalt server-side de wedstrijden (Gamma API) en orderboeken (CLOB API) op en geeft een lijst legs terug. Cache: 60 seconden. |
| `lib/polymarket.ts`, `lib/markets.ts` | Ophalen, wedstrijden groeperen, markten indelen (uitslag, dubbele kans, over/under, beide teams scoren). |
| `lib/pricing.ts` | Midpoint, normalisatie, beste bid/ask en fees. |
| `lib/combos.ts` | De optimizer: puur TypeScript, draait in de browser (Web Worker), zodat de schuifjes direct herberekenen. |
| `lib/config.ts` | Alle instellingen, waaronder het fee-percentage. |
| `docs/data-notes.md` | Wat we over de Polymarket-API hebben uitgezocht. |
| `docs/verificatie.md` | Twee combos handmatig nagerekend met de ruwe orderboeken. |

## Installeren (Windows, PowerShell)

Je hebt [Node.js](https://nodejs.org) 20.9 of nieuwer nodig (22 LTS aanbevolen). Controleer met:

```powershell
node --version
```

Ga dan naar de projectmap en installeer:

```powershell
cd polymarket-scanner
npm install
```

## Starten

```powershell
npm run dev
```

Open http://localhost:3000 en klik op **Scan**. Een scan duurt ongeveer 5 tot 10 seconden.

## Testen

```powershell
npm test
```

Wat wordt er getest?

- de rekenregels (kans, return, EV, normalisatie, fees);
- de optimizer tegen brute force;
- de harde regels (2–5 legs, maximaal 1 per wedstrijd, return ≥ minimum);
- de snelheid (300 wedstrijden × 6 legs < 1 s);
- het indelen van echte Polymarket-markten (fixture in `tests/fixtures`).

Daarnaast:

```powershell
npm run lint     # code-controle
npm run build    # productie-build, moet foutloos zijn
```

## Online zetten op Netlify

Er zijn geen geheime keys nodig. **Let op: iedereen met de link kan de site zien.** De site vraagt zoekmachines om haar niet te indexeren (`noindex`).

### Optie A: via GitHub (aanbevolen, werkt automatisch bij elke push)

1. Log in op https://app.netlify.com.
2. Kies **Add new project** → **Import an existing project** → **GitHub**.
3. Kies de repository `louffee-website`.
4. Vul bij de build-instellingen in:
   - **Branch to deploy:** de branch met de scanner, bijvoorbeeld `main` nadat je hebt gemerged.
   - **Base directory:** `polymarket-scanner`. Dit is belangrijk: zonder deze instelling bouwt Netlify de koffiesite.
   - **Build command:** `npm run build` (staat ook in `netlify.toml`).
   - **Publish directory:** `.next`.
5. Klik op **Deploy**. Netlify herkent Next.js en zet de API-route om naar een serverless function. Na ±2 minuten krijg je een link als `https://<naam>.netlify.app`.
6. Optioneel: geef de site een nettere naam via **Project configuration** → **Change project name**.

### Optie B: vanaf je eigen computer met de Netlify CLI

```powershell
cd polymarket-scanner
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

De eerste keer vraagt de CLI of je een nieuwe site wilt maken; kies **Create & configure a new project**. Er komt een map `.netlify` bij; die staat in `.gitignore`.

### Testen of de online versie werkt

1. Open de link en klik op **Scan**. Na een paar seconden verschijnen de combos.
2. Of open `https://<naam>.netlify.app/api/scan` in je browser. Je hoort JSON te zien die begint met `{"ok":true,`.

Lukt dat niet, dan toont de site een foutmelding. Kijk dan in Netlify bij **Logs** → **Functions** naar de fout.

## Instellingen aanpassen

| Instelling | Waar |
|---|---|
| Fee-percentage | `lib/config.ts` → `FEES`. Standaard leest de scanner de fee per markt uit Polymarket (`useMarketFeeSchedule: true`); `defaultRate: 0.05` is de terugval. |
| Standaardwaarden van de schuifjes | `lib/config.ts` → `DEFAULT_SETTINGS` |
| Tijdvenster (48 uur) en cache (60 s) | `lib/config.ts` → `SCAN` |
| Hoe vaak dezelfde leg in de toplijst mag (3) | `lib/config.ts` → `maxLegReuse` |
