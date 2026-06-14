import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import { driverTable } from "@/lib/f1";
import { flagEmoji, slugify } from "@/lib/format";

export const metadata: Metadata = pageMeta({
  title: "F1 Championship Standings",
  description:
    "Live Formula 1 drivers' and constructors' championship standings, updated from real race data after every Grand Prix.",
  path: "/standings",
  keywords: ["F1 standings", "F1 championship", "drivers championship", "constructors championship"],
});

export default function StandingsPage() {
  const data = serverF1();
  const drivers = driverTable(data);
  const teams = data.constructorStandings;

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
          {data.season} Championship
        </h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          {data.lastRace ? `After the ${data.lastRace.name}.` : "Season standings."} Updated from real OpenF1 race data.
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase" }}>Drivers</h2>
        <div className="card scroll-x">
          <table className="stat">
            <thead>
              <tr><th>#</th><th>Driver</th><th>Team</th><th>Wins</th><th>Podiums</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {drivers.map((e) => (
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
                  <td>{e.driver?.stats.wins ?? "—"}</td>
                  <td>{e.driver?.stats.podiums ?? "—"}</td>
                  <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>{e.points}</td>
                </tr>
              ))}
              {drivers.length === 0 && <tr><td colSpan={6} style={{ color: "var(--muted)" }}>Standings appear after the first race.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase" }}>Constructors</h2>
        <div className="card scroll-x">
          <table className="stat">
            <thead>
              <tr><th>#</th><th>Team</th><th>Points</th></tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const colour = data.drivers.find((d) => d.team === t.team)?.teamColour || "#7a7a7a";
                return (
                  <tr key={t.team}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{t.position}</td>
                    <td style={{ fontWeight: 700 }}><span style={{ color: colour }}>▍</span> {t.team}</td>
                    <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontWeight: 700 }}>{t.points}</td>
                  </tr>
                );
              })}
              {teams.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>Standings appear after the first race.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
