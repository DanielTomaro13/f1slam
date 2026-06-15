#!/usr/bin/env node
/**
 * Recompute F1-Fantasy-based rankings on the built dataset (no API calls).
 *
 * Reads web/public/data/f1.json + web/history.json and:
 *   • scores every driver's F1-Fantasy points per race (qualifying + race +
 *     positions gained/lost + fastest lap + DNF/DSQ penalties),
 *   • totals fantasy points per driver-season + career, and per constructor,
 *   • derives the 0–99 game rating / car strength from fantasy-per-race,
 *   • keeps avg-finish / DNF% / team-mate head-to-head as displayed stats,
 *   • writes a full race archive (web/public/data/races.json) with the complete
 *     classification + per-driver fantasy points for every Grand Prix in history.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fantasyForRace, constructorQualiBonus, ratingFromFantasy, strengthFromFantasy } from "./ratings.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "web", "public", "data");
const HIST = join(__dirname, "..", "web", "history.json");

const f1 = JSON.parse(readFileSync(join(DATA, "f1.json"), "utf8"));
const hist = JSON.parse(readFileSync(HIST, "utf8"));

// ---- driver identity + per-season team lookup --------------------------------
const idInfo = new Map();   // driverId -> {name, code, flag, headshot}
const teamBySeason = new Map(); // `${id}|${year}` -> {team, teamColour}
for (const d of f1.drivers) {
  idInfo.set(d.id, { name: d.name, code: d.code, flag: d.flag, headshot: d.headshot });
  for (const s of d.bySeason) teamBySeason.set(`${d.id}|${s.year}`, { team: s.team, teamColour: s.teamColour });
}

// ---- index history by year/round + score fantasy per race --------------------
const years = new Map(); // year -> { rounds:Map<round,Map<id,row>>, teamOf:Map<id,team>, teamDrivers:Map<team,Set> }
const Y = (y) => { if (!years.has(y)) years.set(y, { rounds: new Map(), teamOf: new Map(), teamDrivers: new Map() }); return years.get(y); };

for (const [id, rows] of Object.entries(hist)) {
  for (const r of rows) {
    r.fantasy = fantasyForRace(r);          // store per-race fantasy for the race archive + profile
    const y = Y(r.season);
    if (!y.rounds.has(r.round)) y.rounds.set(r.round, new Map());
    y.rounds.get(r.round).set(id, r);
  }
}
for (const d of f1.drivers) for (const s of d.bySeason) {
  const y = Y(Number(s.year));
  y.teamOf.set(d.id, s.team);
  if (!y.teamDrivers.has(s.team)) y.teamDrivers.set(s.team, new Set());
  y.teamDrivers.get(s.team).add(d.id);
}

// ---- per driver-season: fantasy total + supporting stats ---------------------
const driverFantasyBySeason = new Map(); // `${id}|${year}` -> {fantasy, starts}
for (const [id, rows] of Object.entries(hist)) {
  const bySeason = new Map();
  for (const r of rows) {
    const b = bySeason.get(r.season) || { fantasy: 0, starts: 0 };
    b.fantasy += r.fantasy; b.starts++;
    bySeason.set(r.season, b);
  }
  for (const [yr, b] of bySeason) driverFantasyBySeason.set(`${id}|${yr}`, b);
}

// season best fantasy-per-race (driver), for normalising the rating
const seasonBestDriverFpr = new Map();
for (const [k, b] of driverFantasyBySeason) {
  const yr = Number(k.split("|")[1]);
  const fpr = b.fantasy / Math.max(1, b.starts);
  seasonBestDriverFpr.set(yr, Math.max(seasonBestDriverFpr.get(yr) || -99, fpr));
}

function teammateStats(driverId, s) {
  const y = years.get(Number(s.year));
  const team = s.team;
  const mates = [...(y?.teamDrivers.get(team) || [])].filter((i) => i !== driverId);
  let finSum = 0, finN = 0, dnf = 0, tmRaceW = 0, tmRaceR = 0;
  if (y) for (const [, line] of y.rounds) {
    const me = line.get(driverId); if (!me) continue;
    if (me.dnf) dnf++;
    if (me.position != null) { finSum += me.position; finN++; }
    for (const mid of mates) { const t = line.get(mid); if (!t) continue; if (me.position != null && t.position != null) { tmRaceR++; if (me.position < t.position) tmRaceW++; } }
  }
  return { avgFinish: finN ? finSum / finN : null, dnf, tmRaceW, tmRaceR };
}

for (const d of f1.drivers) {
  let careerFantasy = 0;
  for (const s of d.bySeason) {
    const fb = driverFantasyBySeason.get(`${d.id}|${s.year}`) || { fantasy: 0, starts: Math.max(1, s.races) };
    const starts = Math.max(1, fb.starts || s.races);
    const fpr = fb.fantasy / starts;
    s.fantasy = Math.round(fb.fantasy);
    s.rating = ratingFromFantasy(fpr, seasonBestDriverFpr.get(Number(s.year)) || 1);
    careerFantasy += fb.fantasy;
    const tm = teammateStats(d.id, s);
    s.avgFinish = tm.avgFinish != null ? Math.round(tm.avgFinish * 10) / 10 : null;
    s.dnfRate = Math.round((tm.dnf / starts) * 100);
    if (tm.tmRaceR > 0) s.tmR = `${tm.tmRaceW}-${tm.tmRaceR - tm.tmRaceW}`; else delete s.tmR;
  }
  d.career.fantasy = Math.round(careerFantasy);
}

// ---- per constructor-season: fantasy total + strength ------------------------
const ctorFantasyBySeason = new Map(); // `${team}|${year}` -> {fantasy, races}
for (const [yr, y] of years) {
  for (const [team, drivers] of y.teamDrivers) {
    let fantasy = 0, races = 0;
    for (const [, line] of y.rounds) {
      const grids = [], present = [];
      for (const id of drivers) { const l = line.get(id); if (l) { present.push(l); grids.push(l.grid || 0); } }
      if (!present.length) continue;
      races++;
      for (const l of present) fantasy += l.fantasy;
      fantasy += constructorQualiBonus(grids);
    }
    ctorFantasyBySeason.set(`${team}|${yr}`, { fantasy, races: Math.max(1, races) });
  }
}
const seasonBestCtorFpr = new Map();
for (const [k, b] of ctorFantasyBySeason) {
  const yr = Number(k.split("|")[1]);
  seasonBestCtorFpr.set(yr, Math.max(seasonBestCtorFpr.get(yr) || -99, b.fantasy / b.races));
}
for (const c of f1.constructors) {
  let careerFantasy = 0;
  for (const s of c.bySeason) {
    const fb = ctorFantasyBySeason.get(`${c.name}|${s.year}`) || { fantasy: 0, races: 1 };
    s.fantasy = Math.round(fb.fantasy);
    s.strength = strengthFromFantasy(fb.fantasy / fb.races, seasonBestCtorFpr.get(Number(s.year)) || 1);
    careerFantasy += fb.fantasy;
  }
  c.career.fantasy = Math.round(careerFantasy);
}

// ---- full race archive (races.json) ------------------------------------------
const calByKey = new Map();
for (const [yr, cal] of Object.entries(f1.calendars)) for (const r of cal) calByKey.set(`${yr}-${r.round}`, r);

const races = {};
for (const [yr, y] of years) {
  for (const [round, line] of y.rounds) {
    const key = `${yr}-${round}`;
    const meta = calByKey.get(key) || {};
    const results = [...line.entries()].map(([id, r]) => {
      const info = idInfo.get(id) || {};
      const tc = teamBySeason.get(`${id}|${yr}`) || {};
      return {
        driverId: id, name: info.name, code: info.code, flag: info.flag, headshot: info.headshot,
        team: tc.team || "—", teamColour: tc.teamColour || "#888",
        grid: r.grid, position: r.position, points: r.points, status: r.status,
        dnf: r.dnf, fl: !!r.fl, fantasy: Math.round(r.fantasy),
        gainedLost: r.grid > 0 && r.position != null ? r.grid - r.position : null,
      };
    }).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    races[key] = {
      season: yr, round, name: meta.name || `Round ${round}`, circuit: meta.circuit || "",
      circuitId: meta.circuitId || null, circuitKey: meta.circuitKey ?? null,
      country: meta.country || "", countryCode: meta.countryCode || null,
      date: meta.raceDate || meta.date || null, winner: meta.winner || null, results,
    };
  }
}

writeFileSync(join(DATA, "f1.json"), JSON.stringify(f1));
writeFileSync(HIST, JSON.stringify(hist));
// race archive is large + fully derived from f1.json+history.json, so it's
// written outside public/ (build-only) and regenerated at deploy, not committed.
writeFileSync(join(__dirname, "..", "web", "races.json"), JSON.stringify(races));

const rc = Object.keys(races).length;
console.log(`Scored fantasy for ${f1.drivers.length} drivers; built ${rc} race classifications.`);
for (const id of ["max_verstappen", "hamilton", "michael_schumacher", "senna", "perez"]) {
  const d = f1.drivers.find((x) => x.id === id); if (!d) continue;
  const top = [...d.bySeason].sort((a, b) => b.fantasy - a.fantasy)[0];
  console.log(`  ${d.name.padEnd(20)} career fantasy ${d.career.fantasy} · best season ${top.fantasy} (${top.year}, OVR ${top.rating})`);
}
