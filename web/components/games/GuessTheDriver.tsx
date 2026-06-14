"use client";
import { useEffect, useState } from "react";
import { loadGamesData, dailySeed, rng, type GameDriver } from "@/lib/games-data";
import { recordDaily, todaysResult } from "@/lib/progress";
import { countdownString } from "@/lib/progress";
import Confetti from "@/components/Confetti";

const GAME = "guess-the-driver";

function clues(d: GameDriver): { label: string; value: string }[] {
  return [
    { label: "Team", value: d.team },
    { label: "Nationality", value: `${d.flag} ${d.country ?? "Unknown"}` },
    { label: "Career races", value: String(d.races) },
    { label: "Car number", value: `#${d.id}` },
    { label: "Pole positions", value: String(d.poles) },
    { label: "Career podiums", value: String(d.podiums) },
    { label: "Career wins", value: String(d.wins) },
  ];
}

export default function GuessTheDriver() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [target, setTarget] = useState<GameDriver | null>(null);
  const [options, setOptions] = useState<GameDriver[]>([]);
  const [revealed, setRevealed] = useState(1);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [tick, setTick] = useState("");

  useEffect(() => {
    loadGamesData().then((d) => {
      const eligible = d.drivers.filter((x) => x.races >= 3);
      const usable = eligible.length >= 4 ? eligible : d.drivers;
      const r = rng(dailySeed() * 0x9e3779b1);
      const t = usable[Math.floor(r() * usable.length)];
      // 3 distractors, stable for the day
      const others = usable.filter((x) => x.id !== t.id);
      const picks: GameDriver[] = [];
      const seen = new Set<number>();
      while (picks.length < 3 && picks.length < others.length) {
        const c = others[Math.floor(r() * others.length)];
        if (!seen.has(c.id)) { seen.add(c.id); picks.push(c); }
      }
      const opts = [t, ...picks].sort(() => r() - 0.5);
      setPool(usable);
      setTarget(t);
      setOptions(opts);
      const prior = todaysResult(GAME);
      if (prior) setResult(prior.won ? "win" : "lose");
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    const id = setInterval(() => setTick(countdownString()), 1000);
    return () => clearInterval(id);
  }, [result]);

  if (!target) return <p style={{ color: "var(--muted)" }}>Loading today&apos;s driver…</p>;

  const cl = clues(target);
  const done = result !== null;

  function guess(d: GameDriver) {
    if (done) return;
    if (d.id === target!.id) {
      setResult("win");
      recordDaily(GAME, true, revealed);
    } else {
      const w = new Set(wrong); w.add(d.id); setWrong(w);
      if (revealed >= cl.length) {
        setResult("lose");
        recordDaily(GAME, false, revealed);
      } else {
        setRevealed((r) => r + 1);
      }
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {result === "win" && <Confetti />}
      <span className="chip">Clue {Math.min(revealed, cl.length)} / {cl.length}</span>

      <div className="card" style={{ padding: "1.1rem", display: "grid", gap: 8 }}>
        {cl.slice(0, revealed).map((c) => (
          <div key={c.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
            <span style={{ color: "var(--muted)", textTransform: "uppercase", fontSize: ".74rem", letterSpacing: ".05em" }}>{c.label}</span>
            <span style={{ fontWeight: 700 }}>{c.value}</span>
          </div>
        ))}
        {!done && revealed < cl.length && (
          <button className="btn" onClick={() => setRevealed((r) => r + 1)} style={{ marginTop: 4 }}>Reveal next clue (−points)</button>
        )}
      </div>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        {options.map((d) => {
          const isTarget = done && d.id === target.id;
          const isWrong = wrong.has(d.id);
          return (
            <button key={d.id} className="card" disabled={done || isWrong}
              onClick={() => guess(d)}
              style={{
                padding: "0.9rem", textAlign: "left", cursor: done || isWrong ? "default" : "pointer", color: "var(--text)",
                borderColor: isTarget ? "var(--accent-2)" : isWrong ? "var(--danger)" : "var(--border)",
                opacity: isWrong ? 0.5 : 1,
              }}>
              <div style={{ fontWeight: 700 }}>{d.flag} {d.name}</div>
              <div style={{ color: "var(--muted)", fontSize: ".78rem" }}>{isTarget ? "✓ Correct" : isWrong ? "✗" : "Tap to guess"}</div>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center", display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, color: result === "win" ? "var(--accent-2)" : "var(--danger)" }}>
            {result === "win" ? `Solved in ${revealed} clue${revealed > 1 ? "s" : ""}!` : "Out of clues"}
          </h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>Today&apos;s driver was <strong style={{ color: "var(--text)" }}>{target.flag} {target.name}</strong> ({target.team}).</p>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>Next driver in {tick || "…"}</p>
          <a className="btn" href="/leaderboard" style={{ justifySelf: "center" }}>🏆 Your streaks</a>
        </div>
      )}
    </div>
  );
}
