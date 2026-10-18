export function HowItWorks() {
  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer list-none font-semibold text-zinc-900 select-none dark:text-zinc-100">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
        Hoe werkt dit?
      </summary>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>
          De site haalt alle sportwedstrijden op Polymarket op die in de komende 48 uur beginnen. Per wedstrijd neemt hij de
          uitslag, dubbele kans (de &quot;Nee&quot;-kant van een uitslag), over/under op elke lijn en beide teams scoren
          (voetbal). Daaruit zoekt hij combinaties van 2 tot 5 legs met minstens de ingestelde return, en zet die met de
          hoogste slagingskans bovenaan.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>De kans is een schatting van de markt, geen garantie.</strong> Hij komt uit het midden tussen bod en
            vraag (de midpoint), herschaald zodat thuis, gelijk en uit samen precies 100% zijn.
          </li>
          <li>
            <strong>Op Polymarket hangen kans en return aan elkaar vast.</strong> Een share van 0,60 betaalt 1 uit, dus ongeveer
            1,67×. Een hoge return én een hoge kans tegelijk bestaat alleen als de markt ernaast zit.
          </li>
          <li>
            <strong>De EV ligt bijna altijd onder €1 per €1.</strong> Je koopt tegen de vraagprijs (boven het midden) en betaalt
            een taker-fee (bij sport 5% × p × (1 − p) per share). Elke extra leg kost dus geld. Daarom staan combos met weinig legs
            en kleine spreads bovenaan.
          </li>
          <li>
            <strong>De return op deze site is theoretisch.</strong> Hij gaat ervan uit dat je elke leg los koopt tegen de beste
            vraagprijs. Polymarkets eigen Combo-functie prijst via market makers (RFQ); de echte prijs is meestal lager dan de
            return die je hier ziet. Grote inzetten schuiven bovendien door het orderboek.
          </li>
          <li>
            <strong>Maximaal 1 leg per wedstrijd</strong>, omdat uitkomsten binnen één wedstrijd samenhangen (een thuiszege en
            &quot;over 2,5&quot; zijn niet onafhankelijk). Dan klopt vermenigvuldigen van kansen niet meer.
          </li>
          <li>
            Voetbaluitslagen gaan over <strong>90 minuten plus blessuretijd</strong>, ook in bekerwedstrijden. Bij ijshockey,
            basketbal en American football telt de verlenging mee; bij tennis wint wie doorgaat.
          </li>
          <li>
            <strong>Max. kans per leg</strong> (standaard 80%): legs met een hogere kans laat de scanner weg. Een leg van 97%
            verhoogt de return nauwelijks, maar kost wel spread en fees en maakt de combo alleen maar langer.
          </li>
          <li>Dezelfde leg staat in maximaal 3 combos, anders lijken alle resultaten op elkaar.</li>
        </ul>
      </div>
    </details>
  );
}
