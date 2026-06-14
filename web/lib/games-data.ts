/**
 * Shared data layer for the mini-games.
 *
 * Normalises the F1 snapshot into a flat driver pool with the career stats the
 * games compare on, plus deterministic daily-seed helpers so the "daily" games
 * (Gridle, Guess the Driver) show the same puzzle to everyone on a given day.
 */
import { loadF1, type Driver } from "@/lib/f1";
import { flagEmoji } from "@/lib/format";

export interface GameDriver {
  id: number;        // driver number
  name: string;      // "Max Verstappen"
  code: string;      // VER
  team: string;
  teamColour: string;
  country: string | null;
  flag: string;
  headshot: string | null;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  races: number;
  dnf: number;
  bestFinish: number | null;
}

export interface GamesData {
  drivers: GameDriver[];
  season: number;
}

function toGameDriver(d: Driver): GameDriver {
  const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.fullName;
  return {
    id: d.number,
    name,
    code: d.code,
    team: d.team,
    teamColour: d.teamColour,
    country: d.country,
    flag: flagEmoji(d.country),
    headshot: d.headshot,
    wins: d.stats.wins,
    podiums: d.stats.podiums,
    poles: d.stats.poles,
    points: d.stats.points,
    races: d.stats.races,
    dnf: d.stats.dnf,
    bestFinish: d.stats.bestFinish,
  };
}

let _cache: GamesData | null = null;
export async function loadGamesData(): Promise<GamesData> {
  if (_cache) return _cache;
  const f1 = await loadF1();
  const drivers = f1.drivers
    .map(toGameDriver)
    .filter((d) => d.races >= 1)
    .sort((a, b) => b.points - a.points);
  _cache = { drivers, season: f1.currentSeason };
  return _cache;
}

// ---- deterministic daily helpers ----

/** Days since 2024-01-01 (UTC) — the puzzle index. */
export function dailySeed(salt = 0): number {
  return Math.floor((Date.now() - Date.UTC(2024, 0, 1)) / 86400000) + salt;
}

/** Mulberry32 PRNG — stable for a given seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic pick from a list for "today". */
export function pickDaily<T>(list: T[], salt = 0): T {
  const r = rng(dailySeed(salt) * 2654435761);
  return list[Math.floor(r() * list.length)];
}
