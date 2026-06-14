"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { RaceResult } from "@/lib/f1";
import { flagEmoji } from "@/lib/format";

const ALL_SEASONS = "all" as const;
const ALL_CIRCUITS = "all" as const;

export default function DriverRaceHistory({
  races,
  driverName,
}: {
  races: RaceResult[];
  driverName: string;
}) {
  const seasons = useMemo(() => {
    const set = new Set<number>();
    for (const r of races) set.add(r.season);
    return Array.from(set).sort((a, b) => b - a);
  }, [races]);

  const latest = seasons.length > 0 ? seasons[0] : null;
  const [season, setSeason] = useState<number | typeof ALL_SEASONS>(
    latest ?? ALL_SEASONS,
  );
  const [circuit, setCircuit] = useState<string>(ALL_CIRCUITS);

  // Rows in the current season scope (before the circuit filter), used both for
  // populating the circuit <select> and as the basis for the filtered rows.
  const seasonScoped = useMemo(() => {
    return races.filter((r) => season === ALL_SEASONS || r.season === season);
  }, [races, season]);

  const circuits = useMemo(() => {
    const set = new Set<string>();
    for (const r of seasonScoped) if (r.race) set.add(r.race);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [seasonScoped]);

  const rows = useMemo(() => {
    return seasonScoped
      .filter((r) => circuit === ALL_CIRCUITS || r.race === circuit)
      .slice()
      .sort((a, b) => {
        if (b.season !== a.season) return b.season - a.season;
        return (b.round ?? 0) - (a.round ?? 0);
      });
  }, [seasonScoped, circuit]);

  const summary = useMemo(() => {
    let wins = 0;
    let podiums = 0;
    let points = 0;
    for (const r of rows) {
      if (r.position === 1) wins++;
      if (r.position != null && r.position <= 3) podiums++;
      points += r.points;
    }
    return { count: rows.length, wins, podiums, points };
  }, [rows]);

  function selectSeason(s: number | typeof ALL_SEASONS) {
    setSeason(s);
    setCircuit(ALL_CIRCUITS);
  }

  if (races.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
        No race results recorded for {driverName} yet.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
        <button
          className="chip"
          onClick={() => selectSeason(ALL_SEASONS)}
          style={chipStyle(season === ALL_SEASONS)}
        >
          All
        </button>
        {seasons.map((s) => (
          <button
            key={s}
            className="chip"
            onClick={() => selectSeason(s)}
            style={chipStyle(season === s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={circuit}
          onChange={(e) => setCircuit(e.target.value)}
          aria-label="Filter by Grand Prix"
          style={{
            padding: "0.45rem 0.6rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
            maxWidth: "100%",
          }}
        >
          <option value={ALL_CIRCUITS}>All circuits</option>
          {circuits.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="chip" style={chipStyle(false)}>
          {summary.count} race{summary.count === 1 ? "" : "s"}
        </span>
        <span className="chip" style={chipStyle(false)}>
          {summary.wins} win{summary.wins === 1 ? "" : "s"}
        </span>
        <span className="chip" style={chipStyle(false)}>
          {summary.podiums} podium{summary.podiums === 1 ? "" : "s"}
        </span>
        <span
          className="chip"
          style={{ ...chipStyle(false), color: "var(--accent-2)", borderColor: "var(--accent-2)" }}
        >
          {summary.points} pts
        </span>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          No races match this filter.
        </p>
      ) : (
        <div className="card scroll-x">
          <table className="stat">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Season</th>
                <th style={{ textAlign: "left" }}>Rnd</th>
                <th style={{ textAlign: "left" }}>Grand Prix</th>
                <th style={{ textAlign: "left" }}>Result</th>
                <th style={{ textAlign: "right" }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const label = `${r.race ?? "—"}`;
                const gp = (
                  <>
                    {flagEmoji(r.countryCode)} {label}
                  </>
                );
                return (
                  <tr key={`${r.season}-${r.round ?? "x"}-${i}`}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{r.season}</td>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      {r.round ?? "—"}
                    </td>
                    <td>
                      {r.circuitKey != null ? (
                        <Link href={`/tracks/${r.circuitKey}`} style={{ color: "var(--text)" }}>
                          {gp}
                        </Link>
                      ) : (
                        gp
                      )}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {r.dnf ? (
                        <span style={{ color: "var(--danger)" }}>DNF</span>
                      ) : r.position != null ? (
                        <span
                          style={{
                            color:
                              r.position === 1
                                ? "var(--gold)"
                                : r.position <= 3
                                ? "var(--accent-2)"
                                : "var(--text)",
                          }}
                        >
                          P{r.position}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {r.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    borderColor: active ? "var(--accent)" : "var(--border)",
    color: active ? "var(--accent)" : "var(--text)",
    whiteSpace: "nowrap",
  };
}
