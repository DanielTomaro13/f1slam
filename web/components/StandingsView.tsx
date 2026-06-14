"use client";
import { useState } from "react";
import Link from "next/link";
import type { F1Data } from "@/lib/f1";
import { driverStandings, constructorStandings, driverHref } from "@/lib/f1";

export default function StandingsView({ data }: { data: F1Data }) {
  const [season, setSeason] = useState<number>(data.currentSeason);

  const drivers = driverStandings(data, season);
  const teams = constructorStandings(data, season);
  const empty = drivers.length === 0 && teams.length === 0;

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div
        className="scroll-x"
        style={{ display: "flex", gap: 6, overflowX: "auto", whiteSpace: "nowrap" }}
      >
        {data.seasons.map((y) => (
          <button
            key={y}
            className="chip"
            onClick={() => setSeason(y)}
            style={{
              cursor: "pointer",
              borderColor: y === season ? "var(--accent)" : "var(--border)",
              color: y === season ? "var(--accent)" : "var(--text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {y}
          </button>
        ))}
      </div>

      {empty ? (
        <div className="card" style={{ padding: "1.2rem", color: "var(--muted)" }}>
          No standings for {season}.
        </div>
      ) : (
        <>
          <section>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                textTransform: "uppercase",
                fontFamily: "var(--font-cond)",
              }}
            >
              Drivers
            </h2>
            <div className="card scroll-x">
              <table className="stat">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Driver</th>
                    <th>Team</th>
                    <th>Wins</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((row) => (
                    <tr key={row.driverId}>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{row.position}</td>
                      <td style={{ fontWeight: 700 }}>
                        <Link href={driverHref(row.driverId)}>
                          <span style={{ color: row.teamColour }}>▍</span> {row.flag} {row.name}
                        </Link>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{row.team || "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{row.wins}</td>
                      <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                textTransform: "uppercase",
                fontFamily: "var(--font-cond)",
              }}
            >
              Constructors
            </h2>
            <div className="card scroll-x">
              <table className="stat">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Wins</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{t.position}</td>
                      <td style={{ fontWeight: 700 }}>
                        <span style={{ color: t.colour }}>▍</span> {t.name}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{t.wins}</td>
                      <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>
                        {t.points}
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ color: "var(--muted)" }}>
                        No constructor standings for {season}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
