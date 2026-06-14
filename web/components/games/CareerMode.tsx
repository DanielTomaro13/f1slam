"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { loadF1, type Round, type Track } from "@/lib/f1";
import { recordScore } from "@/lib/progress";
import {
  careerRating, carPerf, simulateRace, mulberry32, type Entry, type CarBuild,
} from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import Confetti from "@/components/Confetti";
import TrackMap from "@/components/TrackMap";

const GAME = "career";
const ROUNDS = 12;
const START_MONEY = 70; // $m

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️" },
  { key: "engine", label: "Power Unit", emoji: "⚙️" },
  { key: "aero", label: "Aero", emoji: "🪽" },
  { key: "reliability", label: "Reliability", emoji: "🔧" },
];
const UPGRADE_STEP = 5;
const UPGRADE_COST = 5; // $m per +5

type GEvent = {
  emoji: string; title: string; desc: string;
  kind: "auto" | "choice";
  delta?: number;                 // auto money change
  carBoost?: Partial<Record<Cat, number>>;
  choice?: { yes: string; no: string; stake: number; winChance: number; reward: number };
};

function rollEvent(rng: () => number, money: number): GEvent | null {
  if (rng() < 0.25) return null; // some weekends are quiet
  const events: GEvent[] = [
    { emoji: "💰", title: "Title sponsor signs on", desc: "A backer loves the project and writes a cheque.", kind: "auto", delta: 8 + Math.floor(rng() * 10) },
    { emoji: "👑", title: "Long-lost inheritance", desc: "A distant relative leaves you a surprising sum.", kind: "auto", delta: 12 + Math.floor(rng() * 14) },
    { emoji: "🍀", title: "Lucky windfall", desc: "An old investment finally paid off.", kind: "auto", delta: 6 + Math.floor(rng() * 8) },
    { emoji: "🏭", title: "Wind-tunnel breakthrough", desc: "The aero team found free downforce.", kind: "auto", carBoost: { aero: 6 } },
    { emoji: "⚙️", title: "Engine mapping gains", desc: "A clever tweak unlocks more power.", kind: "auto", carBoost: { engine: 5 } },
    { emoji: "📉", title: "Sponsor pulls out", desc: "A backer gets cold feet and walks.", kind: "auto", delta: -(7 + Math.floor(rng() * 9)) },
    { emoji: "⚖️", title: "FIA fine", desc: "A technical infringement costs you.", kind: "auto", delta: -(5 + Math.floor(rng() * 7)) },
    { emoji: "🛠️", title: "Reliability recall", desc: "A faulty part must be replaced across the fleet.", kind: "auto", delta: -(4 + Math.floor(rng() * 6)), carBoost: { reliability: 4 } },
    { emoji: "🎰", title: "High-roller night", desc: "An investor invites you to the casino.", kind: "choice", choice: { yes: "Place the bet", no: "Walk away", stake: Math.min(money, 10 + Math.floor(rng() * 12)), winChance: 0.45, reward: 2.2 } },
    { emoji: "🧲", title: "Star aerodynamicist available", desc: "Poach them for a serious aero gain — at a price.", kind: "choice", choice: { yes: "Hire (−$15m, +9 aero)", no: "Pass", stake: 15, winChance: 1, reward: 0 } },
  ];
  return events[Math.floor(rng() * events.length)];
}

function buildField(pool: GameDriver[], picked: GameDriver[], player: Entry[]): Entry[] {
  const used = new Set(picked.map((d) => d.id));
  const ai = pool.filter((d) => !used.has(d.id)).slice(0, 18);
  return [
    ...player,
    ...ai.map((d, i) => {
      const r = careerRating(d);
      return {
        id: d.id, name: d.name, code: d.code, team: d.team, colour: d.teamColour,
        driver: r, car: Math.round(Math.min(97, 62 + (r - 60) * 0.7 + (i % 3) - 1)),
        reliability: 0.86 + Math.min(0.1, d.championships * 0.02), isPlayer: false, flag: d.flag, headshot: d.headshot,
      } as Entry;
    }),
  ];
}

export default function CareerMode() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tracks, setTracks] = useState<Record<string, Track>>({});
  const [phase, setPhase] = useState<"setup" | "event" | "garage" | "racing" | "result" | "end">("setup");

  const [picked, setPicked] = useState<GameDriver[]>([]);
  const [q, setQ] = useState("");
  const [teamName, setTeamName] = useState("My Team");
  const [build, setBuild] = useState<Record<Cat, number>>({ chassis: 62, engine: 62, aero: 58, reliability: 58 });
  const [money, setMoney] = useState(START_MONEY);

  const [round, setRound] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [event, setEvent] = useState<GEvent | null>(null);
  const [eventMsg, setEventMsg] = useState<string>("");
  const [lastResultMsg, setLastResultMsg] = useState<string>("");
  const [prize, setPrize] = useState(0);
  const rngRef = useRef<() => number>(mulberry32(1));

  useEffect(() => {
    loadGamesData().then((d) => setPool(d.players));
    loadF1().then((f) => { setRounds((f.calendars[String(f.currentSeason)] || []).slice(0, ROUNDS)); setTracks(f.tracks); });
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return pool.filter((d) => !n || `${d.name} ${d.team}`.toLowerCase().includes(n)).slice(0, 40);
  }, [pool, q]);

  function toggle(d: GameDriver) {
    setPicked((p) => p.find((x) => x.id === d.id) ? p.filter((x) => x.id !== d.id) : p.length < 2 ? [...p, d] : p);
  }

  function playerCar(): number {
    return carPerf({ chassis: build.chassis / 100, engine: build.engine / 100, aero: build.aero / 100, reliability: build.reliability / 100 });
  }

  function start() {
    rngRef.current = mulberry32((Date.now() + picked[0].wins * 131 + picked[1].championships * 17) >>> 0);
    const car = playerCar();
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    const player: Entry[] = picked.map((d) => ({
      id: d.id, name: d.name, code: d.code, team: teamName, colour: "#ff5436",
      driver: careerRating(d), car, reliability: rel, isPlayer: true, flag: d.flag, headshot: d.headshot,
    }));
    setEntries(buildField(pool, picked, player));
    setTally({});
    setRound(0);
    nextEvent();
  }

  function nextEvent() {
    const ev = rollEvent(rngRef.current, money);
    setEvent(ev);
    setEventMsg("");
    if (ev && ev.kind === "auto") {
      let m = money + (ev.delta || 0);
      if (ev.carBoost) applyBoost(ev.carBoost);
      setMoney(m);
      setEventMsg(ev.delta ? `${ev.delta > 0 ? "+" : "−"}$${Math.abs(ev.delta)}m` : "Applied to the car.");
    }
    setPhase("event");
  }

  function applyBoost(boost: Partial<Record<Cat, number>>) {
    setBuild((b) => {
      const nb = { ...b };
      for (const k of Object.keys(boost) as Cat[]) nb[k] = Math.min(100, nb[k] + (boost[k] || 0));
      return nb;
    });
  }

  function resolveChoice(take: boolean) {
    if (event?.choice && take) {
      const c = event.choice;
      if (event.title.includes("aerodynamicist")) {
        if (money >= c.stake) { setMoney((m) => m - c.stake); applyBoost({ aero: 9 }); setEventMsg("Hired — +9 aero."); }
        else setEventMsg("Not enough budget.");
      } else {
        // gamble
        if (money >= c.stake) {
          const win = rngRef.current() < c.winChance;
          setMoney((m) => m - c.stake + (win ? Math.round(c.stake * c.reward) : 0));
          setEventMsg(win ? `You won $${Math.round(c.stake * c.reward) - c.stake}m!` : `You lost $${c.stake}m.`);
        } else setEventMsg("Not enough budget.");
      }
    } else setEventMsg("Passed.");
    setEvent((e) => (e ? { ...e, kind: "auto" } : e)); // collapse choice UI
  }

  function syncPlayerCar() {
    const car = playerCar();
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    setEntries((es) => es.map((e) => e.isPlayer ? { ...e, car, reliability: rel } : e));
  }

  function buy(cat: Cat) {
    if (money < UPGRADE_COST || build[cat] >= 100) return;
    setMoney((m) => m - UPGRADE_COST);
    setBuild((b) => ({ ...b, [cat]: Math.min(100, b[cat] + UPGRADE_STEP) }));
  }

  function startRace() {
    syncPlayerCar();
    setPhase("racing");
    // animation runs ~3.8s then resolve
    setTimeout(() => resolveRace(), 3800);
  }

  function resolveRace() {
    const car = playerCar();
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    const field = entries.map((e) => e.isPlayer ? { ...e, car, reliability: rel } : e);
    const res = simulateRace(field, rngRef.current, 0.3 + rngRef.current() * 0.25);
    const newTally = { ...tally };
    let scored = 0, best = 99, bestName = "";
    res.points.forEach((pts, id) => { newTally[id] = (newTally[id] || 0) + pts; });
    field.filter((e) => e.isPlayer).forEach((e) => {
      const pos = res.order.findIndex((o) => o.id === e.id) + 1;
      const dnf = res.dnf.has(e.id);
      const pts = res.points.get(e.id) || 0;
      scored += pts;
      if (!dnf && pos < best) { best = pos; bestName = e.name; }
    });
    // prize money: points + result bonus
    const reward = Math.round(scored * 1.2 + (best === 1 ? 8 : best <= 3 ? 4 : 0));
    setMoney((m) => m + reward);
    setPrize(reward);
    setTally(newTally);
    setLastResultMsg(best < 99 ? `Best finish: P${best} (${bestName}) · +${scored} pts · +$${reward}m` : `Both cars retired — no points, no prize.`);
    setEntries(field);
    setPhase("result");
  }

  function advance() {
    if (round + 1 >= rounds.length) { finish(); return; }
    setRound((r) => r + 1);
    nextEvent();
  }

  function finish() {
    const myScore = entries.filter((e) => e.isPlayer).reduce((mx, e) => Math.max(mx, tally[e.id] || 0), 0);
    recordScore(GAME, myScore);
    setPhase("end");
  }

  function reset() {
    setPhase("setup"); setPicked([]); setMoney(START_MONEY); setRound(0); setTally({});
    setBuild({ chassis: 62, engine: 62, aero: 58, reliability: 58 });
  }

  if (pool.length === 0 || rounds.length === 0) return <p style={{ color: "var(--muted)" }}>Loading season…</p>;

  const r = rounds[round];
  const track = r ? tracks[String(r.circuitKey)] : null;
  const standings = [...entries].map((e) => ({ e, pts: tally[e.id] || 0 })).sort((a, b) => b.pts - a.pts);
  const myBest = standings.find((s) => s.e.isPlayer);
  const myPos = myBest ? standings.indexOf(myBest) + 1 : 0;

  // ---- SETUP ----
  if (phase === "setup") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Sign two drivers, build a car and run a championship campaign. Manage a budget, take upgrades and
          gambles between rounds, and watch each race play out. ({picked.length}/2 drivers)
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {picked.map((d) => (
            <span key={d.id} className="chip" style={{ borderColor: "var(--accent)", color: "var(--text)" }}>
              {d.flag} {d.name} <button onClick={() => toggle(d)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>✕</button>
            </span>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drivers…"
          style={{ padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", maxHeight: 320, overflowY: "auto" }} className="scroll-x">
          {filtered.map((d) => {
            const on = picked.find((x) => x.id === d.id);
            return (
              <button key={d.id} onClick={() => toggle(d)} className="card"
                style={{ padding: "0.6rem", textAlign: "left", cursor: "pointer", color: "var(--text)", borderColor: on ? "var(--accent)" : "var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.headshot || ""} alt="" width={34} height={34} loading="lazy" style={{ borderRadius: 8, background: "var(--panel-2)", objectFit: "cover" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.flag} {d.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: ".7rem" }}>OVR {careerRating(d)}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 700 }}>Team</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value.slice(0, 22))}
            style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
        </div>
        <button className="btn btn-primary" disabled={picked.length !== 2} onClick={start} style={{ justifySelf: "start" }}>
          🏁 Begin the season
        </button>
      </div>
    );
  }

  const HUD = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <span className="chip">Round {round + 1}/{rounds.length}</span>
      <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>💵 ${money}m</span>
      <span className="chip">🏆 P{myPos} · {myBest?.pts ?? 0} pts</span>
      <span className="chip" style={{ marginLeft: "auto" }}>{r?.countryCode ? `${r.name}` : ""}</span>
    </div>
  );

  // ---- EVENT ----
  if (phase === "event") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        {HUD}
        {event ? (
          <div className="card" style={{ padding: "1.3rem", textAlign: "center", display: "grid", gap: 8 }}>
            <div style={{ fontSize: "2.2rem" }}>{event.emoji}</div>
            <h3 style={{ margin: 0 }}>{event.title}</h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>{event.desc}</p>
            {event.kind === "choice" && event.choice && !eventMsg ? (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 6 }}>
                <button className="btn btn-primary" onClick={() => resolveChoice(true)}>{event.choice.yes}</button>
                <button className="btn" onClick={() => resolveChoice(false)}>{event.choice.no}</button>
              </div>
            ) : (
              <div style={{ color: "var(--accent)", fontWeight: 800 }}>{eventMsg}</div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: "1.3rem", textAlign: "center", color: "var(--muted)" }}>A quiet week in the paddock. On to the garage.</div>
        )}
        {(!event || event.kind === "auto" || eventMsg) && (
          <button className="btn btn-primary" onClick={() => setPhase("garage")} style={{ justifySelf: "center" }}>To the garage →</button>
        )}
      </div>
    );
  }

  // ---- GARAGE (upgrades) ----
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

  // ---- RACING (animation) ----
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
        <button className="btn btn-primary" onClick={advance} style={{ justifySelf: "center" }}>
          {round + 1 >= rounds.length ? "Finish season" : "Next round →"}
        </button>
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
        <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: won ? "var(--gold)" : "var(--text)", textTransform: "uppercase" }}>
          {won ? "🏆 Champions!" : `Season over — P${myPos}`}
        </div>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          You finished P{myPos} with {myScore} points and ${money}m in the bank. Champion: {champ?.e.flag} {champ?.e.name}.
        </p>
        <ScoreSubmit game={GAME} score={myScore} unit="pts" />
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={reset}>New career</button>
          <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
        </div>
      </div>
    </div>
  );
}
