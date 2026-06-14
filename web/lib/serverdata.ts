/** Build-time (server) reader for the static F1 snapshot. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { F1Data, RaceRow } from "@/lib/f1";

let _cache: F1Data | null = null;
let _hist: Record<string, RaceRow[]> | null = null;

export function serverF1(): F1Data {
  if (!_cache) {
    _cache = JSON.parse(
      readFileSync(join(process.cwd(), "public", "data", "f1.json"), "utf8")
    ) as F1Data;
  }
  return _cache;
}

/** Race-by-race history for one driver (read at build time only — large file). */
export function serverHistory(driverId: string): RaceRow[] {
  if (!_hist) {
    try {
      _hist = JSON.parse(
        readFileSync(join(process.cwd(), "history.json"), "utf8")
      ) as Record<string, RaceRow[]>;
    } catch {
      _hist = {};
    }
  }
  return _hist[driverId] ?? [];
}
