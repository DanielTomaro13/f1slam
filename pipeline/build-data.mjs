#!/usr/bin/env node
/**
 * F1Slam — data pipeline
 * ----------------------
 * Combines two public sources into one static dataset (web/public/data/f1.json):
 *   • Jolpica/Ergast (api.jolpi.ca) — the COMPLETE F1 record, 1950→ : every
 *     season's driver & constructor standings, race winners and pole-sitters.
 *   • OpenF1 + MultiViewer — current-era extras: circuit map geometry (track
 *     maps) and driver headshots.
 *
 * Output:
 *   drivers[]       identity + career totals + per-season line (bySeason)
 *   constructors[]  identity + career totals + per-season strength
 *   standings{}     per-season drivers' + constructors' championship (all years)
 *   calendars{}     per-season race calendar with winners (all years)
 *   tracks{}        current-era circuit maps
 *
 * Re-runnable, gently paced, best-effort.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "web", "public", "data");
const ERG = "https://api.jolpi.ca/ergast/f1";
const OF1 = "https://api.openf1.org/v1";
const MV = "https://api.multiviewer.app/api/v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0, lastCall = 0;
const PACE = 320;
async function get(url, { retries = 7 } = {}) {
  for (let a = 0; a <= retries; a++) {
    const since = Date.now() - lastCall;
    if (since < PACE) await sleep(PACE - since);
    lastCall = Date.now();
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      calls++;
      if (res.status === 429) { await sleep(3000 * (a + 1)); continue; }
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(1000 * (a + 1));
  }
  console.warn(`  ! gave up: ${url}`);
  return null;
}

// ---- helpers ----------------------------------------------------------------
const DEMONYM = {
  British: "GB", German: "DE", Italian: "IT", French: "FR", Spanish: "ES", Dutch: "NL",
  Brazilian: "BR", Finnish: "FI", Austrian: "AT", Australian: "AU", Mexican: "MX",
  Canadian: "CA", Belgian: "BE", Argentine: "AR", Argentinian: "AR", American: "US",
  Swiss: "CH", Swedish: "SE", Japanese: "JP", Monegasque: "MC", "New Zealander": "NZ",
  Danish: "DK", Polish: "PL", Russian: "RU", Thai: "TH", Indian: "IN", Indonesian: "ID",
  Portuguese: "PT", "South African": "ZA", Irish: "IE", Czech: "CZ", Hungarian: "HU",
  Venezuelan: "VE", Colombian: "CO", Chinese: "CN", Liechtensteiner: "LI", Malaysian: "MY",
  Chilean: "CL", Uruguayan: "UY", "East German": "DE", Rhodesian: "ZW", "Soviet": "RU",
  Saudi: "SA", Emirati: "AE", Qatari: "QA", Azerbaijani: "AZ", Turkish: "TR", Korean: "KR",
};
function flag(nat) {
  const cc = DEMONYM[nat];
  if (!cc) return "🏁";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}
const iso3 = { GB: "GBR", DE: "GER", IT: "ITA", FR: "FRA", ES: "ESP", NL: "NED", BR: "BRA", FI: "FIN", AT: "AUT", AU: "AUS", MX: "MEX", CA: "CAN", BE: "BEL", AR: "ARG", US: "USA", CH: "SUI", SE: "SWE", JP: "JPN", MC: "MON", NZ: "NZL", DK: "DEN", PL: "POL", RU: "RUS", TH: "THA", IN: "IND", ID: "IDN", PT: "POR", ZA: "ZAF", IE: "IRL", CZ: "CZE", HU: "HUN", VE: "VEN", CO: "COL", CN: "CHN", MY: "MYS", CL: "CHL", UY: "URY", SA: "KSA", AE: "UAE", QA: "QAT", AZ: "AZE", TR: "TUR", KR: "KOR" };
const natCountry = (nat) => iso3[DEMONYM[nat]] || null;

const TEAM_COLOURS = {
  ferrari: "#DC0000", mercedes: "#27F4D2", mclaren: "#FF8000", red_bull: "#3671C6",
  williams: "#37BEDD", alpine: "#0093CC", renault: "#FFD800", aston_martin: "#229971",
  haas: "#B6BABD", rb: "#6692FF", alphatauri: "#5E8FAA", toro_rosso: "#469BFF",
  sauber: "#52E252", alfa: "#900000", racing_point: "#F596C8", force_india: "#F596C8",
  lotus_f1: "#FFB800", lotus_racing: "#FFB800", team_lotus: "#FFB800", brabham: "#1E5128",
  tyrrell: "#0033A0", benetton: "#00A551", jordan: "#FAE100", bmw_sauber: "#293276",
  jaguar: "#0A3B26", honda: "#CC0000", toyota: "#CC0000", bar: "#E2001A", stewart: "#FFFFFF",
  minardi: "#000000", arrows: "#FA9E00", ligier: "#0033A0", march: "#E2001A", cooper: "#005F2E",
  maserati: "#1A2A6C", vanwall: "#005C29", brm: "#005C29", matra: "#0033A0", wolf: "#1A1A1A",
  shadow: "#1A1A1A", lola: "#E2001A", prost: "#0033A0", jaguar_racing: "#0A3B26", caterham: "#005030", marussia: "#6E0000", virgin: "#C0001A", manor: "#E2001A", super_aguri: "#E2001A", spyker: "#FF6600", midland: "#E2001A", alpha_tauri: "#5E8FAA",
};
function hashColour(s) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 55% 52%)`;
}
const teamColour = (id) => TEAM_COLOURS[id] || hashColour(id);

// ---- Ergast pulls -----------------------------------------------------------
function listFrom(d, table, list) {
  return d?.MRData?.[table]?.StandingsLists?.[0]?.[list] || [];
}

async function main() {
  console.log("Building F1Slam dataset — full history via Jolpica/Ergast");
  mkdirSync(OUT_DIR, { recursive: true });

  const seasonsData = await get(`${ERG}/seasons.json?limit=100`);
  const years = (seasonsData?.MRData?.SeasonTable?.Seasons || []).map((s) => Number(s.season)).sort((a, b) => b - a);
  const currentSeason = years[0];
  console.log(`  ${years.length} seasons: ${years[years.length - 1]}–${currentSeason}`);

  const drivers = new Map();      // driverId -> identity + bySeason[]
  const constructors = new Map(); // constructorId -> identity + bySeason[]
  const standings = {};
  const calendars = {};
  const history = new Map();      // driverId -> [race-by-race rows] (build-only, → history.json)

  const isFinished = (status) => status === "Finished" || /^\+\d+ Lap/.test(status);
  const posNum = (r) => (/^\d+$/.test(r.positionText) ? Number(r.positionText) : null);

  // fetch every result for a season (paginated)
  async function allResults(y) {
    const races = [];
    let offset = 0, total = 1;
    while (offset < total) {
      const d = await get(`${ERG}/${y}/results.json?limit=100&offset=${offset}`);
      total = Number(d?.MRData?.total || 0);
      const rs = d?.MRData?.RaceTable?.Races || [];
      races.push(...rs);
      offset += 100;
      if (!rs.length) break;
    }
    // Ergast splits a race across pages; merge results by round
    const byRound = new Map();
    for (const r of races) {
      const k = r.round;
      if (!byRound.has(k)) byRound.set(k, { ...r, Results: [] });
      byRound.get(k).Results.push(...(r.Results || []));
    }
    return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
  }

  for (const year of years) {
    const y = String(year);
    const ds = listFrom(await get(`${ERG}/${y}/driverStandings.json?limit=100`), "StandingsTable", "DriverStandings");
    const cs = listFrom(await get(`${ERG}/${y}/constructorStandings.json?limit=100`), "StandingsTable", "ConstructorStandings");
    const raceRows = await allResults(y);

    // per-season derived stats from full results
    const poleCount = new Map(), podiumCount = new Map(), raceCount = new Map(), dnfCount = new Map();
    for (const race of raceRows) {
      for (const res of race.Results || []) {
        const id = res.Driver.driverId;
        raceCount.set(id, (raceCount.get(id) || 0) + 1);
        if (Number(res.grid) === 1) poleCount.set(id, (poleCount.get(id) || 0) + 1);
        const p = posNum(res);
        if (p && p <= 3) podiumCount.set(id, (podiumCount.get(id) || 0) + 1);
        if (!isFinished(res.status)) dnfCount.set(id, (dnfCount.get(id) || 0) + 1);
        // race-by-race history row
        const list = history.get(id) || [];
        list.push({
          season: year, round: Number(race.round), race: race.raceName,
          circuit: race.Circuit?.circuitName || "", circuitId: race.Circuit?.circuitId || null,
          country: race.Circuit?.Location?.country || "", date: race.date || null,
          grid: Number(res.grid) || null, position: p, points: Number(res.points) || 0,
          status: res.status, dnf: !isFinished(res.status),
          fl: res.FastestLap?.rank === "1",
        });
        history.set(id, list);
      }
    }

    const maxDpts = Math.max(1, ...ds.map((x) => Number(x.points)));
    const maxCpts = Math.max(1, ...cs.map((x) => Number(x.points)));

    const dRows = [];
    for (const row of ds) {
      const d = row.Driver, con = row.Constructors?.[row.Constructors.length - 1];
      const id = d.driverId, conId = con?.constructorId || "";
      const pts = Number(row.points), wins = Number(row.wins), pos = Number(row.position);
      const poles = poleCount.get(id) || 0, podiums = podiumCount.get(id) || 0, races = raceCount.get(id) || 0;
      const rating = Math.round(Math.min(99, 58 + (pts / maxDpts) * 28 + wins * 1.4 + (pos === 1 ? 8 : 0) + Math.min(6, poles) + Math.min(4, podiums * 0.5)));
      const colour = teamColour(conId);
      if (!drivers.has(id)) drivers.set(id, {
        id, code: d.code || d.familyName.slice(0, 3).toUpperCase(), first: d.givenName, last: d.familyName,
        name: `${d.givenName} ${d.familyName}`, nationality: d.nationality, country: natCountry(d.nationality),
        flag: flag(d.nationality), headshot: null, bySeason: [],
      });
      drivers.get(id).bySeason.push({ year, team: con?.name || "—", teamColour: colour, points: pts, wins, poles, podiums, races, position: pos, rating });
      dRows.push({ driverId: id, code: drivers.get(id).code, name: drivers.get(id).name, flag: drivers.get(id).flag, team: con?.name || "—", teamColour: colour, points: pts, wins, position: pos });
    }

    const cRows = [];
    for (const row of cs) {
      const c = row.Constructor, id = c.constructorId;
      const pts = Number(row.points), wins = Number(row.wins), pos = Number(row.position);
      const strength = Math.round(Math.min(99, 45 + (pts / maxCpts) * 46 + (pos === 1 ? 8 : 0)));
      const colour = teamColour(id);
      if (!constructors.has(id)) constructors.set(id, {
        id, name: c.name, colour, nationality: c.nationality, country: natCountry(c.nationality), flag: flag(c.nationality), bySeason: [],
      });
      constructors.get(id).bySeason.push({ year, points: pts, wins, position: pos, strength });
      cRows.push({ id, name: c.name, colour, points: pts, wins, position: pos, strength });
    }

    standings[y] = { drivers: dRows, constructors: cRows };

    // calendar with winners (winner = race position 1)
    calendars[y] = raceRows.map((r) => {
      const w = (r.Results || []).find((x) => x.positionText === "1");
      return {
        round: Number(r.round), name: r.raceName, country: r.Circuit?.Location?.country || "",
        countryCode: null, circuit: r.Circuit?.circuitName || "", circuitId: r.Circuit?.circuitId || null,
        circuitKey: null, location: r.Circuit?.Location?.locality || "", date: r.date ? `${r.date}T${r.time || "13:00:00Z"}` : null,
        raceDate: r.date ? `${r.date}T${r.time || "13:00:00Z"}` : null,
        winner: w ? (w.Driver.code || `${w.Driver.familyName}`.slice(0, 3).toUpperCase()) : null,
        winnerName: w ? `${w.Driver.givenName} ${w.Driver.familyName}` : null,
      };
    }).sort((a, b) => a.round - b.round);

    if (year % 10 === 0 || year >= currentSeason - 3) console.log(`  ${y}: ${ds.length} drivers, ${cs.length} teams, ${raceRows.length} races`);
  }

  // finalize driver/constructor career aggregates
  const driverList = [...drivers.values()].map((d) => {
    d.bySeason.sort((a, b) => Number(b.year) - Number(a.year));
    const sum = (k) => d.bySeason.reduce((s, x) => s + (x[k] || 0), 0);
    const wins = sum("wins"), poles = sum("poles"), podiums = sum("podiums"), races = sum("races");
    const points = Math.round(sum("points") * 10) / 10;
    const championships = d.bySeason.filter((x) => x.position === 1).length;
    const bestPos = Math.min(...d.bySeason.map((x) => x.position).filter((p) => p != null)) || null;
    const latest = d.bySeason[0];
    return {
      id: d.id, code: d.code, first: d.first, last: d.last, name: d.name, nationality: d.nationality,
      country: d.country, flag: d.flag, headshot: d.headshot, latestTeam: latest.team, latestTeamColour: latest.teamColour,
      career: { seasons: d.bySeason.length, wins, poles, podiums, races, points, championships, bestPos, firstYear: Number(d.bySeason[d.bySeason.length - 1].year), lastYear: Number(latest.year) },
      bySeason: d.bySeason,
    };
  }).sort((a, b) => b.career.championships - a.career.championships || b.career.wins - a.career.wins);

  const constructorList = [...constructors.values()].map((c) => {
    c.bySeason.sort((a, b) => Number(b.year) - Number(a.year));
    const wins = c.bySeason.reduce((s, x) => s + x.wins, 0);
    const points = Math.round(c.bySeason.reduce((s, x) => s + x.points, 0) * 10) / 10;
    const championships = c.bySeason.filter((x) => x.position === 1).length;
    const bestPos = Math.min(...c.bySeason.map((x) => x.position).filter((p) => p != null)) || null;
    const latest = c.bySeason[0];
    return {
      id: c.id, name: c.name, colour: c.colour, nationality: c.nationality, country: c.country, flag: c.flag,
      career: { seasons: c.bySeason.length, wins, points, championships, bestPos, lastYear: Number(latest.year), bestStrength: Math.max(...c.bySeason.map((x) => x.strength)) },
      bySeason: c.bySeason,
    };
  }).sort((a, b) => b.career.championships - a.career.championships || b.career.wins - a.career.wins);

  // ---- OpenF1 / MultiViewer: headshots + current-season maps -----------------
  console.log("  fetching current-era headshots + track maps (OpenF1/MultiViewer)…");
  const tracks = {};
  const headshotByName = new Map();
  try {
    // headshots: scan one race's drivers per recent year
    for (const yr of [2023, 2024, 2025, currentSeason]) {
      const races = await get(`${OF1}/sessions?year=${yr}&session_name=Race`);
      const sk = Array.isArray(races) && races.length ? races[Math.floor(races.length / 2)].session_key : null;
      if (!sk) continue;
      const dr = await get(`${OF1}/drivers?session_key=${sk}`);
      for (const d of dr || []) if (d.headshot_url) headshotByName.set(`${d.first_name} ${d.last_name}`.toLowerCase(), { headshot: d.headshot_url, colour: d.team_colour ? `#${d.team_colour}` : null });
    }
    // current-season calendar enrich (circuitKey + maps + countryCode)
    const meetings = await get(`${OF1}/meetings?year=${currentSeason}`);
    const ofRaces = await get(`${OF1}/sessions?year=${currentSeason}&session_name=Race`);
    const raceByMeeting = new Map();
    for (const s of ofRaces || []) raceByMeeting.set(s.meeting_key, s);
    const circuitKeys = new Set();
    const ordered = (meetings || []).filter((m) => !/testing/i.test(m.meeting_name)).sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
    const ofCal = [];
    let round = 0;
    for (const m of ordered) {
      round++;
      circuitKeys.add(m.circuit_key);
      const race = raceByMeeting.get(m.meeting_key);
      let winner = null, winnerName = null;
      if (race && new Date(race.date_end || race.date_start).getTime() < Date.now()) {
        const res = await get(`${OF1}/session_result?session_key=${race.session_key}`);
        const w = (res || []).find((r) => r.position === 1);
        if (w) { const dd = (await get(`${OF1}/drivers?session_key=${race.session_key}&driver_number=${w.driver_number}`))?.[0]; winner = dd?.name_acronym || `#${w.driver_number}`; winnerName = dd?.full_name || null; }
      }
      ofCal.push({ round, name: m.meeting_name, country: m.country_name, countryCode: m.country_code, circuit: m.circuit_short_name, circuitId: null, circuitKey: m.circuit_key, location: m.location, date: m.date_start, raceDate: race?.date_start || m.date_start, winner, winnerName, image: m.circuit_image || null });
      // circuit meta
      tracks[m.circuit_key] = tracks[m.circuit_key] || { key: m.circuit_key, name: m.circuit_short_name, country: m.country_name, countryCode: m.country_code, location: m.location, image: m.circuit_image || null, rotation: 0, x: [], y: [], corners: [] };
    }
    if (ofCal.length) calendars[String(currentSeason)] = ofCal;
    // track maps
    for (const ck of circuitKeys) {
      let map = null;
      for (const yr of [currentSeason, 2025, 2024]) { const data = await get(`${MV}/circuits/${ck}/${yr}`, { retries: 2 }); if (data && Array.isArray(data.x) && data.x.length > 10) { map = data; break; } }
      if (map) {
        const step = Math.max(1, Math.floor(map.x.length / 180));
        const x = [], yy = [];
        for (let i = 0; i < map.x.length; i += step) { x.push(map.x[i]); yy.push(map.y[i]); }
        tracks[ck] = { ...tracks[ck], name: map.circuitName || tracks[ck].name, rotation: map.rotation || 0, x, y: yy, corners: (map.corners || []).map((c) => ({ n: c.number, x: c.trackPosition?.x, y: c.trackPosition?.y })) };
      }
    }
  } catch (e) { console.warn("  OpenF1 enrich partial:", e.message); }

  // attach headshots to drivers by name
  for (const d of driverList) {
    const h = headshotByName.get(d.name.toLowerCase());
    if (h) { d.headshot = h.headshot; if (h.colour) d.latestTeamColour = h.colour; }
  }
  console.log(`  headshots matched: ${driverList.filter((d) => d.headshot).length}`);

  const out = {
    currentSeason, seasons: years, generatedAt: new Date().toISOString(),
    lastRace: (() => { const c = calendars[String(currentSeason)] || []; const done = c.filter((r) => r.winner); const l = done[done.length - 1]; return l ? { name: l.name, date: l.raceDate } : null; })(),
    drivers: driverList, constructors: constructorList, standings, calendars, tracks,
  };

  const file = join(OUT_DIR, "f1.json");
  writeFileSync(file, JSON.stringify(out));

  // race-by-race history → separate file OUTSIDE public/ (read only at build
  // time by driver pages; not shipped to clients).
  const hist = {};
  for (const [id, rows] of history) hist[id] = rows.sort((a, b) => b.season - a.season || b.round - a.round);
  const histFile = join(__dirname, "..", "web", "history.json");
  writeFileSync(histFile, JSON.stringify(hist));

  const totalRows = Object.values(hist).reduce((s, r) => s + r.length, 0);
  console.log(`\nWrote ${driverList.length} drivers, ${constructorList.length} constructors, ${years.length} seasons, ${Object.keys(tracks).length} tracks`);
  console.log(`f1.json: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB · history.json: ${(JSON.stringify(hist).length / 1024).toFixed(0)} KB (${totalRows} race rows) · calls: ${calls}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
