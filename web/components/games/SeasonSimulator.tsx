"use client";
import { useEffect, useRef, useState } from "react";
import { loadGamesData, type SeasonPick, type CarPick } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import { carPerf, simulateSeason, type Entry, type CarBuild } from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import Confetti from "@/components/Confetti";

const GAME = "season-sim";
const ROUNDS = 24;
const DRIVER_OPTS = 5;
const CAR_OPTS = 3;

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string; hint: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️", hint: "Cornering & overall pace" },
  { key: "engine", label: "Power Unit", emoji: "⚙️", hint: "Straight-line speed" },
  { key: "aero", label: "Aerodynamics", emoji: "🪽", hint: "Downforce & efficiency" },
  { key: "reliability", label: "Reliability", emoji: "🔧", hint: "Fewer DNFs — but no pace" },
];

interface Sponsor { name: string; emoji: string; blurb: string; budget: number }
const SPONSORS: Sponsor[] = [
  { name: "Crypto Exchange", emoji: "🪙", blurb: "Volatile money, enormous cheque.", budget: 120 },
  { name: "Oil Major", emoji: "🛢️", blurb: "Old money, deep pockets.", budget: 115 },
  { name: "Streaming Giant", emoji: "📺", blurb: "Wants the drama — and pays for it.", budget: 100 },
  { name: "Telecoms Titan", emoji: "📡", blurb: "Coverage everywhere, including your wallet.", budget: 92 },
  { name: "Global Energy", emoji: "🥤", blurb: "Gives you wings and a solid budget.", budget: 86 },
  { name: "Airline", emoji: "🛫", blurb: "First-class backing.", budget: 80 },
  { name: "Startup Unicorn", emoji: "🦄", blurb: "Burning VC cash — your gain.", budget: 72 },
  { name: "Fashion House", emoji: "👗", blurb: "Style and a respectable sum.", budget: 64 },
  { name: "Luxury Watches", emoji: "⌚", blurb: "Precision money.", budget: 56 },
  { name: "National Lottery", emoji: "🎟️", blurb: "Someone's got to win.", budget: 46 },
  { name: "Family Money", emoji: "👑", blurb: "A modest windfall from the relatives.", budget: 36 },
  { name: "Hardware Store", emoji: "🔩", blurb: "Local, loyal — and a little tight.", budget: 22 },
];

const STAGES = ["d1", "d2", "car", "sponsor", "build", "result"] as const;
type Stage = (typeof STAGES)[number];

function sample<T>(arr: T[], n: number, exclude: (x: T) => boolean = () => false): T[] {
  const pool = arr.filter((x) => !exclude(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function aiCar(rating: number, wins: number): number {
  return Math.round(Math.min(96, 60 + (rating - 60) * 0.72 + (wins > 0 ? 6 : 0)));
}

export default function SeasonSimulator() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadGamesData>> | null>(null);
  const [stage, setStage] = useState<Stage>("d1");
  const [d1, setD1] = useState<SeasonPick | null>(null);
  const [d2, setD2] = useState<SeasonPick | null>(null);
  const [car, setCar] = useState<CarPick | null>(null);
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [build, setBuild] = useState<Record<Cat, number>>({ chassis: 60, engine: 60, aero: 60, reliability: 60 });
  const [teamName, setTeamName] = useState("My Team");
  const [result, setResult] = useState<ReturnType<typeof simulateSeason> | null>(null);

  useEffect(() => { loadGamesData().then(setData); }, []);

  const base = car ? Math.round(car.strength * 0.6 + 30) : 55; // map strength→base car ~48..89
  function pickDriver(p: SeasonPick) {
    if (stage === "d1") { setD1(p); setStage("d2"); }
    else { setD2(p); setStage("car"); }
  }
  function pickCar(c: CarPick) { setCar(c); const b = Math.round(c.strength * 0.6 + 30); setBuild({ chassis: b, engine: b, aero: b, reliability: b }); setStage("sponsor"); }
  function pickSponsor(s: Sponsor) { setSponsor(s); setStage("build"); }

  const spent = CATS.reduce((s, c) => s + (build[c.key] - base), 0);
  const remaining = (sponsor?.budget ?? 0) - spent;

  function setCat(k: Cat, v: number) {
    if (!sponsor) return;
    v = Math.max(base, Math.min(100, v));
    const otherSpent = CATS.reduce((s, c) => s + (c.key === k ? 0 : build[c.key] - base), 0);
    if (otherSpent + (v - base) > sponsor.budget) v = base + (sponsor.budget - otherSpent);
    setBuild((b) => ({ ...b, [k]: v }));
  }

  function run() {
    if (!d1 || !d2 || !data) return;
    const cb: CarBuild = { chassis: build.chassis / 100, engine: build.engine / 100, aero: build.aero / 100, reliability: build.reliability / 100 };
    const carRating = carPerf(cb);
    const rel = 0.80 + (build.reliability / 100) * 0.18;
    const playerEntries: Entry[] = [d1, d2].map((p) => ({
      id: p.key, name: p.name, code: p.code, team: teamName, colour: "#ff5436",
      driver: p.rating, car: carRating, reliability: rel, isPlayer: true, flag: p.flag, headshot: p.headshot,
    }));
    const used = new Set([d1.driverId, d2.driverId]);
    const ai = sample(data.driverSeasons, 18, (p) => used.has(p.driverId)).map((p) => ({
      id: p.key, name: p.name, code: p.code, team: `${p.year} ${p.team}`, colour: p.teamColour,
      driver: p.rating, car: aiCar(p.rating, p.wins), reliability: 0.88, isPlayer: false, flag: p.flag, headshot: p.headshot,
    } as Entry));
    const seed = (carRating * 7 + (sponsor?.budget ?? 0) + d1.rating * 3 + d2.rating) >>> 0;
    setResult(simulateSeason([...playerEntries, ...ai], ROUNDS, seed));
    setStage("result");
  }

  function reset() { setStage("d1"); setD1(null); setD2(null); setCar(null); setSponsor(null); setResult(null); setBuild({ chassis: 60, engine: 60, aero: 60, reliability: 60 }); }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading the history books…</p>;
  const stepNum = STAGES.indexOf(stage) + 1;

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
            {d1?.year} {d1?.code} &amp; {d2?.year} {d2?.code} in a {car?.year} {car?.name}. Champion: <strong style={{ color: "var(--text)" }}>{champ.entry.flag} {champ.entry.name}</strong> ({champ.points} pts)
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Driver 1", "Driver 2", "Car", "Sponsor", "Build"].map((lbl, i) => (
          <span key={lbl} className="chip" style={{ borderColor: i + 1 === stepNum ? "var(--accent)" : "var(--border)", color: i + 1 < stepNum ? "var(--accent-2)" : i + 1 === stepNum ? "var(--accent)" : "var(--muted)" }}>
            {i + 1 < stepNum ? "✓ " : ""}{lbl}
          </span>
        ))}
      </div>

      {(d1 || car || sponsor) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".82rem" }}>
          {d1 && <span className="chip">👤 {d1.year} {d1.flag} {d1.name}</span>}
          {d2 && <span className="chip">👤 {d2.year} {d2.flag} {d2.name}</span>}
          {car && <span className="chip" style={{ borderColor: car.colour }}>🏎️ {car.year} {car.name}</span>}
          {sponsor && <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>💵 {sponsor.name} · {sponsor.budget}</span>}
        </div>
      )}

      {stage === "d1" && <DriverSpin pool={data.driverSeasons} exclude={[]} onPick={pickDriver} which="first" key="d1" />}
      {stage === "d2" && <DriverSpin pool={data.driverSeasons} exclude={d1 ? [d1.driverId] : []} onPick={pickDriver} which="second" key="d2" />}
      {stage === "car" && <CarSpin pool={data.carSeasons} onPick={pickCar} />}
      {stage === "sponsor" && <SponsorSpin onPick={pickSponsor} />}

      {stage === "build" && car && sponsor && (
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
            The {car.year} {car.name} gives you a base car of {base}. Spend {sponsor.name}&apos;s {sponsor.budget} development points to push it further.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {CATS.map((c) => (
              <div key={c.key} className="card" style={{ padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong>{c.emoji} {c.label}</strong>
                  <span style={{ fontFamily: "var(--font-cond)" }}><span style={{ color: "var(--muted)" }}>base {base} →</span> <span style={{ color: "var(--gold)" }}>{build[c.key]}</span></span>
                </div>
                <input type="range" min={base} max={100} value={build[c.key]} onChange={(e) => setCat(c.key, Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} aria-label={c.label} />
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

/* ---- spins ---- */
function useSpin<T>(make: () => T[]) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [opts, setOpts] = useState<T[]>([]);
  const [flash, setFlash] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  function spin() {
    setPhase("spinning"); setOpts(make());
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
      {phase === "idle" ? <button className="btn btn-primary" onClick={onSpin} style={{ justifySelf: "start", fontSize: "1rem" }}>🎰 Spin</button> : children}
    </div>
  );
}

function DriverSpin({ pool, exclude, onPick, which }: { pool: SeasonPick[]; exclude: string[]; onPick: (p: SeasonPick) => void; which: string }) {
  const { phase, opts, flash, spin } = useSpin<SeasonPick>(() => sample(pool, DRIVER_OPTS, (p) => exclude.includes(p.driverId)));
  const shown = phase === "spinning" ? sample(pool, DRIVER_OPTS, (p) => exclude.includes(p.driverId)) : opts;
  return (
    <SpinShell title={`Spin for your ${which} driver`} subtitle="Five drivers from across F1 history — each rated on how they performed that very season. Pick one." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} key={flash}>
        {shown.map((p) => (
          <button key={p.key} disabled={phase === "spinning"} onClick={() => phase === "done" && onPick(p)} className="card"
            style={{ padding: "0.9rem", textAlign: "center", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", borderTop: `3px solid ${p.teamColour}`, opacity: phase === "spinning" ? 0.55 : 1 }}>
            {p.headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.headshot} alt="" width={50} height={50} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
            ) : <div style={{ width: 50, height: 50, borderRadius: 10, background: "var(--panel-2)", display: "grid", placeItems: "center", margin: "0 auto", fontFamily: "var(--font-cond)" }}>{p.code}</div>}
            <div style={{ fontWeight: 800, marginTop: 6, fontSize: ".86rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.flag} {p.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".72rem" }}>{p.year} · {p.team}</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 4 }}>OVR {p.rating} <span style={{ color: "var(--muted)", fontSize: ".72rem" }}>· {p.wins}W</span></div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>}
    </SpinShell>
  );
}

function CarSpin({ pool, onPick }: { pool: CarPick[]; onPick: (c: CarPick) => void }) {
  const { phase, opts, flash, spin } = useSpin<CarPick>(() => sample(pool, CAR_OPTS));
  const shown = phase === "spinning" ? sample(pool, CAR_OPTS) : opts;
  return (
    <SpinShell title="Spin for a car" subtitle="Three real constructor seasons — a dominant year gives a rocket, an off year gives a dog. Pick your chassis." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }} key={flash}>
        {shown.map((c) => (
          <button key={c.key} disabled={phase === "spinning"} onClick={() => phase === "done" && onPick(c)} className="card"
            style={{ padding: "1rem", textAlign: "left", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", opacity: phase === "spinning" ? 0.55 : 1, borderLeft: `4px solid ${c.colour}` }}>
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem" }}>{c.year}</div>
            <div style={{ fontWeight: 800 }}>{c.flag} {c.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".76rem" }}>That season: P{c.position} · {c.wins} wins · {c.points} pts</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 6, fontSize: "1.1rem" }}>🏎️ car strength {c.strength}</div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>}
    </SpinShell>
  );
}

function SponsorSpin({ onPick }: { onPick: (s: Sponsor) => void }) {
  const { phase, opts, flash, spin } = useSpin<Sponsor>(() => sample(SPONSORS, 5));
  const shown = phase === "spinning" ? sample(SPONSORS, 5) : opts;
  return (
    <SpinShell title="Spin for a title sponsor" subtitle="Your sponsor sets the development budget — a bigger backer means a faster car." phase={phase} onSpin={spin}>
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
