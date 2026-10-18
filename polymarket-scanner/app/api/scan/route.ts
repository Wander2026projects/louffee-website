import { connection } from "next/server";
import { SCAN } from "@/lib/config";
import { PolymarketError, scan } from "@/lib/polymarket";
import type { ScanErrorResponse, ScanResponse } from "@/lib/types";

export const maxDuration = 60;

// One scan at a time, reused for SCAN.cacheSeconds (per server instance).
let cached: { at: number; data: ScanResponse } | null = null;
let running: Promise<ScanResponse> | null = null;

async function getScan(): Promise<ScanResponse> {
  if (cached && Date.now() - cached.at < SCAN.cacheSeconds * 1000) return cached.data;
  if (!running) {
    running = scan()
      .then((data) => {
        cached = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        running = null;
      });
  }
  return running;
}

export async function GET() {
  await connection(); // always run at request time, never at build time
  try {
    const data = await getScan();
    const age = cached ? Math.floor((Date.now() - cached.at) / 1000) : 0;
    return Response.json(data, {
      headers: { "Cache-Control": `public, max-age=0, s-maxage=${Math.max(0, SCAN.cacheSeconds - age)}` },
    });
  } catch (err) {
    console.error("[scan] failed:", err);
    const detail = err instanceof PolymarketError ? err.message : "onbekende fout";
    const body: ScanErrorResponse = {
      ok: false,
      error: `De Polymarket-API is niet bereikbaar (${detail}). Probeer het over een minuut opnieuw.`,
    };
    return Response.json(body, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
