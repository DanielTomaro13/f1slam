/**
 * F1 dataset types + loaders.
 *
 * Full-history snapshot (public/data/f1.json) built from Jolpica/Ergast (1950→)
 * plus OpenF1/MultiViewer current-era track maps & headshots. `serverF1()`
 * (lib/serverdata) reads it at build time; `loadF1()` fetches it client-side.
 */

export interface DriverSeason {
  year: string;
  team: string;
  teamColour: string;
  points: number;
  wins: number;
  poles: number;
  position: number;
  rating: number; // 0..100 strength that season (used by the games)
}

export interface DriverCareer {
  seasons: number;
  wins: number;
  poles: number;
  points: number;
  championships: number;
  bestPos: number;
  firstYear: number;
  lastYear: number;
}

export interface Driver {
  id: string;            // ergast driverId, e.g. "max_verstappen"
  code: string;
  first: string;
  last: string;
  name: string;
  nationality: string;
  country: string | null; // ISO-3
  flag: string;
  headshot: string | null;
  latestTeam: string;
  latestTeamColour: string;
  career: DriverCareer;
  bySeason: DriverSeason[]; // newest first
}

export interface ConstructorSeason { year: string; points: number; wins: number; position: number; strength: number }
export interface Constructor {
  id: string;
  name: string;
  colour: string;
  nationality: string;
  country: string | null;
  flag: string;
  career: { seasons: number; wins: number; points: number; championships: number; bestPos: number; lastYear: number; bestStrength: number };
  bySeason: ConstructorSeason[];
}

export interface DriverStandingRow {
  driverId: string; code: string; name: string; flag: string;
  team: string; teamColour: string; points: number; wins: number; position: number;
}
export interface ConstructorStandingRow {
  id: string; name: string; colour: string; points: number; wins: number; position: number; strength: number;
}
export interface SeasonStandings { drivers: DriverStandingRow[]; constructors: ConstructorStandingRow[] }

export interface Round {
  round: number;
  name: string;
  country: string;
  countryCode: string | null;
  circuit: string;
  circuitId: string | null;
  circuitKey: number | null;
  location: string;
  date: string | null;
  raceDate: string | null;
  winner: string | null;      // 3-letter code
  winnerName: string | null;
  image?: string | null;
}

export interface Corner { n: number; x: number; y: number }
export interface Track {
  key: number; name: string; country: string; countryCode: string | null; location: string;
  image: string | null; rotation: number; x: number[]; y: number[]; corners: Corner[];
}

export interface F1Data {
  currentSeason: number;
  seasons: number[];           // newest first
  generatedAt: string;
  lastRace: { name: string; date: string } | null;
  drivers: Driver[];
  constructors: Constructor[];
  standings: Record<string, SeasonStandings>;
  calendars: Record<string, Round[]>;
  tracks: Record<string, Track>;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let _client: Promise<F1Data> | null = null;
export function loadF1(): Promise<F1Data> {
  // Revalidate against the server (cheap 304s) so the weekly data refresh is
  // picked up — force-cache would pin returning visitors to a stale snapshot.
  if (!_client) _client = fetch(`${BASE}/data/f1.json`, { cache: "no-cache" }).then((r) => r.json() as Promise<F1Data>);
  return _client;
}

export const driverHref = (idOrDriver: string | { id: string }) =>
  `/drivers/${typeof idOrDriver === "string" ? idOrDriver : idOrDriver.id}`;

export function driverById(data: F1Data, id: string): Driver | undefined {
  return data.drivers.find((d) => d.id === id);
}
export function constructorById(data: F1Data, id: string): Constructor | undefined {
  return data.constructors.find((c) => c.id === id);
}
export function driverStandings(data: F1Data, season: number | string = data.currentSeason): DriverStandingRow[] {
  return data.standings[String(season)]?.drivers ?? [];
}
export function constructorStandings(data: F1Data, season: number | string = data.currentSeason): ConstructorStandingRow[] {
  return data.standings[String(season)]?.constructors ?? [];
}
export function calendar(data: F1Data, season: number | string = data.currentSeason): Round[] {
  return data.calendars[String(season)] ?? [];
}
export function trackByKey(data: F1Data, key: number | null | undefined): Track | null {
  if (key == null) return null;
  return data.tracks[String(key)] ?? null;
}
