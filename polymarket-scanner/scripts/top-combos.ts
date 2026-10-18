// Writes the top combos of a saved scan (default settings) to a JSON file,
// as input for scripts/verify_combos.py.
// Usage: npm run top-combos -- scan.json combos.json
import { readFileSync, writeFileSync } from "node:fs";
import { filterLegs, findBestCombos } from "../lib/combos";
import { DEFAULT_SETTINGS } from "../lib/config";
import type { ScanResponse } from "../lib/types";

const [input = "scan.json", output = "combos.json"] = process.argv.slice(2);
const scan = JSON.parse(readFileSync(input, "utf8")) as ScanResponse;
const legs = filterLegs(scan.legs, DEFAULT_SETTINGS);
const { combos } = findBestCombos(legs, DEFAULT_SETTINGS);
writeFileSync(output, JSON.stringify({ scannedAt: scan.stats.scannedAt, combos: combos.slice(0, 5) }, null, 1));
console.log(`${combos.length} combos; top 5 written to ${output}`);
