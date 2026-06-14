/**
 * F1 dataset types + loaders.
 *
 * The static site reads one snapshot (public/data/f1.json) produced by the
 * OpenF1 pipeline. `serverF1()` reads it at build time (server components);
 * `loadF1()` fetches it in the browser (client components / games).
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

export interface Driver {
  number: number;
  code: string;          // 3-letter acronym, e.g. VER
  firstName: string;
  lastName: string;
  fullName: string;
  team: string;
  teamColour: string;    // hex incl. '#'
  country: string | null; // ISO-3 code from OpenF1, e.g. NED
  headshot: string | null;
  stats: DriverStats;
}

export interface DriverStanding {
  number: number;
  points: number;
  position: number;
}

export interface ConstructorStanding {
  team: string;
  points: number;
  position: number;
}

export interface Round {
  round: number;
  meetingKey: number;
  name: string;
  official: string;
  country: string;
  countryCode: string;
  circuit: string;
  location: string;
  date: string;        // weekend start
  raceDate: string;    // race session start
  sessionKey: number | null;
  winner: string | null; // winning driver's 3-letter code, or null if unraced
}

export interface F1Data {
  season: number;
  generatedAt: string;
  lastRace: { name: string; date: string } | null;
  drivers: Driver[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  calendar: Round[];
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

/** Join the championship standings to driver identities, in order. */
export function driverTable(data: F1Data) {
  const byNum = new Map(data.drivers.map((d) => [d.number, d]));
  return data.driverStandings.map((s) => ({
    ...s,
    driver: byNum.get(s.number) || null,
  }));
}

/** Team colour by team name, from the driver pool (fallback grey). */
export function teamColour(data: F1Data, team: string): string {
  return data.drivers.find((d) => d.team === team)?.teamColour || "#7a7a7a";
}
