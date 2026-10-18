# Independent recomputation of combo numbers from raw Polymarket API data.
import json, sys, urllib.request
H = {"User-Agent": "combo-scanner-verify/1.0", "Accept": "application/json"}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=30) as r:
        return json.load(r)
def book(token):
    b = get(f"https://clob.polymarket.com/book?token_id={token}")
    bids = [(float(x["price"]), float(x["size"])) for x in b.get("bids", [])]
    asks = [(float(x["price"]), float(x["size"])) for x in b.get("asks", [])]
    return max(p for p, _ in bids), min(p for p, _ in asks), b.get("timestamp")
d = json.load(open(sys.argv[1]))
out = []
for n, c in enumerate(d["combos"][:2], 1):
    out.append(f"\n### Combo {n}\n")
    out.append(f"App: kans {c['prob']:.6f}, return {c['ret']:.6f}, EV {c['ev']:.6f}\n")
    out.append("| Leg | Ruwe boeken (bid / ask per token) | Midpoints → genormaliseerd | Eerlijke kans | Ask (eigen token) | Fee-schema | Eff. prijs | App: kans / ask / eff. prijs |")
    out.append("|---|---|---|---|---|---|---|---|")
    prob, price = 1.0, 1.0
    for leg in c["legs"]:
        slug = leg["url"].rsplit("/", 1)[1]
        events = [get(f"https://gamma-api.polymarket.com/events/slug/{slug}")]
        try:
            events.append(get(f"https://gamma-api.polymarket.com/events/slug/{slug}-more-markets"))
        except Exception:
            pass
        tok = leg["id"]
        market = next(m for e in events for m in e["markets"] if tok in json.loads(m["clobTokenIds"]))
        toks = json.loads(market["clobTokenIds"]); outs = json.loads(market["outcomes"])
        idx = toks.index(tok)
        if market["sportsMarketType"] == "moneyline" and outs == ["Yes", "No"]:
            group_markets = sorted([m for m in events[0]["markets"] if m["sportsMarketType"] == "moneyline"], key=lambda m: int(m["groupItemThreshold"]))
            group = [json.loads(m["clobTokenIds"])[0] for m in group_markets]
            names = [m["groupItemTitle"].split(" (")[0] for m in group_markets]
            gi = group.index(toks[0]); complement = idx == 1
        else:
            group = toks; names = outs; gi = idx; complement = False
        quotes = [book(t) for t in group]
        mids = [(b + a) / 2 for b, a, _ in quotes]
        s = sum(mids); norm = [m / s for m in mids]
        fair = 1 - norm[gi] if complement else norm[gi]
        bid, ask, ts = book(tok)
        fs = market.get("feeSchedule") or {}
        rate, e = float(fs.get("rate", 0.05)), float(fs.get("exponent", 1))
        eff = ask + rate * (ask * (1 - ask)) ** e
        prob *= fair; price *= eff
        raw = "<br>".join(f"{nm}: {b:.3f} / {a:.3f}" for nm, (b, a, _) in zip(names, quotes))
        mid = "<br>".join(f"{m:.4f} → {x:.4f}" for m, x in zip(mids, norm))
        fairtxt = f"1 − {norm[gi]:.4f} = **{fair:.4f}**" if complement else f"**{fair:.4f}**"
        out.append(f"| {leg['pickLabel']}<br>{leg['matchTitle']} | {raw} | {mid} | {fairtxt} | {ask:.3f} (bid {bid:.3f}) | {rate} × (p(1−p))^{e:g} | {eff:.6f} | {leg['fairProb']:.4f} / {leg['askPrice']:.3f} / {leg['effPrice']:.6f} |")
    ret = 1 / price
    out.append(f"\nNagerekend: kans = ∏ eerlijke kans = **{prob:.6f}** ({prob*100:.2f}%), return = 1 / ∏ eff. prijs = 1 / {price:.6f} = **{ret:.6f}×**, EV = {prob*ret:.6f} per €1. €10 → €{10*ret:.2f}.")
    out.append(f"App gaf: {c['prob']*100:.2f}% · {c['ret']:.6f}× · EV {c['ev']:.6f}. Verschil kans {abs(prob-c['prob']):.6f}, return {abs(ret-c['ret']):.6f}.")
print("\n".join(out))
