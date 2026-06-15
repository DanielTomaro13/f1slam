"use client";
import { useEffect, useState } from "react";
import { loadGamesData, type SeasonPick, type CarPick } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import { carPerf, simulateSeason, type Entry, type CarBuild } from "@/lib/sim";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import ShareButtons from "@/components/ShareButtons";
import Confetti from "@/components/Confetti";
import { fanfare, settle, tap, isMuted, setMuted } from "@/lib/sound";
import { DriverSpin, CarSpin, SponsorSpin, sample, type Sponsor } from "@/components/games/Spins";

const GAME = "season-sim";
const ROUNDS = 24;

type Cat = "chassis" | "engine" | "aero" | "reliability";
const CATS: { key: Cat; label: string; emoji: string; hint: string }[] = [
  { key: "chassis", label: "Chassis", emoji: "🏎️", hint: "Cornering & overall pace" },
  { key: "engine", label: "Power Unit", emoji: "⚙️", hint: "Straight-line speed" },
  { key: "aero", label: "Aerodynamics", emoji: "🪽", hint: "Downforce & efficiency" },
  { key: "reliability", label: "Reliability", emoji: "🔧", hint: "Fewer DNFs — but no pace" },
];

// sponsor.value = development budget for the Season Simulator
const SPONSORS: Sponsor[] = [
  { name: "Crypto Exchange", emoji: "🪙", blurb: "Volatile money, enormous cheque.", value: 120 },
  { name: "Oil Major", emoji: "🛢️", blurb: "Old money, deep pockets.", value: 115 },
  { name: "Streaming Giant", emoji: "📺", blurb: "Wants the drama — and pays for it.", value: 100 },
  { name: "Telecoms Titan", emoji: "📡", blurb: "Coverage everywhere, including your wallet.", value: 92 },
  { name: "Global Energy", emoji: "🥤", blurb: "Gives you wings and a solid budget.", value: 86 },
  { name: "Airline", emoji: "🛫", blurb: "First-class backing.", value: 80 },
  { name: "Startup Unicorn", emoji: "🦄", blurb: "Burning VC cash — your gain.", value: 72 },
  { name: "Fashion House", emoji: "👗", blurb: "Style and a respectable sum.", value: 64 },
  { name: "Luxury Watches", emoji: "⌚", blurb: "Precision money.", value: 56 },
  { name: "National Lottery", emoji: "🎟️", blurb: "Someone's got to win.", value: 46 },
  { name: "Family Money", emoji: "👑", blurb: "A modest windfall from the relatives.", value: 36 },
  { name: "Hardware Store", emoji: "🔩", blurb: "Local, loyal — and a little tight.", value: 22 },
];

const STAGES = ["d1", "d2", "car", "sponsor", "build", "result"] as const;
type Stage = (typeof STAGES)[number];

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
  const [muted, setMutedState] = useState(false);

  useEffect(() => { loadGamesData().then(setData); setMutedState(isMuted()); }, []);

  // celebratory / closing sound when the season finishes
  useEffect(() => {
    if (stage !== "result" || !result) return;
    const myWin = result.drivers[0]?.entry.isPlayer || result.constructors[0]?.team === teamName;
    if (myWin) fanfare(); else settle();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() { const m = !muted; setMutedState(m); setMuted(m); if (!m) tap(); }

  const base = car ? Math.round(car.strength * 0.6 + 30) : 55; // map strength→base car ~48..89
  function pickDriver(p: SeasonPick) {
    if (stage === "d1") { setD1(p); setStage("d2"); }
    else { setD2(p); setStage("car"); }
  }
  function pickCar(c: CarPick) { setCar(c); const b = Math.round(c.strength * 0.6 + 30); setBuild({ chassis: b, engine: b, aero: b, reliability: b }); setStage("sponsor"); }
  function pickSponsor(s: Sponsor) { setSponsor(s); setStage("build"); }

  const spent = CATS.reduce((s, c) => s + (build[c.key] - base), 0);
  const remaining = (sponsor?.value ?? 0) - spent;

  function setCat(k: Cat, v: number) {
    if (!sponsor) return;
    v = Math.max(base, Math.min(100, v));
    const otherSpent = CATS.reduce((s, c) => s + (c.key === k ? 0 : build[c.key] - base), 0);
    if (otherSpent + (v - base) > sponsor.value) v = base + (sponsor.value - otherSpent);
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
    const seed = (carRating * 7 + (sponsor?.value ?? 0) + d1.rating * 3 + d2.rating) >>> 0;
    setResult(simulateSeason([...playerEntries, ...ai], ROUNDS, seed));
    setStage("result");
  }

  function reset() { setStage("d1"); setD1(null); setD2(null); setCar(null); setSponsor(null); setResult(null); setBuild({ chassis: 60, engine: 60, aero: 60, reliability: 60 }); }

  if (!data) return <p style={{ color: "var(--muted)" }}>Loading the history books…</p>;
  const stepNum = STAGES.indexOf(stage) + 1;

  if (stage === "result" && result && d1 && d2 && car) {
    const champ = result.drivers[0];
    const myDrivers = result.drivers.filter((s) => s.entry.isPlayer);
    const myTeamPos = result.constructors.findIndex((t) => t.team === teamName) + 1;
    const myIds = new Set([d1.key, d2.key]);

    // race-by-race from the season log — the goal is to WIN EVERY RACE
    const rows = result.raceLog.map((res, i) => {
      const winner = res.order.find((e) => !res.dnf.has(e.id)) || null;
      const place = (id: string) => {
        if (res.dnf.has(id)) return "DNF";
        const idx = res.order.findIndex((e) => e.id === id);
        return idx >= 0 ? `P${idx + 1}` : "—";
      };
      return { round: i + 1, winner, d1: place(d1.key), d2: place(d2.key), mineWon: !!winner && myIds.has(winner.id) };
    });
    const myWins = rows.filter((r) => r.mineWon).length;
    const perfect = myWins === ROUNDS;
    const champTitle = champ.entry.isPlayer;
    const won = champTitle || myTeamPos === 1;
    const points = Math.max(...myDrivers.map((s) => s.points), 0);
    const headline = perfect ? "Perfect Season!" : champTitle ? "World Champions!" : myTeamPos === 1 ? "Constructors' Champions!" : `P${myTeamPos} Constructors`;

    return (
      <div style={{ display: "grid", gap: 16 }}>
        {(won || perfect) && <Confetti />}

        {/* clear score block (legible on iOS) */}
        <div className="card pop" style={{ padding: "1.6rem 1.2rem", textAlign: "center", display: "grid", gap: 6, borderColor: perfect ? "var(--gold)" : won ? "var(--gold)" : "var(--border)" }}>
          <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem", textTransform: "uppercase", color: won ? "var(--gold)" : "var(--text)" }}>
            {perfect ? "🏁 The Slam" : "🏁"} {headline}
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
            <div>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "3rem", lineHeight: 1, color: perfect ? "var(--gold)" : "var(--accent)" }}>{myWins}<span style={{ fontSize: "1.4rem", color: "var(--muted)" }}>/{ROUNDS}</span></div>
              <div style={{ color: "var(--muted)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".06em" }}>Races won</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "3rem", lineHeight: 1, color: "var(--gold)" }}>{points}</div>
              <div style={{ color: "var(--muted)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".06em" }}>Points</div>
            </div>
          </div>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: ".9rem" }}>
            {d1.year} {d1.code} &amp; {d2.year} {d2.code} in a {car.year} {car.name}.{" "}
            {perfect ? "Every single race won — the rarest feat in the sim." : `Win all ${ROUNDS} for a perfect season.`}
          </p>
        </div>

        {/* race-by-race */}
        <div className="card scroll-x">
          <div style={{ padding: "0.8rem 1rem 0", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>Race by race</div>
          <table className="stat">
            <thead><tr><th>Rnd</th><th>Winner</th><th>{d1.code}</th><th>{d2.code}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.round} style={{ background: r.mineWon ? "rgba(232,196,105,0.12)" : undefined }}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>R{r.round}</td>
                  <td style={{ fontWeight: 700, color: r.mineWon ? "var(--gold)" : "var(--text)" }}>{r.mineWon ? "🏆 " : ""}{r.winner?.flag} {r.winner?.code ?? "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: r.d1 === "P1" ? "var(--gold)" : r.d1 === "DNF" ? "var(--danger)" : "var(--text)" }}>{r.d1}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: r.d2 === "P1" ? "var(--gold)" : r.d2 === "DNF" ? "var(--danger)" : "var(--text)" }}>{r.d2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Standings title="Drivers' Championship" rows={result.drivers.map((s, i) => ({ pos: i + 1, label: `${s.entry.flag} ${s.entry.name}`, sub: s.entry.team, pts: s.points, mine: s.entry.isPlayer }))} />
        <Standings title="Constructors' Championship" rows={result.constructors.map((t, i) => ({ pos: i + 1, label: t.team, sub: "", pts: t.points, mine: t.team === teamName }))} />

        <div className="card" style={{ padding: "1.1rem", textAlign: "center", display: "grid", gap: 12 }}>
          <ShareButtons
            card={{ eyebrow: "Season Simulator", big: `${myWins}/${ROUNDS}`, headline: perfect ? "PERFECT SEASON" : won ? "CHAMPIONS" : "SEASON DONE", lines: [teamName, `${d1.year} ${d1.name} & ${d2.year} ${d2.name}`, `${car.year} ${car.name}`, `${points} championship points`], path: "/games/season" }}
            caption={`I won ${myWins}/${ROUNDS} races as ${teamName} in the F1Slam Season Simulator${perfect ? " — a PERFECT season! 🏆🏁" : " 🏎️"} Can you go perfect?`}
          />
          <ScoreSubmit game={GAME} score={points} unit="pts" />
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {["Driver 1", "Driver 2", "Car", "Sponsor", "Build"].map((lbl, i) => (
          <span key={lbl} className="chip" style={{ borderColor: i + 1 === stepNum ? "var(--accent)" : "var(--border)", color: i + 1 < stepNum ? "var(--accent-2)" : i + 1 === stepNum ? "var(--accent)" : "var(--muted)" }}>
            {i + 1 < stepNum ? "✓ " : ""}{lbl}
          </span>
        ))}
        <button className="chip" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} style={{ marginLeft: "auto", cursor: "pointer", color: "var(--text)" }}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
      <p style={{ color: "var(--muted)", margin: 0, fontSize: ".88rem" }}>
        🎯 The goal: <strong style={{ color: "var(--text)" }}>win every race</strong> for a perfect season — the ultimate Slam.
      </p>

      {(d1 || car || sponsor) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".82rem" }}>
          {d1 && <span className="chip">👤 {d1.year} {d1.flag} {d1.name}</span>}
          {d2 && <span className="chip">👤 {d2.year} {d2.flag} {d2.name}</span>}
          {car && <span className="chip" style={{ borderColor: car.colour }}>🏎️ {car.year} {car.name}</span>}
          {sponsor && <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>💵 {sponsor.name} · {sponsor.value}</span>}
        </div>
      )}

      {stage === "d1" && <DriverSpin pool={data.driverSeasons} exclude={[]} onPick={pickDriver} which="first" key="d1" />}
      {stage === "d2" && <DriverSpin pool={data.driverSeasons} exclude={d1 ? [d1.driverId] : []} onPick={pickDriver} which="second" key="d2" />}
      {stage === "car" && <CarSpin pool={data.carSeasons} onPick={pickCar} />}
      {stage === "sponsor" && <SponsorSpin sponsors={SPONSORS} onPick={pickSponsor} unit="budget" />}

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
            The {car.year} {car.name} gives you a base car of {base}. Spend {sponsor.name}&apos;s {sponsor.value} development points to push it further.
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
