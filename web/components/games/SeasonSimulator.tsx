"use client";
import { useEffect, useRef, useState } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import { driverRating, carPerf, simulateSeason, type Entry, type CarBuild } from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import Confetti from "@/components/Confetti";

const GAME = "season-sim";
const ROUNDS = 24;
const OPTIONS = 5;

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string; hint: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️", hint: "Cornering & overall pace" },
  { key: "engine", label: "Power Unit", emoji: "⚙️", hint: "Straight-line speed" },
  { key: "aero", label: "Aerodynamics", emoji: "🪽", hint: "Downforce & efficiency" },
  { key: "reliability", label: "Reliability", emoji: "🔧", hint: "Fewer DNFs — but no pace" },
];

interface EngTeam { name: string; emoji: string; blurb: string; base: Record<Cat, number> }
const ENG_TEAMS: EngTeam[] = [
  { name: "Apex Dynamics", emoji: "🪽", blurb: "Aero obsessives — huge downforce.", base: { chassis: 62, engine: 58, aero: 80, reliability: 60 } },
  { name: "Titan Powertrains", emoji: "⚙️", blurb: "The strongest engine on the grid.", base: { chassis: 58, engine: 82, aero: 58, reliability: 64 } },
  { name: "Monocoque Labs", emoji: "🏎️", blurb: "A beautifully balanced chassis.", base: { chassis: 80, engine: 60, aero: 62, reliability: 60 } },
  { name: "Ironside Racing", emoji: "🔧", blurb: "Bulletproof — they always finish.", base: { chassis: 60, engine: 60, aero: 58, reliability: 84 } },
  { name: "Meridian Works", emoji: "⚖️", blurb: "No weaknesses, no superpowers.", base: { chassis: 68, engine: 68, aero: 68, reliability: 66 } },
  { name: "Skunkworks 56", emoji: "🚀", blurb: "Blisteringly fast — and fragile.", base: { chassis: 82, engine: 80, aero: 78, reliability: 40 } },
  { name: "Privateer Garage", emoji: "🧰", blurb: "Plucky underdogs on a shoestring.", base: { chassis: 52, engine: 54, aero: 52, reliability: 58 } },
  { name: "Vortex Engines", emoji: "💨", blurb: "Monster top speed down the straights.", base: { chassis: 60, engine: 84, aero: 60, reliability: 60 } },
  { name: "Carbon Foundry", emoji: "🛠️", blurb: "Stiff, light, quick through the quick stuff.", base: { chassis: 82, engine: 62, aero: 64, reliability: 58 } },
  { name: "Old Guard Motors", emoji: "🛡️", blurb: "Veteran outfit — dependable midfield.", base: { chassis: 64, engine: 64, aero: 62, reliability: 80 } },
  { name: "Quantum Aero", emoji: "🌀", blurb: "Cutting-edge wind-tunnel wizards.", base: { chassis: 64, engine: 60, aero: 82, reliability: 58 } },
  { name: "Garage Band Racing", emoji: "🎸", blurb: "Talented chaos — quick but unpredictable.", base: { chassis: 70, engine: 72, aero: 74, reliability: 50 } },
];

interface Sponsor { name: string; emoji: string; blurb: string; budget: number }
const SPONSORS: Sponsor[] = [
  { name: "Crypto Exchange", emoji: "🪙", blurb: "Volatile money, enormous cheque.", budget: 300 },
  { name: "Oil Major", emoji: "🛢️", blurb: "Old money, deep pockets.", budget: 290 },
  { name: "Streaming Giant", emoji: "📺", blurb: "Wants the drama — and pays for it.", budget: 260 },
  { name: "Telecoms Titan", emoji: "📡", blurb: "Coverage everywhere, including your wallet.", budget: 240 },
  { name: "Global Energy", emoji: "🥤", blurb: "Gives you wings and a solid budget.", budget: 230 },
  { name: "Airline", emoji: "🛫", blurb: "First-class backing.", budget: 220 },
  { name: "Startup Unicorn", emoji: "🦄", blurb: "Burning VC cash — your gain.", budget: 210 },
  { name: "Fashion House", emoji: "👗", blurb: "Style and a respectable sum.", budget: 200 },
  { name: "Luxury Watches", emoji: "⌚", blurb: "Precision money.", budget: 190 },
  { name: "National Lottery", emoji: "🎟️", blurb: "Someone's got to win.", budget: 170 },
  { name: "Family Money", emoji: "👑", blurb: "A modest windfall from the relatives.", budget: 150 },
  { name: "Hardware Store", emoji: "🔩", blurb: "Local, loyal — and a little tight.", budget: 90 },
];

const STAGES = ["d1", "d2", "eng", "sponsor", "build", "result"] as const;
type Stage = (typeof STAGES)[number];

function sample<T>(arr: T[], n: number, exclude: (x: T) => boolean = () => false): T[] {
  const pool = arr.filter((x) => !exclude(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function buildField(pool: GameDriver[], picked: GameDriver[], playerEntries: Entry[]): Entry[] {
  const used = new Set(picked.map((d) => d.id));
  const ai = pool.filter((d) => !used.has(d.id)).slice(0, 18);
  const maxPpr = Math.max(...ai.map((d) => d.points / Math.max(1, d.races)), 1);
  return [
    ...playerEntries,
    ...ai.map((d, i) => {
      const ppr = d.points / Math.max(1, d.races);
      return {
        id: d.id, name: d.name, code: d.code, team: d.team, colour: d.teamColour,
        driver: driverRating(d), car: Math.round(Math.min(97, 66 + (ppr / maxPpr) * 30 + (i % 3) - 1)),
        reliability: 0.86 + (ppr / maxPpr) * 0.1, isPlayer: false, flag: d.flag, headshot: d.headshot,
      } as Entry;
    }),
  ];
}

export default function SeasonSimulator() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [stage, setStage] = useState<Stage>("d1");
  const [d1, setD1] = useState<GameDriver | null>(null);
  const [d2, setD2] = useState<GameDriver | null>(null);
  const [eng, setEng] = useState<EngTeam | null>(null);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [build, setBuild] = useState<Record<Cat, number>>({ chassis: 60, engine: 60, aero: 60, reliability: 60 });
  const [teamName, setTeamName] = useState("My Team");
  const [result, setResult] = useState<ReturnType<typeof simulateSeason> | null>(null);

  useEffect(() => { loadGamesData().then((d) => setPool(d.drivers)); }, []);

  function pickDriver(d: GameDriver) {
    if (stage === "d1") { setD1(d); setStage("d2"); }
    else if (stage === "d2") { setD2(d); setStage("eng"); }
  }
  function pickEng(t: EngTeam) { setEng(t); setBuild({ ...t.base }); setStage("sponsor"); }
  function pickSponsor(s: Sponsor) { setSponsor(s); setStage("build"); }

  const spent = eng ? CATS.reduce((s, c) => s + (build[c.key] - eng.base[c.key]), 0) : 0;
  const remaining = (sponsor?.budget ?? 0) - spent;

  function setCat(k: Cat, v: number) {
    if (!eng || !sponsor) return;
    v = Math.max(eng.base[k], Math.min(100, v));
    const otherSpent = CATS.reduce((s, c) => s + (c.key === k ? 0 : build[c.key] - eng.base[c.key]), 0);
    if (otherSpent + (v - eng.base[k]) > sponsor.budget) v = eng.base[k] + (sponsor.budget - otherSpent);
    setBuild((b) => ({ ...b, [k]: v }));
  }

  function run() {
    if (!d1 || !d2) return;
    const cb: CarBuild = { chassis: build.chassis / 100, engine: build.engine / 100, aero: build.aero / 100, reliability: build.reliability / 100 };
    const car = carPerf(cb);
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    const playerEntries: Entry[] = [d1, d2].map((d) => ({
      id: d.id, name: d.name, code: d.code, team: teamName, colour: "#ff5436",
      driver: driverRating(d), car, reliability: rel, isPlayer: true, flag: d.flag, headshot: d.headshot,
    }));
    const field = buildField(pool, [d1, d2], playerEntries);
    const seed = (d1.id * 131 + d2.id * 17 + car * 7 + (sponsor?.budget ?? 0)) >>> 0;
    setResult(simulateSeason(field, ROUNDS, seed));
    setStage("result");
  }

  function reset() {
    setStage("d1"); setD1(null); setD2(null); setEng(null); setSponsor(null); setResult(null);
    setBuild({ chassis: 60, engine: 60, aero: 60, reliability: 60 });
  }

  if (pool.length === 0) return <p style={{ color: "var(--muted)" }}>Loading drivers…</p>;

  const stepNum = STAGES.indexOf(stage) + 1;

  // ---- RESULT ----
  if (stage === "result" && result) {
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
          {slam ? <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: "var(--gold)", textTransform: "uppercase" }}>🏁 The Slam! A perfect season</div>
            : driverTitle ? <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: "var(--gold)", textTransform: "uppercase" }}>🏆 World Champions!</div>
            : myTeamPos === 1 ? <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.6rem", color: "var(--gold)", textTransform: "uppercase" }}>🏆 Constructors&apos; Champions!</div>
            : <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.5rem", textTransform: "uppercase" }}>Season complete — P{myTeamPos} constructors</div>}
          <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
            With {eng?.name} & {sponsor?.name}. Drivers&apos; champion: <strong style={{ color: "var(--text)" }}>{champ.entry.flag} {champ.entry.name}</strong> ({champ.points} pts)
          </p>
        </div>
        <Standings title="Drivers' Championship" rows={result.drivers.map((s, i) => ({ pos: i + 1, label: `${s.entry.flag} ${s.entry.name}`, sub: s.entry.team, pts: s.points, mine: s.entry.isPlayer }))} />
        <Standings title="Constructors' Championship" rows={result.constructors.map((t, i) => ({ pos: i + 1, label: t.team, sub: "", pts: t.points, mine: t.team === teamName }))} />
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* progress */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Driver 1", "Driver 2", "Engineers", "Sponsor", "Build"].map((lbl, i) => (
          <span key={lbl} className="chip" style={{ borderColor: i + 1 === stepNum ? "var(--accent)" : "var(--border)", color: i + 1 < stepNum ? "var(--accent-2)" : i + 1 === stepNum ? "var(--accent)" : "var(--muted)" }}>
            {i + 1 < stepNum ? "✓ " : ""}{lbl}
          </span>
        ))}
      </div>

      {/* chosen-so-far summary */}
      {(d1 || eng || sponsor) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".82rem" }}>
          {d1 && <span className="chip">👤 {d1.flag} {d1.name}</span>}
          {d2 && <span className="chip">👤 {d2.flag} {d2.name}</span>}
          {eng && <span className="chip">{eng.emoji} {eng.name}</span>}
          {sponsor && <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>💵 {sponsor.name} · {sponsor.budget}</span>}
        </div>
      )}

      {stage === "d1" && <DriverSpin pool={pool} exclude={[]} onPick={pickDriver} which="first" key="d1" />}
      {stage === "d2" && <DriverSpin pool={pool} exclude={d1 ? [d1.id] : []} onPick={pickDriver} which="second" key="d2" />}
      {stage === "eng" && <EngSpin onPick={pickEng} />}
      {stage === "sponsor" && <SponsorSpin onPick={pickSponsor} />}

      {stage === "build" && eng && sponsor && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 700 }}>Team name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value.slice(0, 22))} maxLength={22}
              style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }} />
            <span className="chip" style={{ marginLeft: "auto", color: remaining < 0 ? "var(--danger)" : "var(--gold)", borderColor: remaining < 0 ? "var(--danger)" : "var(--gold)" }}>
              {sponsor.name} budget left: {remaining}
            </span>
          </div>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: ".88rem" }}>
            {eng.name} gave you this base car. Spend {sponsor.name}&apos;s budget of {sponsor.budget} development points to improve it — you can only build on top of the base.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {CATS.map((c) => (
              <div key={c.key} className="card" style={{ padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong>{c.emoji} {c.label}</strong>
                  <span style={{ fontFamily: "var(--font-cond)" }}>
                    <span style={{ color: "var(--muted)" }}>base {eng.base[c.key]} →</span> <span style={{ color: "var(--gold)" }}>{build[c.key]}</span>
                  </span>
                </div>
                <input type="range" min={eng.base[c.key]} max={100} value={build[c.key]} onChange={(e) => setCat(c.key, Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)" }} aria-label={c.label} />
                <div style={{ color: "var(--muted)", fontSize: ".74rem" }}>{c.hint}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setStage("sponsor")}>← Sponsor</button>
            <button className="btn btn-primary" onClick={run}>🏁 Simulate {ROUNDS}-race season</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- spin sub-components ---------- */

function useSpin<T>(make: () => T[]) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [opts, setOpts] = useState<T[]>([]);
  const [flash, setFlash] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  function spin() {
    setPhase("spinning");
    setOpts(make());
    let n = 0;
    timer.current = setInterval(() => { setFlash((f) => f + 1); if (++n > 12) { if (timer.current) clearInterval(timer.current); setPhase("done"); } }, 70);
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return { phase, opts, flash, spin };
}

function SpinShell({ title, subtitle, phase, onSpin, children }: { title: string; subtitle: string; phase: string; onSpin: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>{title}</h2>
        <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: ".9rem" }}>{subtitle}</p>
      </div>
      {phase === "idle" ? (
        <button className="btn btn-primary" onClick={onSpin} style={{ justifySelf: "start", fontSize: "1rem" }}>🎰 Spin</button>
      ) : children}
    </div>
  );
}

function DriverSpin({ pool, exclude, onPick, which }: { pool: GameDriver[]; exclude: number[]; onPick: (d: GameDriver) => void; which: string }) {
  const { phase, opts, flash, spin } = useSpin<GameDriver>(() => sample(pool, OPTIONS, (d) => exclude.includes(d.id)));
  const shown = phase === "spinning" ? sample(pool, OPTIONS, (d) => exclude.includes(d.id)) : opts; // shuffle while spinning
  return (
    <SpinShell title={`Spin for your ${which} driver`} subtitle="The spin deals you five drivers — pick one. No take-backs." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} aria-busy={phase === "spinning"} key={flash}>
        {shown.map((d) => (
          <button key={d.id} disabled={phase === "spinning"} onClick={() => phase === "done" && onPick(d)} className="card"
            style={{ padding: "0.9rem", textAlign: "center", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", borderTop: `3px solid ${d.teamColour}`, opacity: phase === "spinning" ? 0.55 : 1 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.headshot || ""} alt="" width={54} height={54} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
            <div style={{ fontWeight: 800, marginTop: 6, fontSize: ".88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.flag} {d.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".72rem" }}>OVR {driverRating(d)} · {d.team}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6, fontSize: ".72rem", color: "var(--muted)" }}>
              <span>🏆 {d.wins}</span><span>🥂 {d.podiums}</span>
            </div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>}
    </SpinShell>
  );
}

function EngSpin({ onPick }: { onPick: (t: EngTeam) => void }) {
  const { phase, opts, flash, spin } = useSpin<EngTeam>(() => sample(ENG_TEAMS, OPTIONS));
  const shown = phase === "spinning" ? sample(ENG_TEAMS, OPTIONS) : opts;
  return (
    <SpinShell title="Spin for your engineering team" subtitle="Each outfit gives a different base car — some fast, some reliable, some a gamble." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }} key={flash}>
        {shown.map((t) => (
          <button key={t.name} disabled={phase === "spinning"} onClick={() => phase === "done" && onPick(t)} className="card"
            style={{ padding: "1rem", textAlign: "left", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", opacity: phase === "spinning" ? 0.55 : 1 }}>
            <div style={{ fontSize: "1.6rem" }}>{t.emoji}</div>
            <div style={{ fontWeight: 800 }}>{t.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".78rem", minHeight: 32 }}>{t.blurb}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: ".72rem", color: "var(--muted)", flexWrap: "wrap" }}>
              <span>🏎️ {t.base.chassis}</span><span>⚙️ {t.base.engine}</span><span>🪽 {t.base.aero}</span><span>🔧 {t.base.reliability}</span>
            </div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>}
    </SpinShell>
  );
}

function SponsorSpin({ onPick }: { onPick: (s: Sponsor) => void }) {
  const { phase, opts, flash, spin } = useSpin<Sponsor>(() => sample(SPONSORS, OPTIONS));
  const shown = phase === "spinning" ? sample(SPONSORS, OPTIONS) : opts;
  return (
    <SpinShell title="Spin for a title sponsor" subtitle="Your sponsor sets your development budget — a bigger backer means a faster car." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }} key={flash}>
        {shown.map((s) => (
          <button key={s.name} disabled={phase === "spinning"} onClick={() => phase === "done" && onPick(s)} className="card"
            style={{ padding: "1rem", textAlign: "left", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", opacity: phase === "spinning" ? 0.55 : 1, borderTop: "3px solid var(--gold)" }}>
            <div style={{ fontSize: "1.6rem" }}>{s.emoji}</div>
            <div style={{ fontWeight: 800 }}>{s.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".78rem", minHeight: 32 }}>{s.blurb}</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 6, fontSize: "1.1rem" }}>💵 {s.budget} budget</div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>}
    </SpinShell>
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
