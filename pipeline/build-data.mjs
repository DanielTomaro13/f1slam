#!/usr/bin/env node
/**
 * F1Slam — data pipeline
 * ----------------------
 * Builds a games-ready Formula 1 dataset from the public OpenF1 REST API
 * (https://openf1.org — no auth required, historical data 2023→).
 *
 * Produces ONE snapshot the static site reads at build time
 * (web/public/data/f1.json):
 *   - current-season drivers' + constructors' championship standings
 *   - the current-season race calendar with winners
 *   - a per-driver career aggregate across every OpenF1 season
 *     (races, wins, podiums, points, poles, best finish, DNFs) — the pool the
 *     mini-games draw from.
 *
 * Usage:  node pipeline/build-data.mjs [year]
 *   year defaults to the latest season that already has a completed race.
 *
 * Re-runnable and rate-limit friendly. Best-effort: a single failed feed never
 * aborts the run, and the committed snapshot covers any gap.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "web", "public", "data");
const API = "https://api.openf1.org/v1";

// OpenF1 covers 2023 onward. Career aggregates span all of these.
const HISTORY_YEARS = [2023, 2024, 2025, 2026];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = 0;
let lastCall = 0;
const PACE_MS = 350; // minimum gap between calls — keeps us under the rate limit

async function get(path, { retries = 8 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    // global pacing: never fire two calls closer than PACE_MS apart
    const since = Date.now() - lastCall;
    if (since < PACE_MS) await sleep(PACE_MS - since);
    lastCall = Date.now();
    try {
      const res = await fetch(API + path, { headers: { accept: "application/json" } });
      calls++;
      if (res.status === 429) {
        await sleep(3000 * (attempt + 1)); // exponential cool-down on rate limit
        continue;
      }
      if (res.ok) return res.json();
      if (res.status === 404) return [];
    } catch {
      /* network blip — retry */
    }
    await sleep(1000 * (attempt + 1));
  }
  console.warn(`  ! giving up on ${path}`);
  return null; // null = failed (distinct from [] = legitimately empty)
}

const isPodium = (p) => p != null && p <= 3;

/**
 * Stable per-driver identity key. Car numbers are NOT stable across seasons
 * (the reigning champion may run #1), so career totals key by name and we carry
 * the most-recently-seen number/team for display.
 */
const idKey = (d) =>
  (d.full_name || `${d.first_name} ${d.last_name}` || `#${d.driver_number}`)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const blank = () => ({ races: 0, wins: 0, podiums: 0, points: 0, dnf: 0, best: 99, poles: 0 });

async function detectLatestYear() {
  try {
    const latest = await get(`/sessions?session_key=latest`);
    if (latest?.[0]?.year) return latest[0].year;
  } catch {}
  return HISTORY_YEARS[HISTORY_YEARS.length - 1];
}

/**
 * Build a driver_number → identity map for a whole season.
 *
 * Numbers ARE stable within a season, so one drivers feed covers it — we only
 * fall back to other races if the first one we try comes back empty. This keeps
 * the call count (and rate-limit pressure) low.
 */
async function seasonDrivers(races, names) {
  const numToId = new Map();
  for (const race of races) {
    const drivers = await get(`/drivers?session_key=${race.session_key}`);
    if (!drivers || drivers.length === 0) continue;
    for (const d of drivers) {
      const key = idKey(d);
      numToId.set(d.driver_number, key);
      // Loop runs oldest→newest season, so newest team/number win; carry forward
      // a known country/headshot when the latest session reports null.
      const prev = names.get(key) || {};
      names.set(key, {
        number: d.driver_number,
        code: d.name_acronym,
        firstName: d.first_name,
        lastName: d.last_name,
        fullName: d.full_name,
        team: d.team_name,
        teamColour: d.team_colour ? `#${d.team_colour}` : prev.teamColour || "#888888",
        country: d.country_code || prev.country || null,
        headshot: d.headshot_url || prev.headshot || null,
      });
    }
    break; // one good drivers feed is enough for the whole season
  }
  return numToId;
}

/** Aggregate every completed Race result in a season into per-driver totals. */
async function aggregateSeason(year, agg, names) {
  const races = await get(`/sessions?year=${year}&session_name=Race`);
  if (!Array.isArray(races) || races.length === 0) return 0;

  const done = races.filter((r) => new Date(r.date_end || r.date_start).getTime() < Date.now());
  if (done.length === 0) return 0;

  const numToId = await seasonDrivers(done, names);

  // qualifying sessions for the whole year in one call → meeting_key → quali key
  const qualis = await get(`/sessions?year=${year}&session_name=Qualifying`);
  const qByMeeting = new Map();
  for (const q of qualis || []) qByMeeting.set(q.meeting_key, q.session_key);

  let counted = 0;
  for (const race of done) {
    const results = await get(`/session_result?session_key=${race.session_key}`);
    if (!Array.isArray(results) || results.length === 0) continue;
    counted++;

    for (const r of results) {
      const key = numToId.get(r.driver_number);
      if (!key) continue;
      const a = agg.get(key) || blank();
      a.races++;
      a.points += Number(r.points || 0);
      if (r.dnf || r.dns || r.dsq) a.dnf++;
      if (r.position === 1) a.wins++;
      if (isPodium(r.position)) a.podiums++;
      if (r.position != null && r.position < a.best) a.best = r.position;
      agg.set(key, a);
    }

    const qKey = qByMeeting.get(race.meeting_key);
    if (qKey) {
      const qres = await get(`/session_result?session_key=${qKey}`);
      const pole = (qres || []).find((r) => r.position === 1);
      const key = pole && numToId.get(pole.driver_number);
      if (key) {
        const a = agg.get(key) || blank();
        a.poles++;
        agg.set(key, a);
      }
    }
  }
  return counted;
}

async function main() {
  const year = Number(process.argv[2]) || (await detectLatestYear());
  console.log(`Building F1Slam dataset — season ${year}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const agg = new Map();
  const names = new Map();
  for (const y of HISTORY_YEARS) {
    if (y > year) continue;
    const n = await aggregateSeason(y, agg, names);
    console.log(`  ${y}: aggregated ${n} races`);
  }

  // calendar (meetings + race winners)
  const meetings = await get(`/meetings?year=${year}`);
  const raceSessions = await get(`/sessions?year=${year}&session_name=Race`);
  const raceByMeeting = new Map();
  for (const s of raceSessions || []) raceByMeeting.set(s.meeting_key, s);

  const numToCode = new Map();
  for (const id of names.keys()) {
    const d = names.get(id);
    numToCode.set(d.number, d.code);
  }

  const calendar = [];
  let round = 0;
  for (const m of (meetings || []).filter((mm) => !/testing/i.test(mm.meeting_name))) {
    round++;
    const race = raceByMeeting.get(m.meeting_key);
    let winner = null;
    if (race && new Date(race.date_end || race.date_start).getTime() < Date.now()) {
      const res = await get(`/session_result?session_key=${race.session_key}`);
      const w = (res || []).find((r) => r.position === 1);
      if (w) winner = numToCode.get(w.driver_number) || `#${w.driver_number}`;
      await sleep(120);
    }
    calendar.push({
      round,
      meetingKey: m.meeting_key,
      name: m.meeting_name,
      official: m.meeting_official_name,
      country: m.country_name,
      countryCode: m.country_code,
      circuit: m.circuit_short_name,
      location: m.location,
      date: m.date_start,
      raceDate: race?.date_start || m.date_start,
      sessionKey: race?.session_key || null,
      winner,
    });
  }
  console.log(`  calendar: ${calendar.length} rounds`);

  // championship standings at the latest completed race
  const completed = (raceSessions || [])
    .filter((s) => new Date(s.date_end || s.date_start).getTime() < Date.now())
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  const lastRace = completed[completed.length - 1] || null;

  let driverStandings = [];
  let constructorStandings = [];
  if (lastRace) {
    const cd = await get(`/championship_drivers?session_key=${lastRace.session_key}`);
    driverStandings = (cd || [])
      .map((r) => ({ number: r.driver_number, points: r.points_current ?? 0, position: r.position_current ?? 99 }))
      .sort((a, b) => a.position - b.position);
    const ct = await get(`/championship_teams?session_key=${lastRace.session_key}`);
    constructorStandings = (ct || [])
      .map((r) => ({ team: r.team_name, points: r.points_current ?? 0, position: r.position_current ?? 99 }))
      .sort((a, b) => a.position - b.position);
  }
  console.log(`  standings: ${driverStandings.length} drivers, ${constructorStandings.length} teams`);

  const drivers = [...names.entries()]
    .map(([key, d]) => {
      const a = agg.get(key) || {};
      return {
        ...d,
        stats: {
          races: a.races || 0,
          wins: a.wins || 0,
          podiums: a.podiums || 0,
          poles: a.poles || 0,
          points: Math.round((a.points || 0) * 10) / 10,
          dnf: a.dnf || 0,
          bestFinish: a.best && a.best < 99 ? a.best : null,
        },
      };
    })
    .filter((d) => d.stats.races > 0)
    .sort((a, b) => b.stats.points - a.stats.points);

  const out = {
    season: year,
    generatedAt: new Date().toISOString(),
    lastRace: lastRace
      ? { name: (meetings || []).find((m) => m.meeting_key === lastRace.meeting_key)?.meeting_name, date: lastRace.date_start }
      : null,
    drivers,
    driverStandings,
    constructorStandings,
    calendar,
  };

  const file = join(OUT_DIR, "f1.json");
  writeFileSync(file, JSON.stringify(out));
  console.log(`\nWrote ${drivers.length} drivers → ${file}`);
  console.log(`Total OpenF1 calls: ${calls}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
