#!/usr/bin/env node
/**
 * Recompute driver-season ratings + constructor-season strengths on the already
 * built dataset (web/public/data/f1.json + web/history.json) — no API calls.
 *
 * Derives rich per-season stats (avg finish, avg grid, DNF rate, team-mate
 * head-to-head, points share, car pace) and writes the new ratings/strengths
 * plus a few of those stats back into f1.json for display.
 *
 * Usage: node pipeline/recompute-ratings.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { driverSeasonRating, constructorStrength } from "./ratings.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const F1 = join(__dirname, "..", "web", "public", "data", "f1.json");
const HIST = join(__dirname, "..", "web", "history.json");

const f1 = JSON.parse(readFileSync(F1, "utf8"));
const hist = JSON.parse(readFileSync(HIST, "utf8"));

// ---- index everything by year -------------------------------------------------
// year -> { rounds: Map<round, Map<driverId,{grid,pos,dnf,pts}>>, teamOf, teamDrivers }
const years = new Map();
function Y(year) {
  if (!years.has(year)) years.set(year, { rounds: new Map(), teamOf: new Map(), teamDrivers: new Map() });
  return years.get(year);
}

// per-race results from history
for (const [driverId, rows] of Object.entries(hist)) {
  for (const r of rows) {
    const y = Y(r.season);
    if (!y.rounds.has(r.round)) y.rounds.set(r.round, new Map());
    y.rounds.get(r.round).set(driverId, { grid: r.grid, pos: r.position, dnf: r.dnf, pts: r.points });
  }
}
// team membership per season from f1.json bySeason
for (const d of f1.drivers) {
  for (const s of d.bySeason) {
    const y = Y(Number(s.year));
    y.teamOf.set(d.id, s.team);
    if (!y.teamDrivers.has(s.team)) y.teamDrivers.set(s.team, new Set());
    y.teamDrivers.get(s.team).add(d.id);
  }
}

// season max points-per-race (era-neutral normaliser)
const seasonMaxPpr = new Map();
for (const d of f1.drivers) {
  for (const s of d.bySeason) {
    const ppr = s.points / Math.max(1, s.races);
    seasonMaxPpr.set(s.year, Math.max(seasonMaxPpr.get(s.year) || 0, ppr));
  }
}
// season max team points
const seasonMaxTeamPts = new Map();
for (const c of f1.constructors) {
  for (const s of c.bySeason) seasonMaxTeamPts.set(s.year, Math.max(seasonMaxTeamPts.get(s.year) || 0, s.points));
}

// ---- driver-season ratings ----------------------------------------------------
function driverSeasonStats(driverId, s) {
  const year = Number(s.year);
  const y = years.get(year);
  const starts = Math.max(1, s.races);
  const ppr = s.points / starts;

  // gather this driver's per-round lines + team-mate head-to-head
  let finSum = 0, finN = 0, dnf = 0;
  let tmGridW = 0, tmGridR = 0, tmRaceW = 0, tmRaceR = 0;
  const team = s.team;
  const mates = [...(y?.teamDrivers.get(team) || [])].filter((id) => id !== driverId);
  let teamPts = s.points;
  for (const mid of mates) {
    const md = f1.drivers.find((x) => x.id === mid);
    const ms = md?.bySeason.find((b) => b.year === s.year);
    if (ms) teamPts += ms.points;
  }
  if (y) {
    for (const [, line] of y.rounds) {
      const me = line.get(driverId);
      if (!me) continue;
      if (me.dnf) dnf++;
      if (me.pos != null) { finSum += me.pos; finN++; }
      for (const mid of mates) {
        const t = line.get(mid);
        if (!t) continue;
        if (me.grid > 0 && t.grid > 0) { tmGridR++; if (me.grid < t.grid) tmGridW++; }
        if (me.pos != null && t.pos != null) { tmRaceR++; if (me.pos < t.pos) tmRaceW++; }
      }
    }
  }
  return {
    ppr, seasonMaxPpr: seasonMaxPpr.get(s.year) || 1,
    winRate: s.wins / starts, podiumRate: s.podiums / starts, poleRate: s.poles / starts,
    avgFinish: finN ? finSum / finN : null, dnfRate: dnf / starts, champPos: s.position || 99,
    hasTeammate: tmRaceR > 0 || tmGridR > 0,
    tmGridW, tmGridR, tmRaceW, tmRaceR,
    ptsShare: teamPts > 0 ? s.points / teamPts : 0.5,
  };
}

let dCount = 0;
for (const d of f1.drivers) {
  for (const s of d.bySeason) {
    const st = driverSeasonStats(d.id, s);
    s.rating = driverSeasonRating(st);
    // store a few stats for display
    s.avgFinish = st.avgFinish != null ? Math.round(st.avgFinish * 10) / 10 : null;
    s.dnfRate = Math.round(st.dnfRate * 100);
    if (st.hasTeammate) s.tmQ = `${st.tmGridW}-${st.tmGridR - st.tmGridW}`, s.tmR = `${st.tmRaceW}-${st.tmRaceR - st.tmRaceW}`;
    else { delete s.tmQ; delete s.tmR; }
    dCount++;
  }
}

// ---- constructor-season strengths --------------------------------------------
function constructorStats(c, s) {
  const year = Number(s.year);
  const y = years.get(year);
  const drivers = [...(y?.teamDrivers.get(c.name) || [])];
  // car pace: best classified finish among the team's cars each round
  let bestSum = 0, bestN = 0, poles = 0, rounds = 0;
  if (y) {
    for (const [, line] of y.rounds) {
      let best = null, hadEntry = false, gotPole = false;
      for (const id of drivers) {
        const l = line.get(id);
        if (!l) continue;
        hadEntry = true;
        if (l.grid === 1) gotPole = true;
        if (l.pos != null && (best == null || l.pos < best)) best = l.pos;
      }
      if (hadEntry) { rounds++; if (gotPole) poles++; if (best != null) { bestSum += best; bestN++; } }
    }
  }
  const races = Math.max(1, rounds);
  return {
    ptsN: s.points / (seasonMaxTeamPts.get(s.year) || 1),
    paceScore: bestN ? (20 - bestSum / bestN) / 19 : 0.4,
    winRate: s.wins / races, poleRate: poles / races, champPos: s.position || 99,
  };
}

let cCount = 0;
for (const c of f1.constructors) {
  for (const s of c.bySeason) {
    s.strength = constructorStrength(constructorStats(c, s));
    cCount++;
  }
}

writeFileSync(F1, JSON.stringify(f1));
console.log(`Recomputed ${dCount} driver-seasons and ${cCount} constructor-seasons.`);

// quick sanity: spread of a few legends' peak ratings
const peek = ["max_verstappen", "hamilton", "senna", "michael_schumacher", "alonso", "leclerc", "perez"];
for (const id of peek) {
  const d = f1.drivers.find((x) => x.id === id);
  if (!d) continue;
  const top = [...d.bySeason].sort((a, b) => b.rating - a.rating)[0];
  console.log(`  ${d.name.padEnd(20)} peak OVR ${top.rating} (${top.year}, P${top.position}, ${top.wins}W)${top.tmR ? ` tmR ${top.tmR}` : ""}`);
}
