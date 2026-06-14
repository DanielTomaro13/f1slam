/**
 * F1 season simulation engine.
 *
 * Powers two games: a one-shot Season Simulator (pick 2 drivers + build a car,
 * simulate a season) and an enhanced Career mode (budget, upgrades, events,
 * race-by-race). Ratings are derived from real OpenF1 career stats.
 */
import type { GameDriver } from "@/lib/games-data";

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
export const FASTEST_LAP_BONUS = 1;

export interface Entry {
  id: string;
  name: string;
  code: string;
  team: string;
  colour: string;
  driver: number; // driver skill 0..100
  car: number;    // car performance 0..100
  reliability: number; // 0..1 (higher = fewer DNFs)
  isPlayer: boolean;
  flag: string;
  headshot: string | null;
}

export interface CarBuild {
  chassis: number; // 0..1
  engine: number;
  aero: number;
  reliability: number;
}

/** Driver skill 0..100 from full-career totals (used by Career mode). */
export function careerRating(d: GameDriver): number {
  const raw =
    58 +
    d.championships * 4 +
    Math.min(22, d.wins * 0.45) +
    Math.min(8, d.poles * 0.2) +
    Math.min(8, d.points / 600) +
    Math.min(4, d.seasons / 4);
  return Math.round(Math.min(99, Math.max(54, raw)));
}

export function carPerf(b: CarBuild): number {
  return Math.round((b.chassis * 0.34 + b.engine * 0.36 + b.aero * 0.3) * 100);
}

// ---- seeded RNG ----
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Gaussian-ish noise via summed uniforms
function noise(rng: () => number, spread: number): number {
  return ((rng() + rng() + rng()) / 3 - 0.5) * 2 * spread;
}

export interface RaceResult {
  order: Entry[];               // finishing order (DNFs at the back)
  dnf: Set<string>;             // entry ids that retired
  fastestLap: string | null;    // entry id
  points: Map<string, number>;  // entry id -> points scored
}

/** Simulate a single race. `chaos` 0..1 raises variance (street circuits, weather). */
export function simulateRace(entries: Entry[], rng: () => number, chaos = 0.35): RaceResult {
  const dnf = new Set<string>();
  const scored: { e: Entry; pace: number }[] = [];
  for (const e of entries) {
    // base pace: driver + car, with race-day variance
    const base = e.driver * 0.46 + e.car * 0.54;
    const pace = base + noise(rng, 6 + chaos * 16);
    // reliability check
    if (rng() > e.reliability - chaos * 0.08) {
      // small chance of mechanical / incident DNF
      if (rng() < 0.10 + (1 - e.reliability) * 0.5 + chaos * 0.12) {
        dnf.add(e.id);
        continue;
      }
    }
    scored.push({ e, pace });
  }
  scored.sort((a, b) => b.pace - a.pace);
  const order = [...scored.map((s) => s.e), ...entries.filter((e) => dnf.has(e.id))];

  const points = new Map<string, number>();
  scored.forEach((s, i) => { if (i < POINTS.length) points.set(s.e.id, POINTS[i]); });
  // fastest lap: usually a front-runner, weighted by pace
  const flPool = scored.slice(0, 6);
  const fl = flPool.length ? flPool[Math.floor(rng() * flPool.length)].e.id : null;
  if (fl != null && (points.get(fl) ?? 0) > 0) points.set(fl, (points.get(fl) ?? 0) + FASTEST_LAP_BONUS);

  return { order, dnf, fastestLap: fl, points };
}

export interface SeasonStanding { entry: Entry; points: number; wins: number; podiums: number }

/** Run a full season over `rounds` races. Returns final driver + team tables. */
export function simulateSeason(entries: Entry[], rounds: number, seed: number, chaosByRound?: number[]) {
  const rng = mulberry32(seed);
  const tally = new Map<string, SeasonStanding>();
  for (const e of entries) tally.set(e.id, { entry: e, points: 0, wins: 0, podiums: 0 });
  const raceLog: RaceResult[] = [];

  for (let r = 0; r < rounds; r++) {
    const res = simulateRace(entries, rng, chaosByRound?.[r] ?? 0.35);
    raceLog.push(res);
    res.points.forEach((pts, id) => { tally.get(id)!.points += pts; });
    res.order.slice(0, 3).forEach((e, i) => {
      if (res.dnf.has(e.id)) return;
      tally.get(e.id)!.podiums++;
      if (i === 0) tally.get(e.id)!.wins++;
    });
  }

  const drivers = [...tally.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);

  const teams = new Map<string, { team: string; colour: string; points: number }>();
  for (const s of drivers) {
    const t = teams.get(s.entry.team) || { team: s.entry.team, colour: s.entry.colour, points: 0 };
    t.points += s.points;
    teams.set(s.entry.team, t);
  }
  const constructors = [...teams.values()].sort((a, b) => b.points - a.points);

  return { drivers, constructors, raceLog };
}
