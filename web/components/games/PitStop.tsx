"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "pit-stop";
const DURATION = 60;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

export default function PitStop() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const [input, setInput] = useState("");
  const [found, setFound] = useState<GameDriver[]>([]);
  const [flash, setFlash] = useState<"" | "hit" | "miss">("");
  const [newBest, setNewBest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadGamesData().then((d) => setPool(d.drivers)); }, []);

  // surname + full-name lookup → driver id
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of pool) {
      m.set(norm(d.name), d.id);
      m.set(norm(d.name.split(" ").slice(-1)[0]), d.id);
    }
    return m;
  }, [pool]);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) { finish(); return; }
    const id = setTimeout(() => setLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [running, left]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    setRunning(true);
    setOver(false);
    setLeft(DURATION);
    setFound([]);
    setInput("");
    setNewBest(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function finish() {
    setRunning(false);
    setOver(true);
    setNewBest(recordScore(GAME, found.length) && found.length > 0);
  }

  function onChange(v: string) {
    setInput(v);
    const id = lookup.get(norm(v));
    if (id != null && !found.some((f) => f.id === id)) {
      const d = pool.find((x) => x.id === id)!;
      setFound((f) => [d, ...f]);
      setInput("");
      setFlash("hit");
      setTimeout(() => setFlash(""), 200);
    }
  }

  if (pool.length === 0) return <p style={{ color: "var(--muted)" }}>Loading drivers…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip" style={{ fontFamily: "var(--font-cond)", fontSize: "1rem", color: left <= 10 ? "var(--danger)" : "var(--text)" }}>⏱️ {left}s</span>
        <span className="chip">✅ {found.length} / {pool.length}</span>
      </div>

      {!running && !over && (
        <button className="btn btn-primary" onClick={start} style={{ justifySelf: "center" }}>Start the clock</button>
      )}

      {running && (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a driver's name…"
          aria-label="Type a driver's name"
          autoComplete="off"
          style={{
            padding: "0.7rem 0.9rem", borderRadius: 10, color: "var(--text)",
            border: `1px solid ${flash === "hit" ? "var(--accent-2)" : "var(--border)"}`,
            background: flash === "hit" ? "rgba(95,208,138,0.15)" : "var(--panel-2)",
            transition: "background .15s, border-color .15s",
          }}
        />
      )}

      {(running || over) && (
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
          {found.map((d) => (
            <div key={d.id} className="chip pop" style={{ justifyContent: "flex-start", borderColor: d.teamColour }}>
              {d.flag} {d.name}
            </div>
          ))}
        </div>
      )}

      {over && (
        <div className="card pop" style={{ padding: "1.4rem", textAlign: "center", display: "grid", gap: 10 }}>
          <div style={{ fontFamily: "var(--font-cond)", fontSize: "2.4rem", color: "var(--gold)" }}>{found.length} drivers</div>
          {newBest && <div style={{ color: "var(--gold)", fontWeight: 800 }}>🏅 New personal best!</div>}
          {found.length > 0 && <ScoreSubmit game={GAME} score={found.length} unit="drivers" />}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={start}>Race again</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}
