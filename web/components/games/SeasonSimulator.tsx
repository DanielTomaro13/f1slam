"use client";
import { useEffect, useMemo, useState } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import {
  driverRating, carPerf, simulateSeason, type Entry, type CarBuild,
} from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import Confetti from "@/components/Confetti";

const GAME = "season-sim";
const BUDGET = 250;       // development points to spend across the build
const ROUNDS = 24;

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string; hint: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️", hint: "Cornering & overall pace" },
  { key: "engine", label: "Power Unit", emoji: "⚙️", hint: "Straight-line speed" },
  { key: "aero", label: "Aerodynamics", emoji: "🪽", hint: "Downforce & efficiency" },
  { key: "reliability", label: "Reliability", emoji: "🔧", hint: "Fewer DNFs — but no pace" },
];

/** AI field: real drivers with car perf correlated to their real form. */
function buildField(pool: GameDriver[], picked: GameDriver[], playerEntries: Entry[]): Entry[] {
  const used = new Set(picked.map((d) => d.id));
  const ai = pool.filter((d) => !used.has(d.id)).slice(0, 18);
  const maxPpr = Math.max(...ai.map((d) => d.points / Math.max(1, d.races)), 1);
  const aiEntries: Entry[] = ai.map((d, i) => {
    const ppr = d.points / Math.max(1, d.races);
    const car = 66 + (ppr / maxPpr) * 30 + (i % 3) - 1; // strong field: 66..96
    return {
      id: d.id, name: d.name, code: d.code, team: d.team, colour: d.teamColour,
      driver: driverRating(d), car: Math.round(Math.min(97, car)),
      reliability: 0.86 + (ppr / maxPpr) * 0.1, isPlayer: false, flag: d.flag, headshot: d.headshot,
    };
  });
  return [...playerEntries, ...aiEntries];
}

export default function SeasonSimulator() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [picked, setPicked] = useState<GameDriver[]>([]);
  const [q, setQ] = useState("");
  const [teamName, setTeamName] = useState("My Team");
  const [build, setBuild] = useState<Record<Cat, number>>({ chassis: 65, engine: 65, aero: 60, reliability: 60 });
  const [result, setResult] = useState<ReturnType<typeof simulateSeason> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadGamesData().then((d) => setPool(d.drivers)); }, []);

  const spent = CATS.reduce((s, c) => s + build[c.key], 0);
  const remaining = BUDGET - spent;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return pool.filter((d) => !n || `${d.name} ${d.team}`.toLowerCase().includes(n)).slice(0, 40);
  }, [pool, q]);

  function toggle(d: GameDriver) {
    setPicked((p) => p.find((x) => x.id === d.id) ? p.filter((x) => x.id !== d.id) : p.length < 2 ? [...p, d] : p);
  }
  function setCat(k: Cat, v: number) {
    v = Math.max(20, Math.min(100, v));
    setBuild((b) => {
      const other = CATS.reduce((s, c) => s + (c.key === k ? 0 : b[c.key]), 0);
      if (other + v > BUDGET) v = BUDGET - other;
      return { ...b, [k]: v };
    });
  }

  function run() {
    setBusy(true);
    const cb: CarBuild = {
      chassis: build.chassis / 100, engine: build.engine / 100,
      aero: build.aero / 100, reliability: build.reliability / 100,
    };
    const car = carPerf(cb);
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    const playerEntries: Entry[] = picked.map((d) => ({
      id: d.id, name: d.name, code: d.code, team: teamName, colour: "#ff5436",
      driver: driverRating(d), car, reliability: rel, isPlayer: true, flag: d.flag, headshot: d.headshot,
    }));
    const field = buildField(pool, picked, playerEntries);
    const seed = (picked[0].id * 131 + picked[1].id * 17 + car * 7 + spent) >>> 0;
    setResult(simulateSeason(field, ROUNDS, seed));
    setStep(3);
    setBusy(false);
  }

  function reset() { setResult(null); setStep(1); }

  if (pool.length === 0) return <p style={{ color: "var(--muted)" }}>Loading drivers…</p>;

  // ---- RESULTS ----
  if (step === 3 && result) {
    const champ = result.drivers[0];
    const myDrivers = result.drivers.filter((s) => s.entry.isPlayer);
    const myTeamPos = result.constructors.findIndex((t) => t.team === teamName) + 1;
    const driverTitle = champ.entry.isPlayer;
    const slam = myDrivers.some((s) => s.wins === ROUNDS);
    const won = driverTitle || myTeamPos === 1;
    const score = Math.max(...myDrivers.map((s) => s.points), 0);

    return (
      <div style={{ display: "grid", gap: 16 }}>
        {(won || slam) && <Confetti />}
        <div className="card pop" style={{ padding: "1.4rem", textAlign: "center", borderColor: won ? "var(--gold)" : "var(--border)" }}>
          {slam ? (
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: "var(--gold)", textTransform: "uppercase" }}>🏁 The Slam! A perfect season</div>
          ) : driverTitle ? (
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: "var(--gold)", textTransform: "uppercase" }}>🏆 World Champions!</div>
          ) : myTeamPos === 1 ? (
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.6rem", color: "var(--gold)", textTransform: "uppercase" }}>🏆 Constructors&apos; Champions!</div>
          ) : (
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.5rem", textTransform: "uppercase" }}>Season complete — P{myTeamPos} constructors</div>
          )}
          <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
            Drivers&apos; champion: <strong style={{ color: "var(--text)" }}>{champ.entry.flag} {champ.entry.name}</strong> ({champ.points} pts)
          </p>
        </div>

        <Standings title="Drivers' Championship" rows={result.drivers.map((s, i) => ({
          pos: i + 1, label: `${s.entry.flag} ${s.entry.name}`, sub: s.entry.team, pts: s.points, mine: s.entry.isPlayer,
        }))} />
        <Standings title="Constructors' Championship" rows={result.constructors.map((t, i) => ({
          pos: i + 1, label: t.team, sub: "", pts: t.points, mine: t.team === teamName,
        }))} />

        <div className="card" style={{ padding: "1.1rem", textAlign: "center", display: "grid", gap: 10 }}>
          <ScoreSubmit game={GAME} score={score} unit="pts" />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={reset}>New season</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      </div>
    );
  }

  // ---- BUILD FLOW ----
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2].map((n) => (
          <span key={n} className="chip" style={{ borderColor: step === n ? "var(--accent)" : "var(--border)", color: step === n ? "var(--accent)" : "var(--muted)" }}>
            {n}. {n === 1 ? "Drivers" : "Build the car"}
          </span>
        ))}
      </div>

      {step === 1 && (
        <>
          <p style={{ color: "var(--muted)", margin: 0 }}>Sign <strong style={{ color: "var(--text)" }}>two</strong> drivers ({picked.length}/2 chosen).</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {picked.map((d) => (
              <span key={d.id} className="chip" style={{ borderColor: "var(--accent)", color: "var(--text)" }}>
                {d.flag} {d.name} <button onClick={() => toggle(d)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>✕</button>
              </span>
            ))}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drivers…" aria-label="Search drivers"
            style={{ padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", maxHeight: 360, overflowY: "auto" }} className="scroll-x">
            {filtered.map((d) => {
              const on = picked.find((x) => x.id === d.id);
              return (
                <button key={d.id} onClick={() => toggle(d)} className="card"
                  style={{ padding: "0.7rem", textAlign: "left", cursor: "pointer", color: "var(--text)", borderColor: on ? "var(--accent)" : "var(--border)", display: "flex", gap: 8, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.headshot || ""} alt="" width={36} height={36} loading="lazy" style={{ borderRadius: 8, background: "var(--panel-2)", objectFit: "cover" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: ".82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.flag} {d.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: ".72rem" }}>OVR {driverRating(d)} · {d.team}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={picked.length !== 2} onClick={() => setStep(2)} style={{ justifySelf: "start" }}>
            Next: build the car →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 700 }}>Team name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value.slice(0, 22))} maxLength={22}
              style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
            <span className="chip" style={{ marginLeft: "auto", color: remaining < 0 ? "var(--danger)" : "var(--gold)", borderColor: remaining < 0 ? "var(--danger)" : "var(--gold)" }}>
              Budget left: {remaining}
            </span>
          </div>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: ".88rem" }}>
            Spend {BUDGET} development points. Pace wins races, but skimp on reliability and your cars won&apos;t finish.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {CATS.map((c) => (
              <div key={c.key} className="card" style={{ padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong>{c.emoji} {c.label}</strong>
                  <span style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{build[c.key]}</span>
                </div>
                <input type="range" min={20} max={100} value={build[c.key]} onChange={(e) => setCat(c.key, Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }} aria-label={c.label} />
                <div style={{ color: "var(--muted)", fontSize: ".74rem" }}>{c.hint}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setStep(1)}>← Drivers</button>
            <button className="btn btn-primary" disabled={busy || remaining < 0} onClick={run}>🏁 Simulate {ROUNDS}-race season</button>
          </div>
        </>
      )}
    </div>
  );
}

function Standings({ title, rows }: { title: string; rows: { pos: number; label: string; sub: string; pts: number; mine: boolean }[] }) {
  return (
    <div className="card scroll-x">
      <div style={{ padding: "0.8rem 1rem 0", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>{title}</div>
      <table className="stat">
        <tbody>
          {rows.map((r) => (
            <tr key={r.pos + r.label} style={{ background: r.mine ? "rgba(255,84,54,0.10)" : undefined }}>
              <td style={{ fontFamily: "var(--font-mono)", width: 32 }}>{r.pos}</td>
              <td style={{ fontWeight: r.mine ? 800 : 600 }}>{r.label}{r.mine && " ◀"}</td>
              <td style={{ color: "var(--muted)" }}>{r.sub}</td>
              <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", textAlign: "right" }}>{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
