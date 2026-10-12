# Comeback Trips

Webapp die Nederlandse reizigers helpt betaalbare, ondergewaardeerde bestemmingen te vinden:
plekken waar de prijzen zijn gedaald na een incident (aanslag, onrust, natuurramp), maar die nu
weer redelijk veilig zijn. Door erheen te gaan help je ze weer op gang.

> **Let op:** alle data is **voorbeelddata**. De incidenten zijn echt gebeurd, maar reisadviezen,
> trends, controledata en prijzen zijn schattingen. Controleer altijd het actuele reisadvies op
> [nederlandwereldwijd.nl](https://www.nederlandwereldwijd.nl/reisadvies).

## Lokaal starten

Je hebt [Node.js](https://nodejs.org/) **20.19 of nieuwer** nodig (controleer met `node -v`).

```bash
cd comeback-trips
npm install      # eenmalig: installeert de afhankelijkheden
npm run dev      # start de ontwikkelserver
```

Open daarna de link die in de terminal verschijnt (meestal http://localhost:5173).
Stoppen doe je met `Ctrl + C`.

Overige commando's:

| Commando          | Wat het doet                                          |
| ----------------- | ----------------------------------------------------- |
| `npm test`        | Draait de tests voor de score- en filterlogica        |
| `npm run build`   | Maakt een productieversie in de map `dist/`           |
| `npm run preview` | Bekijkt die productieversie lokaal                    |

## Hoe het werkt

**Veiligheidsscore (1–10)**: basis op reisadvies (groen 9, geel 7, oranje 3, rood 1), +1 als het
incident meer dan 3 jaar geleden was, +0,5 bij trend "verbeterd", −1 bij "verslechterd"; afgerond
en begrensd tussen 1 en 10. Bestemmingen met rood worden nooit getoond.

**Waardescore**: `prijsdaling (%) × (veiligheidsscore / 10)`, met
`prijsdaling = (normalePrijs − huidigePrijs) / normalePrijs × 100`. De top 5 wordt getoond.

**Filters**: budget, vakantietype, reismaand (moet een van de beste reismaanden zijn),
veiligheidsniveau, soort incident (aanslag of geweld, onrust, oorlog of conflict, natuurramp) en
hoe recent het incident was (laatste 12 maanden of 2 jaar).

**Sorteren**: standaard op waardeScore; daarnaast op laagste totaalprijs, goedkoopste vlucht of
meest recente incident.

**Goedkoopste vlucht**: per bestemming staan in `vluchtPrijzen` retourprijzen per luchthaven
(Schiphol, Eindhoven, Rotterdam en over de grens Weeze, Düsseldorf en Brussel-Charleroi). De app
kiest de goedkoopste uit de luchthavens die je aanvinkt. Vliegt geen daarvan erheen, dan rekent
hij met de goedkoopste andere luchthaven plus een toeslag van € 80 (`src/lib/constants.js`).
Elke kaart linkt naar Google Flights en Skyscanner met de route alvast ingevuld.

**Prijs voor de gekozen periode**: vlucht + verblijf × aantal dagen. Het verblijf per week is
`huidigePrijs − vluchtPrijzen.Schiphol` (de weekprijs is gebaseerd op vertrek vanaf Schiphol).

**Bewaarlijst**: met het hartje bewaar je bestemmingen. Die lijst staat alleen in je eigen browser.

## Projectstructuur

```
src/
├── App.jsx                 # Formulierstatus, zoeken en paginalayout
├── data/destinations.json  # Alle bestemmingen (voorbeelddata)
├── lib/
│   ├── constants.js        # Maanden, types, adviesniveaus, prijsinstellingen
│   ├── scoring.js          # Veiligheids- en waardescore, filters, ranking
│   ├── scoring.test.js     # Tests voor de rekenregels en de data
│   ├── links.js            # Links naar Google Flights en Skyscanner
│   ├── useBewaarlijst.js   # Bewaarlijst in localStorage
│   └── format.js           # Euro-, datum- en getalnotatie (nl-NL)
└── components/
    ├── Header.jsx, Footer.jsx (met disclaimer), SampleDataNotice.jsx
    ├── SearchForm.jsx      # Invoerformulier
    ├── Results.jsx         # Top 5, lege staat of "geen resultaten"
    ├── DestinationCard.jsx # Resultaatkaart (vluchtprijzen, oranje-waarschuwing, links)
    ├── NoResults.jsx       # Vriendelijke melding met klikbare tips
    ├── SavedList.jsx       # Bewaarlijst
    ├── TravelTips.jsx      # Bespaartips en tips om lokaal te helpen
    └── AdviceBadge, SafetyScore, TrendIndicator, ScoreExplanation, icons
```

## Een bestemming toevoegen

Voeg een object toe aan `bestemmingen` in `src/data/destinations.json`:

```json
{
  "id": "unieke-id",
  "naam": "Plaats",
  "land": "Land",
  "regio": "Regio",
  "type": ["strand", "cultuur"],
  "incident": { "omschrijving": "Wat er gebeurde.", "soort": "aanslag", "jaar": 2020, "maand": 6 },
  "reisadvies": "groen",
  "adviesTrend": "stabiel",
  "laatstGecontroleerd": "2026-10-01",
  "normalePrijs": 800,
  "huidigePrijs": 650,
  "vluchtPrijzen": { "Schiphol": 220, "Eindhoven": 180 },
  "besteReismaanden": [5, 6, 9],
  "vliegveld": "ABC",
  "vliegduurUren": 3,
  "reisadviesUrl": "https://www.nederlandwereldwijd.nl/reisadvies/land"
}
```

`npm test` controleert of alle bestemmingen compleet en geldig zijn.
