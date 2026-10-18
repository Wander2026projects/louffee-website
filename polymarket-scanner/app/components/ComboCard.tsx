import type { Combo } from "@/lib/combos";
import { cents, euro, kickoff, pct, price, times, usd } from "@/lib/format";

const STAKE = 10;

export function ComboCard({ combo, rank }: { combo: Combo; rank: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 p-4 sm:p-5">
        <div className="mr-auto flex items-baseline gap-3">
          <span className="text-sm font-medium text-zinc-500 tabular-nums dark:text-zinc-400">#{rank}</span>
          <div>
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Kans</div>
            <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{pct(combo.prob)}</div>
          </div>
          <div className="ml-4">
            <div className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Return</div>
            <div className="text-3xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{times(combo.ret)}</div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Stat label="Inzet" value={`${euro(STAKE)} → ${euro(STAKE * combo.ret)}`} />
          <Stat label="EV" value={`${euro(combo.ev)} per €1`} />
          <Stat label="Legs" value={String(combo.legs.length)} />
          <Stat label="Eerste aftrap" value={kickoff(combo.firstKickoff)} />
        </dl>
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto border-t border-zinc-100 md:block dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-950/40 dark:text-zinc-400">
            <tr>
              <Th>Sport</Th>
              <Th>Competitie</Th>
              <Th>Wedstrijd</Th>
              <Th>Aftrap</Th>
              <Th>Keuze</Th>
              <Th right>Kans</Th>
              <Th right>Prijs</Th>
              <Th right>Spread</Th>
              <Th right>Liquiditeit</Th>
              <Th>
                <span className="sr-only">Link</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {combo.legs.map((leg) => (
              <tr key={leg.id} className="align-top">
                <Td muted>{leg.sport}</Td>
                <Td muted>{leg.competition}</Td>
                <Td>{leg.matchTitle}</Td>
                <Td nowrap>{kickoff(leg.kickoff)}</Td>
                <Td strong>{leg.pickLabel}</Td>
                <Td right>{pct(leg.fairProb)}</Td>
                <Td right>
                  <span title={`Beste ask ${price(leg.askPrice)}, incl. fee ${price(leg.effPrice)}`}>
                    {price(leg.effPrice)}
                  </span>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">ask {price(leg.askPrice)}</div>
                </Td>
                <Td right>{cents(leg.spread)}</Td>
                <Td right>{usd(leg.liquidity)}</Td>
                <Td>
                  <a
                    href={leg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Polymarket ↗
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked legs */}
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100 md:hidden dark:divide-zinc-800 dark:border-zinc-800">
        {combo.legs.map((leg) => (
          <li key={leg.id} className="px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{leg.pickLabel}</div>
                <div className="text-zinc-700 dark:text-zinc-300">{leg.matchTitle}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {leg.sport} · {leg.competition} · {kickoff(leg.kickoff)}
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <div className="font-semibold">{pct(leg.fairProb)}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">prijs {price(leg.effPrice)}</div>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>ask {price(leg.askPrice)}</span>
              <span>spread {cents(leg.spread)}</span>
              <span>liq. {usd(leg.liquidity)}</span>
              <a href={leg.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400">
                Polymarket ↗
              </a>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 font-medium ${right ? "text-right" : ""}`}>{children}</th>;
}

function Td({
  children,
  right,
  muted,
  strong,
  nowrap,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
  strong?: boolean;
  nowrap?: boolean;
}) {
  const cls = [
    "px-3 py-2",
    right ? "text-right tabular-nums whitespace-nowrap" : "",
    muted ? "text-zinc-500 dark:text-zinc-400" : "",
    strong ? "font-semibold text-zinc-900 dark:text-zinc-100" : "",
    nowrap ? "whitespace-nowrap" : "",
  ].join(" ");
  return <td className={cls}>{children}</td>;
}
