"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { RaceRow } from "@/lib/f1";

export default function DriverRaceHistory({ races }: { races: RaceRow[] }) {
  const seasons = useMemo(
    () => Array.from(new Set(races.map((r) => r.season))).sort((a, b) => b - a),
    [races]
  );
  const [season, setSeason] = useState<number>(seasons[0] ?? 0);

  const rows = useMemo(
    () => races.filter((r) => r.season === season).sort((a, b) => a.round - b.round),
    [races, season]
  );

  const summary = useMemo(() => {
    const wins = rows.filter((r) => r.position === 1).length;
    const podiums = rows.filter((r) => r.position != null && r.position <= 3).length;
    const points = rows.reduce((s, r) => s + r.points, 0);
    const poles = rows.filter((r) => r.grid === 1).length;
    return { wins, podiums, points, poles, starts: rows.length };
  }, [rows]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="scroll-x" style={{ display: "flex", gap: 6, overflowX: "auto", whiteSpace: "nowrap" }}>
        {seasons.map((y) => (
          <button
            key={y}
            className="chip"
            onClick={() => setSeason(y)}
            style={{ flex: "0 0 auto", cursor: "pointer", borderColor: y === season ? "var(--accent)" : "var(--border)", color: y === season ? "var(--accent)" : "var(--text)" }}
          >
            {y}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: ".8rem" }}>
        <span className="chip">{summary.starts} starts</span>
        <span className="chip">🏆 {summary.wins} wins</span>
        <span className="chip">🥂 {summary.podiums} podiums</span>
        <span className="chip">⚡ {summary.poles} poles</span>
        <span className="chip" style={{ color: "var(--gold)" }}>{summary.points} pts</span>
      </div>

      <div className="card scroll-x">
        <table className="stat">
          <thead>
            <tr><th>Rnd</th><th>Grand Prix</th><th>Grid</th><th>Finish</th><th>Pts</th><th title="F1 Fantasy points">Fan.</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.season}-${r.round}`}>
                <td style={{ fontFamily: "var(--font-mono)" }}>R{r.round}</td>
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/races/${r.season}/${r.round}`} style={{ color: "var(--text)" }}>
                    {r.race.replace(" Grand Prix", " GP")}
                    {r.fl ? <span title="Fastest lap" style={{ color: "var(--accent-2)", marginLeft: 5, fontSize: ".72rem" }}>FL</span> : null}
                  </Link>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{r.grid ? `P${r.grid}` : "—"}</td>
                <td style={{
                  fontFamily: "var(--font-mono)",
                  color: r.dnf ? "var(--danger)" : r.position === 1 ? "var(--gold)" : r.position != null && r.position <= 3 ? "var(--accent-2)" : "var(--text)",
                  fontWeight: r.position === 1 ? 700 : 400,
                }}>
                  {r.dnf ? "DNF" : r.position != null ? `P${r.position}` : "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{r.points || ""}</td>
                <td style={{
                  fontFamily: "var(--font-mono)",
                  color: r.fantasy == null ? "var(--muted)" : r.fantasy > 0 ? "var(--accent-2)" : r.fantasy < 0 ? "var(--danger)" : "var(--muted)",
                }}>
                  {r.fantasy == null ? "" : r.fantasy > 0 ? `+${r.fantasy}` : r.fantasy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
