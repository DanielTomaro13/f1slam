"use client";
import { useEffect, useState, useCallback } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "higher-or-lower";

const METRICS: { key: keyof GameDriver; label: string }[] = [
  { key: "wins", label: "career wins" },
  { key: "championships", label: "world titles" },
  { key: "podiums", label: "podiums" },
  { key: "poles", label: "pole positions" },
  { key: "points", label: "career points" },
];

export default function HigherOrLower() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [metric, setMetric] = useState(METRICS[0]);
  const [left, setLeft] = useState<GameDriver | null>(null);
  const [right, setRight] = useState<GameDriver | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [over, setOver] = useState(false);
  const [newBest, setNewBest] = useState(false);

  const randMetric = () => METRICS[Math.floor(Math.random() * METRICS.length)];
  const pick = useCallback(
    (exclude: string[], p: GameDriver[]) => {
      const cand = p.filter((x) => !exclude.includes(x.id));
      return cand[Math.floor(Math.random() * cand.length)];
    },
    []
  );

  const newRound = useCallback((p: GameDriver[]) => {
    setMetric(randMetric());
    const a = p[Math.floor(Math.random() * p.length)];
    let b = p[Math.floor(Math.random() * p.length)];
    while (b.id === a.id) b = p[Math.floor(Math.random() * p.length)];
    setLeft(a);
    setRight(b);
    setReveal(false);
  }, []);

  useEffect(() => {
    loadGamesData().then((d) => {
      const notable = d.players.filter((x) => x.wins >= 1 || x.points >= 100).slice(0, 80);
      const usable = notable.length >= 6 ? notable : d.players.slice(0, 80);
      setPool(usable);
      newRound(usable);
    });
  }, [newRound]);

  const guess = (higher: boolean) => {
    if (!left || !right || reveal) return;
    const lv = left[metric.key] as number;
    const rv = right[metric.key] as number;
    const correct = higher ? rv >= lv : rv <= lv;
    setReveal(true);
    setTimeout(() => {
      if (correct) {
        const s = streak + 1;
        setStreak(s);
        setBest((b) => Math.max(b, s));
        const nl = right;
        const nr = pick([nl.id], pool);
        setMetric(randMetric());
        setLeft(nl);
        setRight(nr);
        setReveal(false);
      } else {
        setOver(true);
        const nb = recordScore(GAME, streak);
        setNewBest(nb && streak > 0);
      }
    }, 950);
  };

  const restart = () => {
    setStreak(0);
    setOver(false);
    setNewBest(false);
    newRound(pool);
  };

  if (!left || !right) return <p style={{ color: "var(--muted)" }}>Loading drivers…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">🔥 Streak: {streak}</span>
        <span className="chip">Best: {best}</span>
      </div>

      <p style={{ textAlign: "center", margin: 0, color: "var(--muted)" }}>
        Does <strong style={{ color: "var(--text)" }}>{right.name}</strong> have{" "}
        <strong style={{ color: "var(--accent-2)" }}>more</strong> or{" "}
        <strong style={{ color: "var(--danger)" }}>fewer</strong> {metric.label} than{" "}
        <strong style={{ color: "var(--text)" }}>{left.name}</strong>?
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        <Side d={left} metric={metric} reveal />
        <div style={{ fontWeight: 900, color: "var(--muted)", fontFamily: "var(--font-cond)" }}>vs</div>
        <Side d={right} metric={metric} reveal={reveal} />
      </div>

      {!over && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" disabled={reveal} onClick={() => guess(true)}>▲ More</button>
          <button className="btn" disabled={reveal} onClick={() => guess(false)}>▼ Fewer / same</button>
        </div>
      )}

      {over && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, color: "var(--danger)" }}>Streak over — {streak}</h2>
          {newBest && <div style={{ color: "var(--gold)", fontWeight: 800 }}>🏅 New personal best!</div>}
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {right.name} had {right[metric.key] as number} {metric.label} vs {left.name}&apos;s {left[metric.key] as number}.
          </p>
          {streak > 0 && <ScoreSubmit game={GAME} score={streak} unit="streak" />}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={restart}>Play again</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}

function Side({ d, metric, reveal }: { d: GameDriver; metric: { key: keyof GameDriver; label: string }; reveal: boolean }) {
  return (
    <div className="card" style={{ padding: "1rem", textAlign: "center", borderTop: `3px solid ${d.teamColour}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.headshot || ""} alt={d.name} width={64} height={64} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
      <div style={{ fontWeight: 800, marginTop: 6 }}>{d.flag} {d.name}</div>
      <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{d.team}</div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-cond)", fontSize: "2rem", color: reveal ? "var(--accent)" : "var(--muted)", minHeight: 40 }}>
        {reveal ? (d[metric.key] as number) : "?"}
      </div>
      <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{metric.label}</div>
    </div>
  );
}
