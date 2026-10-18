# Handmatige controle van 2 combos

Gecontroleerd op **18 oktober 2026, 23:33 (Amsterdamse tijd)**. Dit is direct na een scan; het tijdstip van de scan stond op 21:32:58 UTC.

## Werkwijze

1. Ik draaide een scan via `GET /api/scan` en zette de optimizer aan op de standaardinstellingen:
   - alleen voetbal en alle markttypes;
   - minimaal 2× return en 2–5 legs;
   - minstens $500 liquiditeit en hoogstens 4¢ spread.
2. Daarna rekende `scripts/verify_combos.py` de nummers 1 en 2 **los van de app-code** opnieuw uit. Het script gebruikt alleen ruwe API-data:
   - per leg het Gamma-event (`/events/slug/...`, plus `-more-markets`), om de markt en de bij elkaar horende uitkomsten te vinden;
   - per token het ruwe orderboek (`GET https://clob.polymarket.com/book?token_id=...`), waaruit het de beste bid (hoogste) en de beste ask (laagste) haalt;
   - eerlijke kans = midpoint (bid + ask) / 2, genormaliseerd over de uitkomsten die elkaar uitsluiten. Thuis/gelijk/uit vormen zo'n groep, net als over/under op dezelfde lijn;
   - effectieve prijs = ask + rate × ask × (1 − ask), met de `feeSchedule` van de markt;
   - kans = ∏ eerlijke kans, return = 1 / ∏ effectieve prijs, EV = kans × return.

## Resultaat

Beide combos kloppen tot op 6 decimalen met wat de site toont.

### Combo 1

App: kans 0.488182, return 2.000326, EV 0.976524

| Leg | Ruwe boeken (bid / ask per token) | Midpoints → genormaliseerd | Eerlijke kans | Ask (eigen token) | Fee-schema | Eff. prijs | App: kans / ask / eff. prijs |
|---|---|---|---|---|---|---|---|
| Under 6,5 goals<br>Parma Calcio 1913 – Torino FC | Over: 0.007 / 0.012<br>Under: 0.988 / 0.993 | 0.0095 → 0.0095<br>0.9905 → 0.9905 | **0.9905** | 0.993 (bid 0.988) | 0.05 × (p(1−p))^1 | 0.993348 | 0.9905 / 0.993 / 0.993348 |
| Antigua GFC wint (90 min)<br>Antigua GFC – CSD Xelajú MC | Antigua GFC: 0.530 / 0.550<br>Draw: 0.230 / 0.260<br>CSD Xelajú MC: 0.170 / 0.210 | 0.5400 → 0.5538<br>0.2450 → 0.2513<br>0.1900 → 0.1949 | **0.5538** | 0.550 (bid 0.530) | 0.05 × (p(1−p))^1 | 0.562375 | 0.5538 / 0.550 / 0.562375 |
| Manchester City FC wint (90 min)<br>Manchester City FC – AEK | Manchester City FC: 0.880 / 0.890<br>Draw: 0.070 / 0.080<br>AEK: 0.034 / 0.035 | 0.8850 → 0.8899<br>0.0750 → 0.0754<br>0.0345 → 0.0347 | **0.8899** | 0.890 (bid 0.880) | 0.05 × (p(1−p))^1 | 0.894895 | 0.8899 / 0.890 / 0.894895 |

Nagerekend: kans = ∏ eerlijke kans = **0.488182** (48.82%), return = 1 / ∏ eff. prijs = 1 / 0.499919 = **2.000326×**, EV = 0.976524 per €1. €10 → €20.00.
App gaf: 48.82% · 2.000326× · EV 0.976524. Verschil kans 0.000000, return 0.000000.

### Combo 2

App: kans 0.487284, return 2.000008, EV 0.974571

| Leg | Ruwe boeken (bid / ask per token) | Midpoints → genormaliseerd | Eerlijke kans | Ask (eigen token) | Fee-schema | Eff. prijs | App: kans / ask / eff. prijs |
|---|---|---|---|---|---|---|---|
| FC RFS wint (90 min)<br>FC RFS – FK Tukums 2000/TSS | FC RFS: 0.890 / 0.900<br>Draw: 0.060 / 0.080<br>FK Tukums 2000/TSS: 0.026 / 0.034 | 0.8950 → 0.8995<br>0.0700 → 0.0704<br>0.0300 → 0.0302 | **0.8995** | 0.900 (bid 0.890) | 0.05 × (p(1−p))^1 | 0.904500 | 0.8995 / 0.900 / 0.904500 |
| Under 7,5 goals<br>Parma Calcio 1913 – Torino FC | Over: 0.003 / 0.007<br>Under: 0.993 / 0.997 | 0.0050 → 0.0050<br>0.9950 → 0.9950 | **0.9950** | 0.997 (bid 0.993) | 0.05 × (p(1−p))^1 | 0.997150 | 0.9950 / 0.997 / 0.997150 |
| Under 7,5 goals<br>Getafe CF – Rayo Vallecano de Madrid | Over: 0.002 / 0.003<br>Under: 0.997 / 0.998 | 0.0025 → 0.0025<br>0.9975 → 0.9975 | **0.9975** | 0.998 (bid 0.997) | 0.05 × (p(1−p))^1 | 0.998100 | 0.9975 / 0.998 / 0.998100 |
| Under 7,5 goals<br>Tottenham Hotspur FC – Coventry City FC | Over: 0.013 / 0.016<br>Under: 0.984 / 0.987 | 0.0145 → 0.0145<br>0.9855 → 0.9855 | **0.9855** | 0.987 (bid 0.984) | 0.05 × (p(1−p))^1 | 0.987642 | 0.9855 / 0.987 / 0.987642 |
| Antigua GFC wint (90 min)<br>Antigua GFC – CSD Xelajú MC | Antigua GFC: 0.530 / 0.550<br>Draw: 0.230 / 0.260<br>CSD Xelajú MC: 0.170 / 0.210 | 0.5400 → 0.5538<br>0.2450 → 0.2513<br>0.1900 → 0.1949 | **0.5538** | 0.550 (bid 0.530) | 0.05 × (p(1−p))^1 | 0.562375 | 0.5538 / 0.550 / 0.562375 |

Nagerekend: kans = ∏ eerlijke kans = **0.487284** (48.73%), return = 1 / ∏ eff. prijs = 1 / 0.499998 = **2.000008×**, EV = 0.974571 per €1. €10 → €20.00.
App gaf: 48.73% · 2.000008× · EV 0.974571. Verschil kans 0.000000, return 0.000000.

## Wat opvalt

- **Vulling-legs.** Combo 2 haalt precies 2,00× door drie "Under 7,5 goals"-legs van 98,6 tot 99,8% toe te voegen. Dat is volgens de regels de hoogste kans bij minstens 2× return:
  - elke leg kost bijna niets aan kans;
  - de return stijgt per leg net genoeg om de drempel te halen.

  In de praktijk betekenen zulke legs wel extra fees en extra orders. **Daarom heeft de site nu de instelling "Max. kans per leg" (standaard 80%), die zulke opvul-legs weglaat.** De controle hierboven is gedaan vóór die instelling bestond, met de toenmalige standaard (geen limiet). De rekenregels zijn niet veranderd.
- **Wat de app niet meerekent.** Polymarkets eigen Combo-functie (RFQ) en het doorlopen van meerdere prijsniveaus bij grote inzetten zitten niet in deze getallen (zie "Hoe werkt dit?" op de site).

## Zelf opnieuw doen

Hiervoor is Python 3 nodig:

```powershell
# 1. Sla een scan op terwijl npm run dev draait
Invoke-WebRequest http://localhost:3000/api/scan -OutFile scan.json
# 2. Schrijf de top-5 combos (standaardinstellingen) weg
npm run top-combos -- scan.json combos.json
# 3. Reken de eerste twee na met de ruwe orderboeken
python scripts/verify_combos.py combos.json
```
