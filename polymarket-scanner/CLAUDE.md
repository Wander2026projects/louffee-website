# Polymarket Combo Scanner

## Wat we bouwen

Een website die alle sportwedstrijden op Polymarket in de komende 48 uur scant, daaruit combinaties (combos/parlays) van 2–5 legs maakt, en de combos toont met de **hoogste slagingskans** die **minstens een ingestelde return** halen (standaard 2×).

Dit is een **analyse- en leerproject**: de site laat zien welke combos er zijn en hoe de kansen werken.

## Harde regels

- **Alleen-lezen.** Geen inzetfunctie, geen wallet, geen login, geen API-keys, geen order-endpoints (zoals `POST /order`). Polymarket is in Nederland verboden door de Kansspelautoriteit; deze tool leest alleen openbare marktdata.
- **Geen nepdata in de echte app.** Werkt de API niet, toon dan een duidelijke foutmelding in plaats van stilletjes voorbeelddata. Nepdata alleen in tests.
- UI-teksten in het **Nederlands**, met Nederlandse getalnotatie (`2,5`, `€0,96`). Code en variabelen in het Engels.
- Tijden tonen in **Europe/Amsterdam**.
- Ontwikkeld op **Windows**: alle commando's moeten in PowerShell werken (geen bash-only scripts).

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Vitest voor tests
- Data ophalen gebeurt **server-side** in een API-route (geen CORS-problemen, later makkelijk online te zetten).
- De combo-berekening is een **pure TypeScript-module die in de browser draait**, zodat schuifjes direct herberekenen zonder opnieuw te scannen.
- Moet lokaal draaien met `npm run dev` én later online kunnen (Netlify of Vercel).

## Data: Polymarket API

Alles is openbaar, geen key nodig. **Lees eerst de actuele docs:** https://docs.polymarket.com/llms.txt. Vertrouw niet op aannames; de API verandert.

- **Gamma API** `https://gamma-api.polymarket.com`: events, markets, `/sports` (sportmetadata en markttypes), paginering.
- **CLOB API** `https://clob.polymarket.com`: orderboeken en prijzen per token, ook in batch (meerdere tokens per request). Gebruik batch-endpoints waar mogelijk.
- Elke markt heeft outcomes, elk met een eigen CLOB token-ID.
- Respecteer rate limits: beperk gelijktijdige requests, retry met backoff bij 429, cache scanresultaten 60 seconden server-side.

---

## Fase 0: Verkennen (eerst doen)

1. Test of beide API's bereikbaar zijn vanaf deze computer (bijv. `GET /events?limit=5` en één `/book`-request). Is iets geblokkeerd, stop dan en meld het. Bouw geen omwegen (proxy's, VPN's).
2. Haal echte sportdata op en sla een paar voorbeelden op in `/samples` (in `.gitignore`).
3. Zoek uit en schrijf kort op in `docs/data-notes.md`:
   - hoe je sport-events filtert en per sport herkent (tags, `/sports`, series);
   - hoe een voetbalwedstrijd is opgebouwd (winnaar/gelijk als losse ja/nee-markten? over/under per lijn? beide teams scoren?);
   - welke velden nodig zijn: aftrap-tijd, status (nog niet begonnen, accepteert orders), liquiditeit, token-ID's, slug voor de link;
   - of de uitslag-markten over 90 minuten gaan (zo ja: "(90 min)" tonen in de UI);
   - de actuele fee-structuur voor sportmarkten (die is in juli 2026 gewijzigd), uit de docs of de CLOB market-info.
4. Geef een korte samenvatting en ga door, tenzij iets fundamenteel anders is dan deze spec.

## Fase 1: Data-laag

Bouw `lib/polymarket.ts` en een API-route `GET /api/scan` die een lijst **legs** teruggeeft.

**Welke wedstrijden:** alle sporten, aftrap binnen 48 uur vanaf nu, nog niet begonnen, markt actief en orderboek aan.

**Welke markten:**
- Uitslag/winnaar (incl. gelijkspel bij voetbal)
- "Nee"-kant van uitslagmarkten = dubbele kans (bijv. "Ajax wint níet" = gelijk of tegenstander wint)
- Over/Under (alle lijnen die er zijn)
- Beide teams scoren (alleen voetbal)
- **Niet:** handicaps, spelersmarkten, live-markten. Onbekende markttypes overslaan en loggen.

**Per leg:**

```ts
type Leg = {
  id: string;            // tokenId
  matchId: string;       // event-id; max 1 leg per wedstrijd
  sport: string;         // "Voetbal", "Basketbal", ...
  competition: string;
  matchTitle: string;    // "Ajax – PSV"
  kickoff: string;       // ISO-tijd
  marketType: "winner" | "double_chance" | "totals" | "btts";
  pickLabel: string;     // Nederlands, bijv. "Over 2,5 goals", "Ajax wint níet (gelijk of PSV)"
  fairProb: number;      // eerlijke kans (zie hieronder)
  askPrice: number;      // beste ask: wat je echt betaalt voor 1 share
  effPrice: number;      // askPrice inclusief fees
  spread: number;        // ask - bid
  liquidity: number;     // USD
  url: string;           // link naar het Polymarket-event
};
```

**Kansen en prijzen (dit is de kern):**
- **Eerlijke kans (`fairProb`)** = midpoint van bid en ask, niet de laatste trade.
- Bij elkaar uitsluitende uitkomsten (thuis/gelijk/uit in één wedstrijd, of over/under op dezelfde lijn) normaliseer je de midpoints zodat ze optellen tot 1.
- **Prijs (`askPrice`)** = beste ask uit het orderboek van precies het token dat je zou kopen. Ook voor "Nee": gebruik het eigen orderboek van het Nee-token.
- **`effPrice`** = askPrice met fees verwerkt volgens de actuele fee-regels. Zet het fee-percentage ook als instelling in `lib/config.ts`.
- Filter legs met spread > max. spread of liquiditeit < min. liquiditeit (instellingen).

## Fase 2: Combo-optimizer

Bouw `lib/combos.ts` (puur, geen netwerk) met tests.

**Doel:** vind combos die
- 2 tot 5 legs hebben (min/max instelbaar),
- **maximaal 1 leg per wedstrijd** hebben (legs uit dezelfde wedstrijd hangen samen, dan klopt vermenigvuldigen niet),
- een return hebben van minstens **Rmin** (standaard 2,0×),

en sorteer ze op **hoogste slagingskans**.

**Formules:**
- kans = ∏ fairProb
- return = 1 / ∏ effPrice (uitbetaling per €1 inzet)
- verwachte waarde (EV) = kans × return, tonen als "€0,96 per €1"

Brute force kan niet (duizenden legs). **Aanbevolen aanpak: group knapsack met dynamisch programmeren.**
1. Bewaar per wedstrijd alleen Pareto-optimale legs (geen andere leg in die wedstrijd met zowel hogere kans als hogere return).
2. Per leg: `r = ln(1 / effPrice)`, `q = ln(fairProb)`.
3. Toestand = (aantal legs, Σr afgerond op stappen van 0,005, afgekapt op ln(Rmin)). Bewaar per toestand de top-K (bijv. 50) deelcombos op Σq.
4. Neem na alle wedstrijden de toestanden met een geldig aantal legs en Σr ≥ ln(Rmin), herbereken exact, filter op exacte return ≥ Rmin, en sorteer op kans (bij gelijke kans: hogere EV eerst).

Beam search mag ook, zolang de tests slagen.

**Diversiteit:** dezelfde leg mag in maximaal 3 combos in de toplijst staan (instelling); anders zijn alle top-25 bijna hetzelfde.

**Tests (Vitest), verplicht:**
- Rekenregels: kans, return, EV, normalisatie, fee-verwerking.
- Optimizer vs. brute force: genereer 20 nep-wedstrijden met 3–5 legs, vergelijk de top-10 met brute force over alle geldige combinaties. De kansen moeten gelijk zijn.
- Max. 1 leg per wedstrijd en de minimale return worden altijd gerespecteerd.
- Snelheid: 300 wedstrijden × 6 legs in minder dan 1 seconde.

## Fase 3: Website

Eén pagina, strak en overzichtelijk, werkt ook op mobiel.

**Bovenaan:**
- Grote knop **Scan**. Status eronder, bijv.: "Gescand om 22:41 · 143 wedstrijden · 612 markten · 1.204 legs".
- Instellingen (herberekenen direct, zonder opnieuw te scannen):
  - Sporten: knoppen per sport, standaard alleen **Voetbal** aan, plus een knop "Alle sporten"
  - Markttypes: Uitslag, Dubbele kans, Over/Under, Beide teams scoren (standaard alles aan)
  - Minimale return: schuif van 1,2× tot 20×, standaard 2×
  - Aantal legs: min. 2, max. 5
  - Min. liquiditeit per markt (standaard $500), max. spread (standaard 4 cent)
  - Aantal resultaten (standaard 25)

**Resultaten:** kaarten, gesorteerd op kans. Per combo:
- Groot: **kans %** en **return ×**, plus "€10 → €X", EV per €1, aantal legs en eerste aftrap.
- Tabel met legs: sport, competitie, wedstrijd, aftrap (Amsterdamse tijd), keuze, kans, prijs, spread, liquiditeit en link naar Polymarket.

**Lege toestand:** "Geen combos met minimaal 2× return. Verlaag de minimale return of verhoog het max. aantal legs."
**Foutstatus:** duidelijke melding als de API niet bereikbaar is.

**Uitlegpaneel "Hoe werkt dit?"** (inklapbaar), in gewone taal:
- De kans is een schatting van de markt, geen garantie.
- Op Polymarket hangen kans en return aan elkaar vast. Hoge return én hoge kans tegelijk bestaat alleen als de markt ernaast zit.
- De EV ligt bijna altijd onder €1 per €1: elke extra leg kost geld door spread en fees. Daarom staan combos met weinig legs en kleine spreads bovenaan.
- Polymarkets eigen Combo-functie prijst via market makers (RFQ); de echte prijs is meestal lager dan de theoretische return op deze site.
- Maximaal 1 leg per wedstrijd, omdat uitkomsten binnen één wedstrijd samenhangen.

**Footer:** "Analyse-tool met openbare Polymarket-data. Geen inzetadvies."

## Fase 4: Online zetten

- Zorg dat `npm run build` foutloos werkt.
- Zet de site online op Netlify (of Vercel) en leg stap voor stap uit wat ik moet doen. Er zijn geen geheime keys nodig.
- Let op: iedereen met de link kan de site zien.

---

## Klaar wanneer

- [ ] `npm run dev` draait en de Scan-knop haalt echte data op
- [ ] Alle tests slagen (`npm test`)
- [ ] Combos respecteren altijd: 2–5 legs, max. 1 per wedstrijd, return ≥ ingesteld minimum
- [ ] Voor 2 combos zijn de getallen handmatig nagerekend met de ruwe orderboek-data uit de API
- [ ] `README.md` met installeren, starten, testen en online zetten (PowerShell-commando's)
- [ ] De online versie werkt

## Later (nu niet bouwen)

- Vergelijken met bookmaker-odds om "value"-legs te vinden
- Meerdere legs uit dezelfde wedstrijd, met correlatie
- Automatisch verversen en meldingen

## Werkwijze

Werk fase voor fase. Draai na elke fase de tests en geef een korte samenvatting van wat er gebouwd is en wat ik zelf kan testen.
