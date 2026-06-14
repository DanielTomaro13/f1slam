"use client";
import { useEffect, useState } from "react";
import { topScores, isGlobal, type ScoreEntry } from "@/lib/leaderboard";
import { getName, setName, getDaily } from "@/lib/progress";

const BOARDS = [
  { game: "season-sim", label: "Season Simulator", unit: "pts" },
  { game: "career", label: "Career Mode", unit: "pts" },
  { game: "higher-or-lower", label: "Higher or Lower", unit: "streak" },
  { game: "pit-stop", label: "Pit Stop", unit: "drivers" },
];
const DAILY = [
  { game: "gridle", label: "Gridle" },
  { game: "guess-the-driver", label: "Guess the Driver" },
];

export default function LeaderboardView() {
  const [boards, setBoards] = useState<Record<string, ScoreEntry[]>>({});
  const [name, setNm] = useState("");
  const [streaks, setStreaks] = useState<Record<string, { cur: number; max: number }>>({});

  useEffect(() => {
    setNm(getName());
    Promise.all(BOARDS.map((b) => topScores(b.game, true, 10).then((r) => [b.game, r] as const)))
      .then((pairs) => setBoards(Object.fromEntries(pairs)));
    const s: Record<string, { cur: number; max: number }> = {};
    for (const d of DAILY) { const x = getDaily(d.game); s[d.game] = { cur: x.cur, max: x.max }; }
    setStreaks(s);
  }, []);

  function saveName(v: string) {
    setNm(v);
    setName(v);
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card" style={{ padding: "1rem", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="nm" style={{ fontWeight: 700 }}>Your name</label>
        <input
          id="nm"
          value={name}
          onChange={(e) => saveName(e.target.value.slice(0, 16))}
          placeholder="Anonymous"
          style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
        />
        <span style={{ color: "var(--muted)", fontSize: ".8rem", marginLeft: "auto" }}>
          {isGlobal() ? "Posting to the global leaderboard" : "Scores saved on this device"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {BOARDS.map((b) => {
          const rows = boards[b.game] || [];
          return (
            <div key={b.game} className="card" style={{ padding: "1.1rem" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>{b.label}</h2>
              {rows.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No scores yet — be the first.</p>
              ) : (
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                  {rows.map((r, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem" }}>
                      <span style={{ width: 18, color: i === 0 ? "var(--gold)" : "var(--muted)", fontFamily: "var(--font-mono)" }}>{i === 0 ? "👑" : i + 1}</span>
                      <span style={{ flex: 1 }}>{r.name}</span>
                      <span style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{r.score} {b.unit}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: "1.1rem" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>Daily streaks (this device)</h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {DAILY.map((d) => (
            <div key={d.game}>
              <div style={{ color: "var(--muted)", fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".05em" }}>{d.label}</div>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem" }}>
                🔥 {streaks[d.game]?.cur ?? 0} <span style={{ color: "var(--muted)", fontSize: "1rem" }}>(best {streaks[d.game]?.max ?? 0})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
