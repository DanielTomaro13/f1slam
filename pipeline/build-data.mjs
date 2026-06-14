#!/usr/bin/env node
/**
 * F1Slam — data pipeline
 * ----------------------
 * Builds the full multi-season Formula 1 dataset from the public OpenF1 REST API
 * (https://openf1.org — no auth, data 2023→) plus circuit geometry from the
 * MultiViewer API (track maps).
 *
 * Output (web/public/data/f1.json):
 *   - drivers[]      identity + career stats + race-by-race history (byRace[])
 *   - standings{}    per-season drivers' + constructors' championship
 *   - calendars{}    per-season race calendar with winners
 *   - tracks{}       per-circuit map geometry (x/y polyline, corners, rotation)
 *
 * Usage:  node pipeline/build-data.mjs [latestYear]
 * Re-runnable, gently paced. Best-effort: a failed feed never aborts the run.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "web", "public", "data");
const API = "https://api.openf1.org/v1";
const MV = "https://api.multiviewer.app/api/v1";

const HISTORY_YEARS = [2023, 2024, 2025, 2026];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = 0;
let lastCall = 0;
const PACE_MS = 350;

async function get(url, { retries = 8, base = API } = {}) {
  const full = base + url;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const since = Date.now() - lastCall;
    if (since < PACE_MS) await sleep(PACE_MS - since);
    lastCall = Date.now();
    try {
      const res = await fetch(full, { headers: { accept: "application/json" } });
      calls++;
      if (res.status === 429) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      if (res.ok) return res.json();
      if (res.status === 404) return [];
    } catch {
      /* retry */
    }
    await sleep(1000 * (attempt + 1));
  }
  console.warn(`  ! giving up on ${full}`);
  return null;
}

const isPodium = (p) => p != null && p <= 3;
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

/** number→identity map for a whole season (numbers are stable within a season). */
async function seasonDrivers(races, names) {
  const numToId = new Map();
  for (const race of races) {
    const drivers = await get(`/drivers?session_key=${race.session_key}`);
    if (!drivers || drivers.length === 0) continue;
    for (const d of drivers) {
      const key = idKey(d);
      numToId.set(d.driver_number, key);
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
    break;
  }
  return numToId;
}

/** Build meeting_key → round/circuit info for a season (ex-testing, ordered). */
function meetingIndex(meetings) {
  const idx = new Map();
  let round = 0;
  const ordered = (meetings || [])
    .filter((m) => !/testing/i.test(m.meeting_name))
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  for (const m of ordered) {
    round++;
    idx.set(m.meeting_key, {
      round,
      name: m.meeting_name,
      official: m.meeting_official_name,
      country: m.country_name,
      countryCode: m.country_code,
      circuitKey: m.circuit_key,
      circuit: m.circuit_short_name,
      location: m.location,
      image: m.circuit_image || null,
      date: m.date_start,
    });
  }
  return { idx, ordered };
}

async function main() {
  const year = Number(process.argv[2]) || (await detectLatestYear());
  console.log(`Building F1Slam dataset — latest season ${year}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const agg = new Map();         // idKey -> career totals
  const names = new Map();       // idKey -> identity
  const byRace = new Map();      // idKey -> [{season, round, ...}]
  const standings = {};          // year -> {drivers, constructors}
  const calendars = {};          // year -> [rounds]
  const circuitKeys = new Set();
  const circuitMeta = new Map(); // circuitKey -> {name, country, countryCode, location, image}

  const years = HISTORY_YEARS.filter((y) => y <= year);

  for (const y of years) {
    const meetings = await get(`/meetings?year=${y}`);
    const { idx } = meetingIndex(meetings);
    const races = await get(`/sessions?year=${y}&session_name=Race`);
    if (!Array.isArray(races)) { console.log(`  ${y}: no races`); continue; }
    const raceByMeeting = new Map();
    for (const r of races) raceByMeeting.set(r.meeting_key, r);

    const done = races.filter((r) => new Date(r.date_end || r.date_start).getTime() < Date.now());
    const numToId = await seasonDrivers(done.length ? done : races, names);

    const qualis = await get(`/sessions?year=${y}&session_name=Qualifying`);
    const qByMeeting = new Map();
    for (const q of qualis || []) qByMeeting.set(q.meeting_key, q.session_key);

    // race-by-race aggregation
    let counted = 0;
    const winners = new Map(); // meeting_key -> winner code
    for (const race of done) {
      const m = idx.get(race.meeting_key);
      if (m?.circuitKey) {
        circuitKeys.add(m.circuitKey);
        if (!circuitMeta.has(m.circuitKey))
          circuitMeta.set(m.circuitKey, {
            name: m.circuit, country: m.country, countryCode: m.countryCode,
            location: m.location, image: m.image,
          });
      }
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
        if (r.position === 1) { a.wins++; if (m) winners.set(race.meeting_key, names.get(key)?.code); }
        if (isPodium(r.position)) a.podiums++;
        if (r.position != null && r.position < a.best) a.best = r.position;
        agg.set(key, a);
        // per-race history row
        const list = byRace.get(key) || [];
        list.push({
          season: y,
          round: m?.round ?? null,
          race: m?.name ?? null,
          country: m?.country ?? null,
          countryCode: m?.countryCode ?? null,
          circuitKey: m?.circuitKey ?? null,
          date: m?.date ?? race.date_start,
          position: r.position ?? null,
          points: Number(r.points || 0),
          dnf: !!(r.dnf || r.dns || r.dsq),
        });
        byRace.set(key, list);
      }
      const qKey = qByMeeting.get(race.meeting_key);
      if (qKey) {
        const qres = await get(`/session_result?session_key=${qKey}`);
        const pole = (qres || []).find((r) => r.position === 1);
        const key = pole && numToId.get(pole.driver_number);
        if (key) { const a = agg.get(key) || blank(); a.poles++; agg.set(key, a); }
      }
    }
    console.log(`  ${y}: ${counted} races`);

    // calendar for the season (all meetings incl. upcoming)
    calendars[y] = (idx.size ? [...idx.entries()] : [])
      .map(([mk, m]) => {
        const race = raceByMeeting.get(mk);
        return {
          round: m.round, meetingKey: mk, name: m.name, official: m.official,
          country: m.country, countryCode: m.countryCode, circuit: m.circuit,
          circuitKey: m.circuitKey, location: m.location, image: m.image,
          date: m.date, raceDate: race?.date_start || m.date,
          sessionKey: race?.session_key || null, winner: winners.get(mk) || null,
        };
      })
      .sort((a, b) => a.round - b.round);

    // championship standings at the last completed race
    const lastDone = [...done].sort((a, b) => new Date(a.date_start) - new Date(b.date_start)).pop();
    if (lastDone) {
      const cd = await get(`/championship_drivers?session_key=${lastDone.session_key}`);
      const ct = await get(`/championship_teams?session_key=${lastDone.session_key}`);
      standings[y] = {
        drivers: (cd || []).map((r) => ({ number: r.driver_number, points: r.points_current ?? 0, position: r.position_current ?? 99 })).sort((a, b) => a.position - b.position),
        constructors: (ct || []).map((r) => ({ team: r.team_name, points: r.points_current ?? 0, position: r.position_current ?? 99 })).sort((a, b) => a.position - b.position),
      };
    }
  }

  // track maps from MultiViewer (one per unique circuit)
  const tracks = {};
  for (const ck of circuitKeys) {
    const meta = circuitMeta.get(ck) || {};
    let map = null;
    for (const y of [...years].reverse()) {
      const data = await get(`/circuits/${ck}/${y}`, { base: MV, retries: 2 });
      if (data && Array.isArray(data.x) && data.x.length > 10) { map = data; break; }
    }
    if (map) {
      // downsample the ~700-point polyline to ~180 points to keep the file lean
      const step = Math.max(1, Math.floor(map.x.length / 180));
      const x = [], y = [];
      for (let i = 0; i < map.x.length; i += step) { x.push(map.x[i]); y.push(map.y[i]); }
      tracks[ck] = {
        key: ck, name: map.circuitName || meta.name, country: meta.country,
        countryCode: meta.countryCode, location: meta.location, image: meta.image,
        rotation: map.rotation || 0, x, y,
        corners: (map.corners || []).map((c) => ({ n: c.number, x: c.trackPosition?.x, y: c.trackPosition?.y })),
      };
    } else {
      tracks[ck] = { key: ck, name: meta.name, country: meta.country, countryCode: meta.countryCode, location: meta.location, image: meta.image, rotation: 0, x: [], y: [], corners: [] };
    }
  }
  console.log(`  tracks: ${Object.keys(tracks).length}`);

  // assemble drivers
  const drivers = [...names.entries()]
    .map(([key, d]) => {
      const a = agg.get(key) || {};
      const races = (byRace.get(key) || []).sort((p, q) => (q.season - p.season) || (q.round - p.round));
      return {
        ...d,
        stats: {
          races: a.races || 0, wins: a.wins || 0, podiums: a.podiums || 0,
          poles: a.poles || 0, points: Math.round((a.points || 0) * 10) / 10,
          dnf: a.dnf || 0, bestFinish: a.best && a.best < 99 ? a.best : null,
        },
        byRace: races,
      };
    })
    .filter((d) => d.stats.races > 0)
    .sort((a, b) => b.stats.points - a.stats.points);

  const out = {
    currentSeason: year,
    seasons: years.slice().reverse(),
    generatedAt: new Date().toISOString(),
    lastRace: (() => {
      const cal = calendars[year] || [];
      const done = cal.filter((r) => r.winner);
      const l = done[done.length - 1];
      return l ? { name: l.name, date: l.raceDate } : null;
    })(),
    drivers,
    standings,
    calendars,
    tracks,
  };

  const file = join(OUT_DIR, "f1.json");
  writeFileSync(file, JSON.stringify(out));
  console.log(`\nWrote ${drivers.length} drivers, ${Object.keys(tracks).length} tracks, ${years.length} seasons → ${file}`);
  console.log(`Size: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB · OpenF1/MV calls: ${calls}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
