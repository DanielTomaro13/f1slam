#!/usr/bin/env node
/**
 * One-off: add fastest-lap flags (`fl: true`) to web/history.json, fetched from
 * Ergast/Jolpica (fastest-lap data exists from 2004). Idempotent. After this,
 * recompute-ratings.mjs can score the F1-Fantasy fastest-lap bonus. Future full
 * pipeline runs capture `fl` directly in build-data.mjs, so this is only needed
 * to upgrade the already-committed snapshot in place.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIST = join(__dirname, "..", "web", "history.json");
const ERG = "https://api.jolpi.ca/ergast/f1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url, tries = 6) {
  for (let a = 0; a <= tries; a++) {
    const gap = Date.now() - last; if (gap < 320) await sleep(320 - gap); last = Date.now();
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 429) { await sleep(3000 * (a + 1)); continue; }
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch {}
    await sleep(800 * (a + 1));
  }
  return null;
}

const hist = JSON.parse(readFileSync(HIST, "utf8"));
// index history rows by driverId+season+round for quick flagging
const byKey = new Map();
for (const [id, rows] of Object.entries(hist)) {
  for (const r of rows) { byKey.set(`${id}|${r.season}|${r.round}`, r); r.fl = r.fl || false; }
}

const years = [...new Set(Object.values(hist).flat().map((r) => r.season))].sort((a, b) => b - a);
let flagged = 0;
for (const y of years) {
  if (y < 2004) continue; // no fastest-lap data before 2004
  const d = await get(`${ERG}/${y}/fastest/1/results.json?limit=100`);
  const races = d?.MRData?.RaceTable?.Races || [];
  for (const race of races) {
    const res = race.Results?.[0];
    if (!res) continue;
    const row = byKey.get(`${res.Driver.driverId}|${y}|${Number(race.round)}`);
    if (row) { row.fl = true; flagged++; }
  }
  console.log(`  ${y}: ${races.length} fastest laps`);
}

writeFileSync(HIST, JSON.stringify(hist));
console.log(`Flagged ${flagged} fastest laps.`);
