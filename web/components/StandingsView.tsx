"use client";
import { useState } from "react";
import Link from "next/link";
import type { F1Data } from "@/lib/f1";
import { driverTable, constructorTable, teamColour } from "@/lib/f1";
import { flagEmoji, slugify } from "@/lib/format";

export default function StandingsView({ data }: { data: F1Data }) {
  const [season, setSeason] = useState<number>(data.currentSeason);

  const drivers = driverTable(data, season);
  const teams = constructorTable(data, season);
  const empty = drivers.length === 0 && teams.length === 0;

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div className="scroll-x" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
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
          No standings for {season} yet — they appear after the first race.
        </div>
      ) : (
        <>
          <section>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>Drivers</h2>
            <div className="card scroll-x">
              <table className="stat">
                <thead>
                  <tr><th>#</th><th>Driver</th><th>Team</th><th>Wins</th><th>Podiums</th><th>Pts</th></tr>
                </thead>
                <tbody>
                  {drivers.map((e) => {
                    const races = e.driver?.byRace.filter((r) => r.season === season) ?? [];
                    const wins = races.filter((r) => r.position === 1).length;
                    const podiums = races.filter((r) => r.position != null && r.position <= 3).length;
                    return (
                      <tr key={e.number}>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{e.position}</td>
                        <td style={{ fontWeight: 700 }}>
                          {e.driver ? (
                            <Link href={`/drivers/${e.number}/${slugify(`${e.driver.firstName} ${e.driver.lastName}`)}`}>
                              <span style={{ color: e.driver.teamColour }}>▍</span> {flagEmoji(e.driver.country)} {e.driver.firstName} {e.driver.lastName}
                            </Link>
                          ) : `#${e.number}`}
                        </td>
                        <td style={{ color: "var(--muted)" }}>{e.driver?.team ?? "—"}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{wins}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{podiums}</td>
                        <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>{e.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>Constructors</h2>
            <div className="card scroll-x">
              <table className="stat">
                <thead>
                  <tr><th>#</th><th>Team</th><th>Points</th></tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.team}>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{t.position}</td>
                      <td style={{ fontWeight: 700 }}><span style={{ color: teamColour(data, t.team) }}>▍</span> {t.team}</td>
                      <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>{t.points}</td>
                    </tr>
                  ))}
                  {teams.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>No constructor standings for {season}.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
