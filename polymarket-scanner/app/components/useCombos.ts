"use client";

import { useEffect, useRef, useState } from "react";
import { filterLegs, findBestCombos, type OptimizerResult } from "@/lib/combos";
import type { Settings } from "@/lib/config";
import type { WorkerRequest, WorkerResponse } from "@/lib/combo.worker";
import type { Leg } from "@/lib/types";

export type ComboState = {
  result: OptimizerResult | null;
  filteredLegs: number;
  busy: boolean;
  ms: number;
};

const EMPTY: ComboState = { result: null, filteredLegs: 0, busy: false, ms: 0 };

function runHere(legs: Leg[], settings: Settings): WorkerResponse {
  const t0 = performance.now();
  const filtered = filterLegs(legs, settings);
  return { id: 0, result: findBestCombos(filtered, settings), filteredLegs: filtered.length, ms: performance.now() - t0 };
}

/**
 * Recomputes the combos whenever legs or settings change, in a Web Worker.
 * While a run is busy, only the newest settings are queued (no backlog).
 */
export function useCombos(legs: Leg[] | null, settings: Settings): ComboState {
  const [state, setState] = useState<ComboState>({ result: null, filteredLegs: 0, busy: false, ms: 0 });
  const worker = useRef<Worker | null>(null);
  const busy = useRef(false);
  const pending = useRef<Settings | null>(null);
  const runId = useRef(0);
  const legsRef = useRef<Leg[] | null>(null);
  const latest = useRef<{ legs: Leg[] | null; settings: Settings }>({ legs, settings });
  latest.current = { legs, settings };

  // Start the worker once; fall back to the main thread if that fails.
  useEffect(() => {
    try {
      legsRef.current = null; // a new worker has no legs yet
      const w = new Worker(new URL("../../lib/combo.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        busy.current = false;
        if (pending.current) {
          const next = pending.current;
          pending.current = null;
          send(next);
        }
        if (e.data.id === runId.current) {
          setState({ result: e.data.result, filteredLegs: e.data.filteredLegs, busy: busy.current, ms: e.data.ms });
        }
      };
      w.onerror = () => {
        worker.current = null;
        busy.current = false;
        pending.current = null;
        const { legs: l, settings: s } = latest.current;
        if (l) {
          const r = runHere(l, s);
          setState({ result: r.result, filteredLegs: r.filteredLegs, busy: false, ms: r.ms });
        }
      };
      worker.current = w;
    } catch {
      worker.current = null;
    }
    return () => worker.current?.terminate();
  }, []);

  function send(s: Settings) {
    const w = worker.current;
    if (!w) return;
    busy.current = true;
    runId.current += 1;
    w.postMessage({ kind: "run", id: runId.current, settings: s } satisfies WorkerRequest);
  }

  useEffect(() => {
    if (!legs) return;
    const w = worker.current;
    if (!w) {
      // No worker available: compute on the main thread, after this render.
      const timer = setTimeout(() => {
        const r = runHere(legs, settings);
        setState({ result: r.result, filteredLegs: r.filteredLegs, busy: false, ms: r.ms });
      }, 0);
      return () => clearTimeout(timer);
    }
    if (legsRef.current !== legs) {
      legsRef.current = legs;
      w.postMessage({ kind: "legs", legs } satisfies WorkerRequest);
    }
    setState((s) => ({ ...s, busy: true }));
    if (busy.current) pending.current = settings;
    else send(settings);
  }, [legs, settings]);

  return legs ? state : EMPTY;
}
