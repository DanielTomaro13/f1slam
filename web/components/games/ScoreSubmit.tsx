"use client";
import { useState } from "react";
import { submitScore } from "@/lib/leaderboard";
import { getName, setName } from "@/lib/progress";

/**
 * Small inline "post your score" control used at the end of a game. Remembers
 * the player's name and submits to the global leaderboard (or local fallback).
 */
export default function ScoreSubmit({
  game,
  score,
  higherIsBetter = true,
  unit = "pts",
}: {
  game: string;
  score: number;
  higherIsBetter?: boolean;
  unit?: string;
}) {
  const [name, setNm] = useState(getName());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post() {
    setBusy(true);
    setName(name);
    await submitScore(game, score, higherIsBetter);
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <p style={{ color: "var(--accent-2)", fontWeight: 700, margin: 0 }}>
        ✓ Posted {score} {unit} to the Hall of Fame.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      <input
        value={name}
        onChange={(e) => setNm(e.target.value.slice(0, 16))}
        placeholder="Your name"
        aria-label="Your name"
        style={{ padding: "0.5rem 0.7rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
      />
      <button className="btn btn-primary" disabled={busy} onClick={post}>
        🏆 Post {score} {unit}
      </button>
    </div>
  );
}
