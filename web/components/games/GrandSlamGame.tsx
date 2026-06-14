"use client";
import { useEffect, useMemo, useState } from "react";
import { loadGamesData, type GameDriver } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";
import Confetti from "@/components/Confetti";

const GAME = "grand-slam";
const SEATS = 10;
const OPTIONS = 4;
const PER_SEAT = 10; // points for the single optimal pick on a seat
const PERFECT = SEATS * PER_SEAT; // 100 — the only score that counts as a Grand Slam

/**
 * Hidden career value of a driver. The exact weighting is never shown — players
 * only see wins / podiums / poles, so they must judge the *best overall* career
 * from four genuinely close candidates. Getting all ten seats exactly right is
 * meant to be rare (~5%): one slip and it is no longer a Grand Slam.
 */
function value(d: GameDriver): number {
  return d.wins * 25 + d.podiums * 10 + d.poles * 8 + d.points;
}

function shuffle<T>(arr: T[], r: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Seat {
  options: GameDriver[];
  optimalId: number; // the option with the highest hidden value
  chosen?: GameDriver;
}

export default function GrandSlamGame() {
  const [pool, setPool] = useState<GameDriver[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  function buildSeats(p: GameDriver[]): Seat[] {
    // Bias the candidate pool toward drivers with real careers so seats are made
    // of plausible, hard-to-separate names rather than one star vs three rookies.
    const sorted = [...p].sort((a, b) => value(b) - value(a));
    const used = new Set<number>();
    const out: Seat[] = [];
    for (let s = 0; s < SEATS; s++) {
      // draw OPTIONS drivers from a sliding window so they sit close in value
      const avail = sorted.filter((d) => !used.has(d.id));
      if (avail.length < OPTIONS) break;
      const anchor = Math.floor(Math.random() * Math.max(1, avail.length - OPTIONS));
      const window = avail.slice(anchor, anchor + Math.min(OPTIONS + 3, avail.length - anchor));
      const opts = shuffle(window).slice(0, OPTIONS);
      opts.forEach((o) => used.add(o.id));
      const optimalId = opts.reduce((best, o) => (value(o) > value(best) ? o : best), opts[0]).id;
      out.push({ options: opts, optimalId });
    }
    return out;
  }

  useEffect(() => {
    loadGamesData().then((d) => {
      const p = d.drivers.filter((x) => x.races >= 1);
      setPool(p);
      setSeats(buildSeats(p));
    });
  }, []);

  const score = useMemo(
    () => seats.reduce((s, seat) => s + (seat.chosen?.id === seat.optimalId ? PER_SEAT : 0), 0),
    [seats]
  );
  const optimalCount = score / PER_SEAT;
  const perfect = done && score === PERFECT;

  function choose(d: GameDriver) {
    if (done) return;
    const next = seats.map((s, i) => (i === idx ? { ...s, chosen: d } : s));
    setSeats(next);
    if (idx + 1 >= next.length) {
      const finalScore = next.reduce((s, seat) => s + (seat.chosen?.id === seat.optimalId ? PER_SEAT : 0), 0);
      recordScore(GAME, finalScore);
      setDone(true);
    } else {
      setIdx(idx + 1);
    }
  }

  function restart() {
    setSeats(buildSeats(pool));
    setIdx(0);
    setDone(false);
  }

  if (pool.length === 0) return <p style={{ color: "var(--muted)" }}>Loading drivers…</p>;
  const seat = seats[idx];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {perfect && <Confetti />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">Seat {Math.min(idx + 1, SEATS)} / {SEATS}</span>
        {done && <span className="chip" style={{ color: "var(--gold)", borderColor: "var(--gold)" }}>{score} / {PERFECT}</span>}
      </div>

      {/* drafted grid */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
        {Array.from({ length: SEATS }).map((_, i) => {
          const s = seats[i];
          const d = s?.chosen;
          const wasOptimal = done && d && d.id === s.optimalId;
          return (
            <div key={i} className="card" style={{
              padding: "0.6rem 0.7rem", minHeight: 52, display: "flex", alignItems: "center", gap: 8,
              borderLeft: `3px solid ${d ? d.teamColour : "var(--border)"}`,
              borderColor: done ? (wasOptimal ? "var(--accent-2)" : d ? "var(--danger)" : "var(--border)") : "var(--border)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: ".8rem" }}>{i + 1}</span>
              {d ? (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: ".82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.flag} {d.name.split(" ").slice(-1)[0]}
                  </div>
                  {done && <div style={{ fontSize: ".7rem", color: wasOptimal ? "var(--accent-2)" : "var(--danger)" }}>{wasOptimal ? "✓ optimal" : "✗ off"}</div>}
                </div>
              ) : (
                <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>{i === idx ? "choosing…" : "empty"}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* option picker */}
      {!done && seat && (
        <div>
          <p style={{ textAlign: "center", color: "var(--muted)", margin: "0 0 4px" }}>
            Seat {idx + 1}: pick the driver with the <strong style={{ color: "var(--text)" }}>greatest career</strong>.
          </p>
          <p style={{ textAlign: "center", color: "var(--muted)", margin: "0 0 10px", fontSize: ".8rem" }}>
            You only see wins, podiums and poles — choose carefully. One wrong seat and the Grand Slam is gone.
          </p>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
            {seat.options.map((d) => (
              <button key={d.id} className="card" onClick={() => choose(d)}
                style={{ padding: "1rem", textAlign: "center", cursor: "pointer", borderTop: `3px solid ${d.teamColour}`, color: "var(--text)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.headshot || ""} alt={d.name} width={56} height={56} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
                <div style={{ fontWeight: 800, marginTop: 6, fontSize: ".9rem" }}>{d.flag} {d.name}</div>
                <div style={{ color: "var(--muted)", fontSize: ".75rem" }}>{d.team}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8, fontSize: ".74rem", color: "var(--muted)" }}>
                  <span>🏆 {d.wins}</span><span>🥂 {d.podiums}</span><span>⚡ {d.poles}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="card pop" style={{ padding: "1.4rem", textAlign: "center", display: "grid", gap: 10, borderColor: perfect ? "var(--gold)" : "var(--border)" }}>
          {perfect ? (
            <>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "2rem", color: "var(--gold)", textTransform: "uppercase" }}>🏁 Grand Slam!</div>
              <p style={{ color: "var(--muted)", margin: 0 }}>A flawless grid — all ten seats optimal. That happens about 5% of the time.</p>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-cond)", fontSize: "2.4rem", color: "var(--gold)" }}>{score} / {PERFECT}</div>
              <p style={{ color: "var(--muted)", margin: 0 }}>{optimalCount} of {SEATS} seats optimal. Only a perfect {PERFECT} is a Grand Slam — go again.</p>
            </>
          )}
          <ScoreSubmit game={GAME} score={score} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={restart}>Build another</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}
