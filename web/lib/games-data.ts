/**
 * Shared data layer for the mini-games.
 *
 * Exposes three pools drawn from the full-history snapshot:
 *   • players       — every driver with career totals (guess / compare games)
 *   • driverSeasons — a driver tied to a single year + that year's rating (spins)
 *   • carSeasons    — a constructor tied to a single year + strength (car spin)
 */
import { loadF1 } from "@/lib/f1";
import { flagEmoji } from "@/lib/format";

export interface GameDriver {
  id: string;
  name: string;
  code: string;
  flag: string;
  country: string | null;
  headshot: string | null;
  team: string;          // latest team
  teamColour: string;
  championships: number;
  wins: number;
  poles: number;
  podiums: number;
  points: number;
  seasons: number;
  firstYear: number;
  lastYear: number;
}

export interface SeasonPick {
  key: string;
  driverId: string;
  name: string;
  code: string;
  flag: string;
  headshot: string | null;
  year: string;
  team: string;
  teamColour: string;
  rating: number;
  wins: number;
  points: number;
  poles: number;
  podiums: number;
  position: number;
  avgFinish: number | null;
  tmR: string | null; // race head-to-head vs team-mate "W-L"
}

export interface CarPick {
  key: string;
  id: string;
  name: string;
  colour: string;
  flag: string;
  year: string;
  strength: number;
  wins: number;
  points: number;
  position: number;
}

export interface GamesData {
  players: GameDriver[];
  driverSeasons: SeasonPick[];
  carSeasons: CarPick[];
  seasons: number[];
}

let _cache: GamesData | null = null;
export async function loadGamesData(): Promise<GamesData> {
  if (_cache) return _cache;
  const f1 = await loadF1();

  const players: GameDriver[] = f1.drivers.map((d) => ({
    id: d.id, name: d.name, code: d.code, flag: d.flag, country: d.country, headshot: d.headshot,
    team: d.latestTeam, teamColour: d.latestTeamColour, championships: d.career.championships, wins: d.career.wins, poles: d.career.poles,
    podiums: d.career.podiums, points: d.career.points, seasons: d.career.seasons, firstYear: d.career.firstYear, lastYear: d.career.lastYear,
  }));

  // driver-seasons: any season where the driver was a genuine competitor
  const driverSeasons: SeasonPick[] = [];
  for (const d of f1.drivers) {
    for (const s of d.bySeason) {
      if (s.points <= 0 && s.position > 16) continue; // skip non-scoring backmarkers
      driverSeasons.push({
        key: `${d.id}-${s.year}`, driverId: d.id, name: d.name, code: d.code, flag: d.flag, headshot: d.headshot,
        year: s.year, team: s.team, teamColour: s.teamColour, rating: s.rating, wins: s.wins, points: s.points, poles: s.poles,
        podiums: s.podiums, position: s.position, avgFinish: s.avgFinish ?? null, tmR: s.tmR ?? null,
      });
    }
  }

  // constructor-seasons: any season the team scored
  const carSeasons: CarPick[] = [];
  for (const c of f1.constructors) {
    for (const s of c.bySeason) {
      if (s.points <= 0 && s.position > 12) continue;
      carSeasons.push({
        key: `${c.id}-${s.year}`, id: c.id, name: c.name, colour: c.colour, flag: c.flag,
        year: s.year, strength: s.strength, wins: s.wins, points: s.points, position: s.position,
      });
    }
  }

  _cache = { players, driverSeasons, carSeasons, seasons: f1.seasons };
  return _cache;
}

// re-export flag for convenience
export { flagEmoji };

// ---- deterministic daily helpers ----
export function dailySeed(salt = 0): number {
  return Math.floor((Date.now() - Date.UTC(2024, 0, 1)) / 86400000) + salt;
}
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
