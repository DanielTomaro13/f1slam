/**
 * F1 dataset types + loaders.
 *
 * The static site reads one multi-season snapshot (public/data/f1.json) built by
 * the OpenF1 pipeline. `serverF1()` (lib/serverdata) reads it at build time;
 * `loadF1()` fetches it in the browser for client components / games.
 */

export interface DriverStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  dnf: number;
  bestFinish: number | null;
}

export interface RaceResult {
  season: number;
  round: number | null;
  race: string | null;
  country: string | null;
  countryCode: string | null;
  circuitKey: number | null;
  date: string | null;
  position: number | null;
  points: number;
  dnf: boolean;
}

export interface Driver {
  number: number;
  code: string;
  firstName: string;
  lastName: string;
  fullName: string;
  team: string;
  teamColour: string;
  country: string | null;
  headshot: string | null;
  stats: DriverStats;
  byRace: RaceResult[];
}

export interface DriverStanding { number: number; points: number; position: number }
export interface ConstructorStanding { team: string; points: number; position: number }
export interface SeasonStandings { drivers: DriverStanding[]; constructors: ConstructorStanding[] }

export interface Round {
  round: number;
  meetingKey: number;
  name: string;
  official: string;
  country: string;
  countryCode: string;
  circuit: string;
  circuitKey: number;
  location: string;
  image: string | null;
  date: string;
  raceDate: string;
  sessionKey: number | null;
  winner: string | null;
}

export interface Corner { n: number; x: number; y: number }
export interface Track {
  key: number;
  name: string;
  country: string;
  countryCode: string;
  location: string;
  image: string | null;
  rotation: number;
  x: number[];
  y: number[];
  corners: Corner[];
}

export interface F1Data {
  currentSeason: number;
  seasons: number[];
  generatedAt: string;
  lastRace: { name: string; date: string } | null;
  drivers: Driver[];
  standings: Record<string, SeasonStandings>;
  calendars: Record<string, Round[]>;
  tracks: Record<string, Track>;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let _client: Promise<F1Data> | null = null;
export function loadF1(): Promise<F1Data> {
  if (!_client) {
    _client = fetch(`${BASE}/data/f1.json`, { cache: "force-cache" }).then(
      (r) => r.json() as Promise<F1Data>
    );
  }
  return _client;
}

/** Championship table for a season, joined to driver identities (in order). */
export function driverTable(data: F1Data, season: number | string = data.currentSeason) {
  const byNum = new Map(data.drivers.map((d) => [d.number, d]));
  const s = data.standings[String(season)];
  if (!s) return [];
  return s.drivers.map((row) => ({ ...row, driver: byNum.get(row.number) || null }));
}

export function constructorTable(data: F1Data, season: number | string = data.currentSeason) {
  return data.standings[String(season)]?.constructors ?? [];
}

export function calendar(data: F1Data, season: number | string = data.currentSeason): Round[] {
  return data.calendars[String(season)] ?? [];
}

export function teamColour(data: F1Data, team: string): string {
  return data.drivers.find((d) => d.team === team)?.teamColour || "#7a7a7a";
}

export function trackByKey(data: F1Data, key: number | null | undefined): Track | null {
  if (key == null) return null;
  return data.tracks[String(key)] ?? null;
}
