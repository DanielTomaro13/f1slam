/** Build-time (server) reader for the static F1 snapshot. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { F1Data, RaceRow, RaceArchiveEntry } from "@/lib/f1";

let _cache: F1Data | null = null;
let _hist: Record<string, RaceRow[]> | null = null;
let _races: Record<string, RaceArchiveEntry> | null = null;

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

/** Full race archive, keyed `${season}-${round}` (build-time only — large file). */
function allRaces(): Record<string, RaceArchiveEntry> {
  if (!_races) {
    try {
      _races = JSON.parse(
        readFileSync(join(process.cwd(), "races.json"), "utf8")
      ) as Record<string, RaceArchiveEntry>;
    } catch {
      _races = {};
    }
  }
  return _races;
}

/** Every race classification, newest-first (for the /races index + params). */
export function serverRaces(): RaceArchiveEntry[] {
  return Object.values(allRaces()).sort(
    (a, b) => b.season - a.season || a.round - b.round
  );
}

/** One race classification by season + round. */
export function serverRace(season: number | string, round: number | string): RaceArchiveEntry | null {
  return allRaces()[`${season}-${round}`] ?? null;
}
