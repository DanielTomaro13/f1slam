"use client";
import { useEffect, useMemo, useState } from "react";
import { loadGamesData, dailySeed, rng, type GameDriver } from "@/lib/games-data";
import { recordDaily, todaysResult, countdownString } from "@/lib/progress";
import Confetti from "@/components/Confetti";

const GAME = "gridle";
const MAX = 8;

type State = "hit" | "near" | "miss";
interface Cell { text: string; state: State; arrow?: "▲" | "▼" }

function cmpNum(a: number, b: number, near: number): { state: State; arrow?: "▲" | "▼" } {
  if (a === b) return { state: "hit" };
  return { state: Math.abs(a - b) <= near ? "near" : "miss", arrow: a < b ? "▲" : "▼" };
}

function compare(g: GameDriver, t: GameDriver): Cell[] {
  const num = cmpNum(g.id, t.id, 4);
  const wins = cmpNum(g.wins, t.wins, 5);
  const pts = cmpNum(g.points, t.points, 120);
  return [
    { text: g.team, state: g.team === t.team ? "hit" : "miss" },
    { text: `${g.flag}`, state: g.country === t.country ? "hit" : "miss" },
    { text: `#${g.id}`, state: num.state, arrow: num.arrow },
    { text: String(g.wins), state: wins.state, arrow: wins.arrow },
    { text: String(g.points), state: pts.state, arrow: pts.arrow },
  ];
}

const HEADERS = ["Team", "Nat", "No.", "Wins", "Points"];
const COLOR: Record<State, string> = { hit: "#2e7d4f", near: "#9a7d1f", miss: "#2a1410" };

export default function Gridle() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [target, setTarget] = useState<GameDriver | null>(null);
  const [guesses, setGuesses] = useState<GameDriver[]>([]);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [tick, setTick] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    loadGamesData().then((d) => {
      const eligible = d.drivers.filter((x) => x.races >= 2);
      const usable = eligible.length >= 8 ? eligible : d.drivers;
      const r = rng(dailySeed() * 0x85ebca6b);
      setPool(usable);
      setTarget(usable[Math.floor(r() * usable.length)]);
      const prior = todaysResult(GAME);
      if (prior) setResult(prior.won ? "win" : "lose");
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    const id = setInterval(() => setTick(countdownString()), 1000);
    return () => clearInterval(id);
  }, [result]);

  const names = useMemo(() => pool.map((d) => d.name).sort(), [pool]);
  if (!target) return <p style={{ color: "var(--muted)" }}>Loading today&apos;s driver…</p>;
  const done = result !== null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (done) return;
    const d = pool.find((x) => x.name.toLowerCase() === input.trim().toLowerCase());
    if (!d) { setErr("Pick a driver from the list."); return; }
    if (guesses.some((g) => g.id === d.id)) { setErr("Already guessed."); return; }
    setErr("");
    setInput("");
    const next = [...guesses, d];
    setGuesses(next);
    if (d.id === target!.id) {
      setResult("win");
      recordDaily(GAME, true, next.length);
    } else if (next.length >= MAX) {
      setResult("lose");
      recordDaily(GAME, false, next.length);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {result === "win" && <Confetti />}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">Guess {Math.min(guesses.length + (done ? 0 : 1), MAX)} / {MAX}</span>
        <span className="chip">🟩 exact · 🟧 close</span>
      </div>

      <div className="scroll-x">
        <div style={{ minWidth: 360 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(5, 1fr)", gap: 4, marginBottom: 4 }}>
            <span style={{ color: "var(--muted)", fontSize: ".7rem", textTransform: "uppercase" }}>Driver</span>
            {HEADERS.map((h) => (
              <span key={h} style={{ color: "var(--muted)", fontSize: ".7rem", textTransform: "uppercase", textAlign: "center" }}>{h}</span>
            ))}
          </div>
          {guesses.map((g) => {
            const cells = compare(g, target);
            return (
              <div key={g.id} className="pop" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(5, 1fr)", gap: 4, marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", padding: "0 6px", fontWeight: 700, fontSize: ".78rem", background: "var(--panel-2)", borderRadius: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.flag} {g.name.split(" ").slice(-1)[0]}
                </span>
                {cells.map((c, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, minHeight: 40, borderRadius: 6, fontSize: ".8rem", fontWeight: 700, background: COLOR[c.state], color: "#eef2ec", textAlign: "center", padding: "2px" }}>
                    {c.text}{c.arrow && <span style={{ fontSize: ".7rem" }}>{c.arrow}</span>}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {!done && (
        <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            list="gridle-drivers"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Guess a driver…"
            aria-label="Guess a driver"
            style={{ flex: "1 1 200px", padding: "0.6rem 0.8rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          />
          <datalist id="gridle-drivers">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
          <button className="btn btn-primary" type="submit">Guess</button>
        </form>
      )}
      {err && <p style={{ color: "var(--danger)", margin: 0, fontSize: ".85rem" }}>{err}</p>}

      {done && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center", display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, color: result === "win" ? "var(--accent-2)" : "var(--danger)" }}>
            {result === "win" ? `Got it in ${guesses.length}!` : "Out of guesses"}
          </h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>Today&apos;s driver was <strong style={{ color: "var(--text)" }}>{target.flag} {target.name}</strong> ({target.team}).</p>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>Next Gridle in {tick || "…"}</p>
          <a className="btn" href="/leaderboard" style={{ justifySelf: "center" }}>🏆 Your streaks</a>
        </div>
      )}
    </div>
  );
}
