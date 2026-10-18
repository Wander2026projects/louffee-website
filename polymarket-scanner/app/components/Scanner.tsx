"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/config";
import { clock, count, num } from "@/lib/format";
import type { Leg, ScanErrorResponse, ScanResponse } from "@/lib/types";
import { ComboCard } from "./ComboCard";
import { HowItWorks } from "./HowItWorks";
import { SettingsPanel } from "./SettingsPanel";
import { useCombos } from "./useCombos";

const STORAGE_KEY = "combo-scanner-settings-v1";

function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // no storage (private mode): defaults
  }
  return DEFAULT_SETTINGS;
}

type ScanState =
  | { kind: "idle" }
  | { kind: "loading"; previous: ScanResponse | null }
  | { kind: "done"; data: ScanResponse }
  | { kind: "error"; message: string; previous: ScanResponse | null };

export function Scanner() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });

  // Settings live in localStorage, which only exists in the browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSettings(loadSettings()), []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const data = scan.kind === "done" ? scan.data : scan.kind === "idle" ? null : scan.previous;
  const legs: Leg[] | null = data?.legs ?? null;
  const combos = useCombos(legs, settings);

  const sports = useMemo(() => {
    const matches = new Map<string, Set<string>>();
    for (const leg of legs ?? []) {
      const set = matches.get(leg.sport) ?? new Set<string>();
      set.add(leg.matchId);
      matches.set(leg.sport, set);
    }
    return [...matches]
      .map(([name, set]) => ({ name, matches: set.size }))
      .sort((a, b) => (a.name === "Voetbal" ? -1 : b.name === "Voetbal" ? 1 : b.matches - a.matches));
  }, [legs]);

  async function runScan() {
    setScan({ kind: "loading", previous: data });
    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as ScanResponse | ScanErrorResponse | null;
      if (!body) throw new Error(`De server gaf een onleesbaar antwoord (HTTP ${res.status}).`);
      if (!body.ok) throw new Error(body.error);
      setScan({ kind: "done", data: body });
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Kan de server niet bereiken. Controleer je internetverbinding en probeer het opnieuw."
          : err instanceof Error
            ? err.message
            : String(err);
      setScan({ kind: "error", message, previous: data });
    }
  }

  const list = combos.result?.combos ?? [];
  const loading = scan.kind === "loading";

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
        <button
          type="button"
          onClick={runScan}
          disabled={loading}
          className="rounded-2xl bg-indigo-600 px-10 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Scannen…" : "Scan"}
        </button>
        <div className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
          {loading && "Wedstrijden en orderboeken ophalen… (± 10 seconden)"}
          {!loading && data && (
            <>
              Gescand om {clock(data.stats.scannedAt)} · {count(data.stats.matches)} wedstrijden · {count(data.stats.markets)}{" "}
              markten · {count(data.stats.legs)} legs
            </>
          )}
          {!loading && !data && scan.kind !== "error" && "Haal de wedstrijden van de komende 48 uur op."}
        </div>
      </section>

      {scan.kind === "error" && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <div className="font-semibold">Scannen mislukt</div>
          <div>{scan.message}</div>
          {scan.previous && <div className="mt-1 text-red-700 dark:text-red-300">Hieronder staan de resultaten van de vorige scan.</div>}
        </div>
      )}

      <SettingsPanel settings={settings} onChange={setSettings} sports={sports} />

      {data && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {list.length > 0 ? `${list.length} combos, hoogste kans eerst` : "Resultaten"}
            </h2>
            <div className="text-xs text-zinc-500">
              {combos.busy ? "Berekenen…" : `${count(combos.filteredLegs)} legs na filters · ${num(combos.ms, 0)} ms`}
            </div>
          </div>

          {!combos.busy && combos.result && list.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {combos.filteredLegs === 0 ? (
                <>Geen legs over na de filters. Kies meer sporten of markttypes, of verlaag de minimale liquiditeit.</>
              ) : (
                <>
                  Geen combos met minimaal {num(settings.minReturn, 2)}× return. Verlaag de minimale return of verhoog het max.
                  aantal legs.
                </>
              )}
            </div>
          )}

          <div className={`space-y-4 transition-opacity ${combos.busy ? "opacity-60" : ""}`}>
            {list.map((c, i) => (
              <ComboCard key={c.legs.map((l) => l.id).join("|")} combo={c} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      <HowItWorks />
    </div>
  );
}
