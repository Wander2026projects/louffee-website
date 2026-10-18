# Data-notities: Polymarket-API

Onderzocht op 18 oktober 2026 met de echte API's. Bronnen zijn https://docs.polymarket.com/llms.txt, de OpenAPI-specs en live responses. Voorbeelden staan in `samples/`; die map staat in `.gitignore`.

## Bereikbaarheid

| API | Test | Resultaat |
|---|---|---|
| Gamma `https://gamma-api.polymarket.com` | `GET /events?limit=5` | 200 |
| CLOB `https://clob.polymarket.com` | `GET /time`, `GET /book`, `POST /books` | 200 |

- Er is geen API-key nodig.
- Python's `urllib` krijgt een 403 zonder `User-Agent`-header. De scanner stuurt die header daarom altijd mee.

## Sport-events vinden

- **Endpoint:** `GET /events/keyset?tag_id=100639&closed=false&limit=100&start_time_min=<nu>&start_time_max=<nu+48u>`.
  - Tag `100639` heet "games" en staat op alle wedstrijden, ook companion-events zoals "-more-markets".
  - `start_time_*` filtert op `event.startTime`: de aftrap.
- **Paginering:** keyset met `next_cursor` → `after_cursor`. `offset` geeft een 422.
  - Een pagina duurt ±0,7 s, dus 48 uur ophalen kost na elkaar ±14 s.
  - De scanner knipt het venster daarom in 8 stukken en haalt er 4 tegelijk op. Dat duurt ±3 s.
- **Omvang:** ±1.750 events en ±22.000 markten. Dat is ±97 MB JSON, omdat elke markt een lange beschrijving heeft. De scanner gooit direct alles weg wat hij niet gebruikt.
- **Sport herkennen** (`lib/sports.ts`):
  - Neem `event.tags[].id` samen met `event.sport.tags`. Daarin zit een sport-categorie-tag, bijvoorbeeld:

    | Tag | Sport |
    |---|---|
    | 100350 | voetbal |
    | 28 | basketbal |
    | 864 | tennis |
    | 100088 | ijshockey |
    | 678 | honkbal |
    | 517 | cricket |
    | 64 | esports |
    | 103767 | tafeltennis |
    | 101437 | darts |

  - Een paar competities hebben zo'n tag niet: nba, nfl, mlb, nhl en enkele andere. Die gaan via hun competitiecode (`event.sport.sport`).
  - Gecontroleerd: alle 484 competities uit `GET /sports` en alle 1.814 events kregen een sport, zonder conflicten.
- **Competitie:**
  - Gebruik `event.sport.name`, bijvoorbeeld "Premier League".
  - Bij tennis, esports, darts en cricket komt het toernooi erbij uit `event.eventMetadata.league`, bijvoorbeeld "ATP Tour · European Open".
  - `series[0].title` is onbruikbaar: die bevat jaartallen, slugs en spaties.

## Opbouw van een wedstrijd

Een wedstrijd bestaat uit een **hoofd-event** plus **companion-events**:

- De companion-events zijn `-more-markets`, `-halftime-result`, `-exact-score`, `-first-to-score`, `-total-corners`, `-player-props` en nog een paar.
- Ze delen `gameId` en `startTime`.
- ITF-tennis en cricket hebben geen `gameId`. Daar groepeert de scanner op de slug zonder achtervoegsel.
- **matchId** = id van het hoofd-event. Zo kan een combo nooit twee legs uit dezelfde wedstrijd bevatten, ook niet via een companion-event.

### Voetbal (en rugby, en Sheffield Shield-cricket): 3-weg

- **Hoofd-event:** 3 losse ja/nee-markten met `sportsMarketType = "moneyline"`, `negRisk = true` en `groupItemThreshold` 0/1/2:
  - thuis wint (`groupItemTitle` = teamnaam)
  - gelijk (`groupItemTitle` begint met "Draw", slug eindigt op `-draw`)
  - uit wint
- **`-more-markets`:**
  - `totals`: één markt per lijn (0,5 t/m 8,5), outcomes `["Over","Under"]`, veld `line`.
  - `both_teams_to_score`: ja/nee.
  - Daarnaast handicaps, helften en teamtotalen. Die slaat de scanner over.
- **Dubbele kans** = de "Nee"-kant van een uitslagmarkt. Bijvoorbeeld "Ajax wint níet" = gelijk of tegenstander wint, en "Nee" op gelijk = geen gelijkspel.
  - Echte `double_chance`-markten bestaan wel als type, maar er staan er 0 open. Er is dus geen dubbeling.

### Andere sporten: 2-weg

- **Uitslag:** één `moneyline`-markt met twee outcomes (de teamnamen of spelersnamen). "Nee" op team A is gewoon "ja" op team B, dus daar maakt de scanner geen dubbele kans van.
- **Volledige over/under:**

  | `sportsMarketType` | Sport | Eenheid |
  |---|---|---|
  | `totals` | voetbal, ijshockey | goals |
  | `totals` | basketbal, NFL | punten |
  | `totals` | honkbal | runs |
  | `totals` | esports | maps/games |
  | `totals` | MMA | ronden |
  | `tennis_match_totals` | tennis | games |
  | `tennis_set_totals` | tennis | sets |
  | `table_tennis_match_totals` | tafeltennis | games |

  Alle lijnen eindigen op ,5, dus er is nooit "push".
- **Overgeslagen** (en gelogd per type): handicaps (`spreads`, ...), helften/kwarten/sets/maps, spelersmarkten, exacte uitslag, corners, teamtotalen, enzovoort.

## Uitslagmarkten: hoeveel minuten?

- **Voetbal:** "This market refers only to the outcome within the first 90 minutes of regular play plus stoppage time."
  - Dit geldt voor alle 435 voetbal-uitslagmarkten, ook UCL- en bekerwedstrijden.
  - De UI toont daarom **"(90 min)"**.
  - Totals en BTTS gaan ook over 90 minuten.
- **Rugby:** 80 minuten.
- **IJshockey:** inclusief verlenging en shoot-out. De shoot-outwinnaar krijgt +1 goal.
- **Basketbal en NFL:** inclusief verlenging.
- **Tennis:** wie doorgaat, wint. Opgave telt dus als winst.
- **Esports:** de hele serie (BO3/BO5).

## Velden per markt

| Nodig voor | Veld |
|---|---|
| aftrap | `event.startTime` (niet de datum in de slug of vraag: die kan verouderd zijn na een verplaatsing) |
| nog niet begonnen | `startTime > nu`, `event.live !== true`, `event.ended !== true`, `event.closed !== true` |
| handelbaar | `market.active && !market.closed && !market.archived && market.acceptingOrders && market.enableOrderBook` |
| tokens | `market.clobTokenIds`: JSON-string, `[i]` hoort bij `outcomes[i]` (40/40 gecontroleerd) |
| liquiditeit | `market.liquidityNum` (USD, totaal van het orderboek van de markt) |
| fee | `market.feesEnabled` en `market.feeSchedule {rate, exponent, takerOnly}` |
| link | `https://polymarket.com/event/<slug van het hoofd-event>` |

## Orderboeken (CLOB)

- **Ophalen:** `POST /books` met `[{"token_id": "..."}]`.
  - Maximaal **500 tokens** per request; 501 geeft een 400.
  - De volgorde van het antwoord is willekeurig, dus koppel op `asset_id`. Onbekende tokens ontbreken gewoon.
- **Sortering:** bids staan oplopend, asks aflopend; het beste staat dus achteraan. De OpenAPI-spec zegt het omgekeerde. De scanner neemt daarom altijd max(bid) en min(ask).
- **Ja- en Nee-boek** zijn hetzelfde boek, gespiegeld: `Nee.ask = 1 − Ja.bid`.
  - De scanner haalt toch van elk token zijn eigen boek op, zoals de spec vraagt.
- **Gamma-prijzen** (`bestBid`/`bestAsk`) worden tot 300 s gecachet door Cloudflare. Live prijzen komen daarom altijd uit de CLOB.
- **Rate limits** (docs):

  | Endpoint | Limiet |
  |---|---|
  | Gamma `/events` | 500 per 10 s |
  | CLOB `/books` | 500 per 10 s |

  Daarboven wordt er eerst vertraagd, daarna volgt een 429. De scanner draait maximaal 4 requests tegelijk en probeert bij een 429 of 5xx opnieuw met exponential backoff. Een scan cachet 60 s op de server.

## Fees (gewijzigd in juli 2026)

- **Formule:** `fee = shares × rate × (p × (1 − p))^exponent`.
  - Alleen de taker betaalt.
  - De fee komt **bovenop** de prijs: je krijgt alle shares. Dat is on-chain gecontroleerd: 33 shares à 0,36 kostten 11,88 + 0,38016 = 12,26016 pUSD.
- **Sport:** `rate` is per **10 juli 2026** van 0,03 naar **0,05** gegaan (changelog), met `exponent` 1.
  - **NFL**-markten hebben nu nog `rate` 0,03 (`feeType sports_fees_nfl_cfb_oct26`).
  - De scanner leest daarom per markt `feeSchedule`. Valt die weg, dan gebruikt hij `FEES.defaultRate` (0,05) uit `lib/config.ts`.
- **Effectieve prijs per share:** `effPrice = ask + rate × (ask × (1 − ask))^exponent`. Bijvoorbeeld: ask 0,65 geeft 0,661375.
- **Niet meegerekend:**
  - Builder-fees van apps van derden, die bovenop de taker-fee komen.
  - Het doorlopen van meerdere prijsniveaus bij grote inzetten.

## Combo's op Polymarket zelf

- Polymarket heeft een eigen Combo-functie (RFQ).
- Market makers geven daar binnen 400 ms een prijs voor de hele combinatie.
- Die prijs kan afwijken van het product van de losse prijzen; meestal is hij lager. De scanner rekent alleen met losse legs uit het orderboek.
