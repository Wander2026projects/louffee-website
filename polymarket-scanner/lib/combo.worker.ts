// Runs the optimizer off the main thread so the sliders stay smooth.
import { filterLegs, findBestCombos, type OptimizerResult } from "./combos";
import type { Settings } from "./config";
import type { Leg } from "./types";

export type WorkerRequest = { kind: "legs"; legs: Leg[] } | { kind: "run"; id: number; settings: Settings };

export type WorkerResponse = {
  id: number;
  result: OptimizerResult;
  filteredLegs: number;
  ms: number;
};

let legs: Leg[] = [];

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.kind === "legs") {
    legs = msg.legs;
    return;
  }
  const t0 = performance.now();
  const filtered = filterLegs(legs, msg.settings);
  const result = findBestCombos(filtered, msg.settings);
  const reply: WorkerResponse = { id: msg.id, result, filteredLegs: filtered.length, ms: performance.now() - t0 };
  (self as unknown as Worker).postMessage(reply);
};
