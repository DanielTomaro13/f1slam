"use client";
import { useEffect, useRef, useState } from "react";
import { loadGamesData, type SeasonPick, type CarPick } from "@/lib/games-data";
import { loadF1, type Round, type Track } from "@/lib/f1";
import { recordScore } from "@/lib/progress";
import { carPerf, simulateRace, mulberry32, type Entry } from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import ShareButtons from "@/components/ShareButtons";
import Confetti from "@/components/Confetti";
import TrackMap from "@/components/TrackMap";
import { DriverSpin, CarSpin, SponsorSpin, sample, type Sponsor } from "@/components/games/Spins";
import { fanfare, settle, isMuted, setMuted, tap } from "@/lib/sound";

const GAME = "career";
const ROUNDS = 12;
const UPGRADE_STEP = 5;
const UPGRADE_COST = 6; // $m per +5

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️" },
  { key: "engine", label: "Power Unit", emoji: "⚙️" },
  { key: "aero", label: "Aero", emoji: "🪽" },
  { key: "reliability", label: "Reliability", emoji: "🔧" },
];

// sponsor.value = starting money ($m)
const SPONSORS: Sponsor[] = [
  { name: "Crypto Exchange", emoji: "🪙", blurb: "Volatile money, enormous cheque.", value: 140 },
  { name: "Oil Major", emoji: "🛢️", blurb: "Old money, deep pockets.", value: 130 },
  { name: "Streaming Giant", emoji: "📺", blurb: "Wants the drama — and pays for it.", value: 115 },
  { name: "Telecoms Titan", emoji: "📡", blurb: "Coverage everywhere, including your wallet.", value: 100 },
  { name: "Global Energy", emoji: "🥤", blurb: "Gives you wings and a healthy float.", value: 88 },
  { name: "Airline", emoji: "🛫", blurb: "First-class backing.", value: 76 },
  { name: "Startup Unicorn", emoji: "🦄", blurb: "Burning VC cash — your gain.", value: 64 },
  { name: "Fashion House", emoji: "👗", blurb: "Style and a respectable sum.", value: 54 },
  { name: "Luxury Watches", emoji: "⌚", blurb: "Precision money.", value: 46 },
  { name: "National Lottery", emoji: "🎟️", blurb: "Someone's got to win.", value: 38 },
  { name: "Family Money", emoji: "👑", blurb: "A modest windfall from the relatives.", value: 30 },
  { name: "Hardware Store", emoji: "🔩", blurb: "Local, loyal — and a little tight.", value: 20 },
];

type GEvent = {
  emoji: string; title: string; desc: string; weight: number;
  kind: "auto" | "choice";
  money?: [number, number];          // random money delta range
  carBoost?: Partial<Record<Cat, number>>; // can be negative (damage)
  choice?: { yes: string; no: string };
};

// The paddock is a harsh place — most weeks something goes wrong. Bad events are
// weighted higher than good ones, and several knock the car backwards.
const EVENTS: GEvent[] = [
  // —— good (rare, modest) ——
  { emoji: "💰", title: "Minor sponsor boost", desc: "A backer chips in a little extra.", weight: 4, kind: "auto", money: [4, 9] },
  { emoji: "🏭", title: "Wind-tunnel gain", desc: "The aero team found a little downforce.", weight: 4, kind: "auto", carBoost: { aero: 4 } },
  { emoji: "⚙️", title: "Engine mapping tweak", desc: "A clever map unlocks a touch more power.", weight: 4, kind: "auto", carBoost: { engine: 3 } },
  { emoji: "🍀", title: "Lucky break", desc: "An old investment finally paid off.", weight: 4, kind: "auto", money: [5, 10] },
  // —— bad: money (common) ——
  { emoji: "💸", title: "Sponsor walks", desc: "A backer gets cold feet and pulls the cheque.", weight: 6, kind: "auto", money: [-18, -9] },
  { emoji: "⚖️", title: "FIA fine", desc: "A technical infringement costs you dearly.", weight: 5, kind: "auto", money: [-13, -6] },
  { emoji: "📉", title: "Budget overrun", desc: "The development bill came in way over.", weight: 5, kind: "auto", money: [-11, -5] },
  { emoji: "🗞️", title: "Bad press", desc: "A PR mess scares off a partner.", weight: 4, kind: "auto", money: [-9, -4] },
  // —— bad: car damage (the painful ones) ——
  { emoji: "💥", title: "Practice crash", desc: "Your driver binned it in practice — chassis damage and a repair bill.", weight: 6, kind: "auto", carBoost: { chassis: -7 }, money: [-12, -6] },
  { emoji: "🔧", title: "Engine blow-up", desc: "A power unit let go on the dyno. Penalty parts cost pace.", weight: 5, kind: "auto", carBoost: { engine: -6 }, money: [-9, -4] },
  { emoji: "🛞", title: "Reliability gremlins", desc: "A spate of failures forces a conservative rebuild.", weight: 5, kind: "auto", carBoost: { reliability: -6 }, money: [-7, -3] },
  { emoji: "🌧️", title: "Lost test day", desc: "Weather wiped out testing — the aero update is unvalidated.", weight: 5, kind: "auto", carBoost: { aero: -5 } },
  { emoji: "🏚️", title: "Wind-tunnel breakdown", desc: "The tunnel went down mid-programme. Downforce regresses.", weight: 4, kind: "auto", carBoost: { aero: -4 }, money: [-6, -2] },
  // —— choices ——
  { emoji: "🎰", title: "High-roller night", desc: "An investor invites you to the casino. Risk it?", weight: 3, kind: "choice", choice: { yes: "Bet 15", no: "Walk away" } },
  { emoji: "🧲", title: "Star aerodynamicist", desc: "Poach a big name for a serious aero gain — at a price.", weight: 3, kind: "choice", choice: { yes: "Hire (−18, +9 aero)", no: "Pass" } },
];

function buildField(ai: SeasonPick[], used: Set<string>, player: Entry[]): Entry[] {
  const pool = ai.filter((p) => !used.has(p.driverId)).slice(0, 18);
  return [
    ...player,
    ...pool.map((p) => ({
      id: p.key, name: p.name, code: p.code, team: `${p.year} ${p.team}`, colour: p.teamColour,
      driver: p.rating, car: Math.round(Math.min(96, 60 + (p.rating - 60) * 0.72 + (p.wins > 0 ? 6 : 0))),
      reliability: 0.88, isPlayer: false, flag: p.flag, headshot: p.headshot,
    } as Entry)),
  ];
}

export default function CareerMode() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGamesData>> | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tracks, setTracks] = useState<Record<string, Track>>({});
  const [phase, setPhase] = useState<"d1" | "d2" | "car" | "sponsor" | "event" | "garage" | "racing" | "result" | "end">("d1");

  const [d1, setD1] = useState<SeasonPick | null>(null);
  const [d2, setD2] = useState<SeasonPick | null>(null);
  const [car, setCar] = useState<CarPick | null>(null);
  const [teamName, setTeamName] = useState("My Team");
  const [build, setBuild] = useState<Record<Cat, number>>({ chassis: 55, engine: 55, aero: 55, reliability: 55 });
  const [money, setMoney] = useState(0);

  const [round, setRound] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [event, setEvent] = useState<GEvent | null>(null);
  const [eventMsg, setEventMsg] = useState("");
  const [lastResultMsg, setLastResultMsg] = useState("");
  const [muted, setMutedState] = useState(false);
  const rngRef = useRef<() => number>(mulberry32(1));

  useEffect(() => {
    loadGamesData().then(setData);
    loadF1().then((f) => { setRounds((f.calendars[String(f.currentSeason)] || []).slice(0, ROUNDS)); setTracks(f.tracks); });
    setMutedState(isMuted());
  }, []);

  function toggleMute() { const m = !muted; setMutedState(m); setMuted(m); if (!m) tap(); }
  function playerCar() { return carPerf({ chassis: build.chassis / 100, engine: build.engine / 100, aero: build.aero / 100, reliability: build.reliability / 100 }); }
  const playerRel = () => 0.78 + (build.reliability / 100) * 0.2;
  const adjust = (delta: number) => setMoney((m) => Math.max(0, Math.round(m + delta)));
  function applyBoost(boost: Partial<Record<Cat, number>>) {
    setBuild((b) => { const nb = { ...b }; for (const k of Object.keys(boost) as Cat[]) nb[k] = Math.max(20, Math.min(100, nb[k] + (boost[k] || 0))); return nb; });
  }

  // ---- setup spins ----
  function pickD1(p: SeasonPick) { setD1(p); setPhase("d2"); }
  function pickD2(p: SeasonPick) { setD2(p); setPhase("car"); }
  function pickCarOpt(c: CarPick) { setCar(c); const base = Math.round(c.strength * 0.6 + 30); setBuild({ chassis: base, engine: base, aero: base, reliability: base }); setPhase("sponsor"); }
  function pickSponsor(s: Sponsor) {
    if (!d1 || !d2 || !data) return;
    setMoney(s.value);
    rngRef.current = mulberry32((Date.now() + d1.rating * 131 + d2.rating * 17 + s.value) >>> 0);
    const player: Entry[] = [d1, d2].map((p) => ({
      id: p.key, name: p.name, code: p.code, team: teamName, colour: "#ff5436",
      driver: p.rating, car: 60, reliability: 0.85, isPlayer: true, flag: p.flag, headshot: p.headshot,
    }));
    setEntries(buildField(data.driverSeasons, new Set([d1.driverId, d2.driverId]), player));
    setTally({});
    setRound(0);
    nextEvent();
  }

  // ---- season loop ----
  function nextEvent() {
    let ev: GEvent | null = null;
    const r = rngRef.current;
    if (r() >= 0.12) {
      const total = EVENTS.reduce((s, e) => s + e.weight, 0);
      let pick = r() * total;
      for (const e of EVENTS) { pick -= e.weight; if (pick <= 0) { ev = e; break; } }
    }
    setEvent(ev);
    setEventMsg("");
    if (ev && ev.kind === "auto") {
      let msg = "";
      if (ev.money) { const d = Math.round(ev.money[0] + r() * (ev.money[1] - ev.money[0])); adjust(d); msg += `${d >= 0 ? "+" : "−"}$${Math.abs(d)}m `; }
      if (ev.carBoost) { applyBoost(ev.carBoost); const parts = Object.entries(ev.carBoost).map(([k, v]) => `${v! >= 0 ? "+" : ""}${v} ${k}`); msg += parts.join(", "); }
      setEventMsg(msg.trim() || "Noted.");
    }
    setPhase("event");
  }

  function resolveChoice(take: boolean) {
    const r = rngRef.current;
    if (event && take) {
      if (event.title.includes("aerodynamicist")) {
        if (money >= 18) { adjust(-18); applyBoost({ aero: 9 }); setEventMsg("Hired — +9 aero, −$18m."); }
        else setEventMsg("Not enough money.");
      } else { // casino
        if (money >= 15) { const win = r() < 0.45; adjust(win ? 18 : -15); setEventMsg(win ? "You won $18m!" : "You lost $15m."); }
        else setEventMsg("Not enough money.");
      }
    } else setEventMsg("Passed.");
    setEvent((e) => (e ? { ...e, kind: "auto" } : e));
  }

  function buy(cat: Cat) {
    if (money < UPGRADE_COST || build[cat] >= 100) return;
    adjust(-UPGRADE_COST);
    setBuild((b) => ({ ...b, [cat]: Math.min(100, b[cat] + UPGRADE_STEP) }));
  }

  function startRace() { setPhase("racing"); setTimeout(resolveRace, 3600); }

  function resolveRace() {
    const car = playerCar(), rel = playerRel();
    const field = entries.map((e) => (e.isPlayer ? { ...e, car, reliability: rel } : e));
    const res = simulateRace(field, rngRef.current, 0.3 + rngRef.current() * 0.25);
    const nt = { ...tally };
    res.points.forEach((pts, id) => { nt[id] = (nt[id] || 0) + pts; });
    let scored = 0, best = 99, bestName = "";
    field.filter((e) => e.isPlayer).forEach((e) => {
      const pos = res.order.findIndex((o) => o.id === e.id) + 1;
      const dnf = res.dnf.has(e.id);
      scored += res.points.get(e.id) || 0;
      if (!dnf && pos < best) { best = pos; bestName = e.name; }
    });
    const reward = Math.round(scored * 0.9 + (best === 1 ? 6 : best <= 3 ? 3 : 0));
    adjust(reward);
    setTally(nt);
    setEntries(field);
    setLastResultMsg(best < 99 ? `Best finish: P${best} (${bestName}) · +${scored} pts · +$${reward}m` : "Both cars retired — no points, no prize.");
    if (best === 1) fanfare(); else settle();
    setPhase("result");
  }

  function advance() {
    if (round + 1 >= rounds.length) { const ms = entries.filter((e) => e.isPlayer).reduce((mx, e) => Math.max(mx, tally[e.id] || 0), 0); recordScore(GAME, ms); setPhase("end"); return; }
    setRound((x) => x + 1);
    nextEvent();
  }

  function reset() {
    setPhase("d1"); setD1(null); setD2(null); setCar(null); setMoney(0); setRound(0); setTally({}); setEntries([]);
    setBuild({ chassis: 55, engine: 55, aero: 55, reliability: 55 });
  }

  if (!data || rounds.length === 0) return <p style={{ color: "var(--muted)" }}>Loading the season…</p>;

  const r = rounds[round];
  const track = r ? tracks[String(r.circuitKey)] : null;
  const standings = [...entries].map((e) => ({ e, pts: tally[e.id] || 0 })).sort((a, b) => b.pts - a.pts);
  const myBest = standings.find((s) => s.e.isPlayer);
  const myPos = myBest ? standings.indexOf(myBest) + 1 : 0;

  // ---- SETUP (spins) ----
  if (phase === "d1" || phase === "d2" || phase === "car" || phase === "sponsor") {
    const step = phase === "d1" ? 1 : phase === "d2" ? 2 : phase === "car" ? 3 : 4;
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {["Driver 1", "Driver 2", "Car", "Sponsor"].map((lbl, i) => (
            <span key={lbl} className="chip" style={{ borderColor: i + 1 === step ? "var(--accent)" : "var(--border)", color: i + 1 < step ? "var(--accent-2)" : i + 1 === step ? "var(--accent)" : "var(--muted)" }}>{i + 1 < step ? "✓ " : ""}{lbl}</span>
          ))}
          <button className="chip" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} style={{ marginLeft: "auto", cursor: "pointer", color: "var(--text)" }}>{muted ? "🔇" : "🔊"}</button>
        </div>
        {(d1 || car) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".82rem" }}>
            {d1 && <span className="chip">👤 {d1.year} {d1.flag} {d1.name}</span>}
            {d2 && <span className="chip">👤 {d2.year} {d2.flag} {d2.name}</span>}
            {car && <span className="chip" style={{ borderColor: car.colour }}>🏎️ {car.year} {car.name}</span>}
          </div>
        )}
        {phase === "sponsor" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 700 }}>Team</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value.slice(0, 22))} style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
          </div>
        )}
        {phase === "d1" && <DriverSpin pool={data.driverSeasons} exclude={[]} onPick={pickD1} which="first" key="d1" />}
        {phase === "d2" && <DriverSpin pool={data.driverSeasons} exclude={d1 ? [d1.driverId] : []} onPick={pickD2} which="second" key="d2" />}
        {phase === "car" && <CarSpin pool={data.carSeasons} onPick={pickCarOpt} />}
        {phase === "sponsor" && <SponsorSpin sponsors={SPONSORS} onPick={pickSponsor} unit="$m to start" />}
      </div>
    );
  }

  const HUD = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span className="chip">Round {round + 1}/{rounds.length}</span>
      <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>💵 ${money}m</span>
      <span className="chip">🏆 P{myPos} · {myBest?.pts ?? 0} pts</span>
      <span className="chip">🏎️ car {playerCar()}</span>
      <button className="chip" onClick={toggleMute} style={{ marginLeft: "auto", cursor: "pointer", color: "var(--text)" }}>{muted ? "🔇" : "🔊"}</button>
    </div>
  );

  // ---- EVENT ----
  if (phase === "event") {
    const isLoss = event?.money && event.money[1] < 0 || (event?.carBoost && Object.values(event.carBoost).some((v) => (v ?? 0) < 0));
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {HUD}
        {event ? (
          <div className="card" style={{ padding: "1.3rem", textAlign: "center", display: "grid", gap: 8, borderColor: isLoss ? "var(--danger)" : "var(--border)" }}>
            <div style={{ fontSize: "2.2rem" }}>{event.emoji}</div>
            <h3 style={{ margin: 0 }}>{event.title}</h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>{event.desc}</p>
            {event.kind === "choice" && event.choice && !eventMsg ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                <button className="btn btn-primary" onClick={() => resolveChoice(true)}>{event.choice.yes}</button>
                <button className="btn" onClick={() => resolveChoice(false)}>{event.choice.no}</button>
              </div>
            ) : <div style={{ color: isLoss ? "var(--danger)" : "var(--accent-2)", fontWeight: 800 }}>{eventMsg}</div>}
          </div>
        ) : <div className="card" style={{ padding: "1.3rem", textAlign: "center", color: "var(--muted)" }}>A rare quiet week in the paddock.</div>}
        {(!event || event.kind === "auto" || eventMsg) && <button className="btn btn-primary" onClick={() => setPhase("garage")} style={{ justifySelf: "center" }}>To the garage →</button>}
      </div>
    );
  }

  // ---- GARAGE ----
  if (phase === "garage") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {HUD}
        <div className="card" style={{ padding: "1rem", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>🔧 Development — ${UPGRADE_COST}m per +{UPGRADE_STEP}</strong>
            <span style={{ color: "var(--muted)" }}>Car rating {playerCar()}</span>
          </div>
          {CATS.map((c) => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 110 }}>{c.emoji} {c.label}</span>
              <div style={{ flex: 1, height: 8, background: "var(--panel-2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${build[c.key]}%`, height: "100%", background: "var(--accent)" }} />
              </div>
              <span style={{ fontFamily: "var(--font-cond)", width: 30, textAlign: "right" }}>{build[c.key]}</span>
              <button className="btn" disabled={money < UPGRADE_COST || build[c.key] >= 100} onClick={() => buy(c.key)} style={{ minHeight: 34, padding: "0.2rem 0.6rem" }}>+{UPGRADE_STEP}</button>
            </div>
          ))}
        </div>
        {track && (
          <div className="card" style={{ padding: "0.8rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong>Next up: {r.name}</strong>
              <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{r.circuit}, {r.country}</span>
            </div>
            <TrackMap track={track} height={170} animate lapSeconds={7} />
          </div>
        )}
        <button className="btn btn-primary" onClick={startRace} style={{ justifySelf: "center" }}>🚦 Start the race</button>
      </div>
    );
  }

  // ---- RACING ----
  if (phase === "racing") {
    const racers = entries.slice(0, 12).map((e, i) => ({ colour: e.isPlayer ? "#ff5436" : e.colour, offset: i / 12 }));
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {HUD}
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-cond)", textTransform: "uppercase", marginBottom: 6 }}>🏁 {r.name} — lights out!</div>
          {track ? <TrackMap track={track} height={260} racers={racers} lapSeconds={2.4} /> : <p>Racing…</p>}
          <div style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 6 }}>Your cars are in red.</div>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (phase === "result") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {HUD}
        <div className="card pop" style={{ padding: "1.2rem", textAlign: "center", display: "grid", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.3rem", textTransform: "uppercase" }}>{r.name} — result</div>
          <div style={{ color: "var(--gold)", fontWeight: 700 }}>{lastResultMsg}</div>
        </div>
        <div className="card scroll-x">
          <table className="stat">
            <thead><tr><th>#</th><th>Driver</th><th>Team</th><th>Season pts</th></tr></thead>
            <tbody>
              {standings.slice(0, 10).map((s, i) => (
                <tr key={s.e.id} style={{ background: s.e.isPlayer ? "rgba(255,84,54,0.10)" : undefined }}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                  <td style={{ fontWeight: s.e.isPlayer ? 800 : 600 }}>{s.e.flag} {s.e.name}{s.e.isPlayer && " ◀"}</td>
                  <td style={{ color: "var(--muted)" }}>{s.e.team}</td>
                  <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary" onClick={advance} style={{ justifySelf: "center" }}>{round + 1 >= rounds.length ? "Finish season" : "Next round →"}</button>
      </div>
    );
  }

  // ---- END ----
  const champ = standings[0];
  const myScore = myBest?.pts ?? 0;
  const won = champ?.e.isPlayer || myPos === 1;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {won && <Confetti />}
      <div className="card pop" style={{ padding: "1.4rem", textAlign: "center", borderColor: won ? "var(--gold)" : "var(--border)", display: "grid", gap: 8 }}>
        <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: won ? "var(--gold)" : "var(--text)", textTransform: "uppercase" }}>{won ? "🏆 Champions!" : `Season over — P${myPos}`}</div>
        <p style={{ color: "var(--muted)", margin: 0 }}>You finished P{myPos} with {myScore} points and ${money}m in the bank. Champion: {champ?.e.flag} {champ?.e.name}.</p>
        <ShareButtons
          card={{ eyebrow: "Career Mode", big: `P${myPos}`, headline: won ? "CHAMPIONS" : "SEASON OVER", lines: [teamName, `${myScore} championship points`, `$${money}m in the bank`], path: "/games/career" }}
          caption={`I finished P${myPos} (${myScore} pts) running ${teamName} in F1Slam Career Mode 🏎️ Think you can do better?`}
        />
        <ScoreSubmit game={GAME} score={myScore} unit="pts" />
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={reset}>New career</button>
          <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
        </div>
      </div>
    </div>
  );
}
