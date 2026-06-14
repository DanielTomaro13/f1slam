import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1, } from "@/lib/serverdata";
import { driverTable } from "@/lib/f1";
import { flagEmoji, fmtDate, isPast } from "@/lib/format";
import { GAMES } from "@/lib/gamelist";
import HomeLeaderboard from "@/components/HomeLeaderboard";

export const metadata: Metadata = pageMeta({
  title: "F1Slam — Formula 1 Stats, Standings & Mini-Games",
  description:
    "Live F1 championship standings, the full race calendar and a vault of free Formula 1 mini-games — Gridle, Higher or Lower, Guess the Driver, Pit Stop and the Grand Slam builder. Real OpenF1 data, new daily puzzles, global leaderboards, no sign-up.",
  path: "/",
  keywords: [
    "F1 games", "free F1 games online", "F1 standings", "guess the F1 driver",
    "F1 wordle", "Gridle", "higher or lower F1", "F1 quiz", "Grand Slam F1",
  ],
});

export default function Home() {
  const data = serverF1();
  const table = driverTable(data).slice(0, 5);
  const next = data.calendar.find((r) => !isPast(r.raceDate));
  const recent = [...data.calendar].filter((r) => r.winner).slice(-3).reverse();

  return (
    <div style={{ display: "grid", gap: "2.5rem" }}>
      {/* Hero */}
      <section className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center", overflow: "hidden" }}>
        <span className="chip" style={{ marginBottom: 14 }}>🏁 {data.season} season · live OpenF1 data · global leaderboards</span>
        <h1 style={{ fontSize: "clamp(2.1rem,5.5vw,3.6rem)", lineHeight: 1.02, margin: "0 0 .6rem", fontWeight: 900, textTransform: "uppercase" }}>
          Chase the perfect <span style={{ color: "var(--accent)" }}>Grand Slam</span>.
          <br /> Master the F1 <span style={{ color: "var(--gold)" }}>vault</span>.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 660, margin: "0 auto 1.4rem", fontSize: "1.05rem" }}>
          Pole, win, fastest lap and every lap led — the rarest day in Formula 1. Build your dream grid,
          climb the championship and beat a vault of daily F1 puzzles. Real data from every race.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/games/grand-slam" className="btn btn-primary">🏆 Play Grand Slam</Link>
          <Link href="/games" className="btn">All games</Link>
          <Link href="/standings" className="btn">Championship</Link>
        </div>
      </section>

      {/* Games vault */}
      <section>
        <SectionHead title="The Games Vault" href="/games" cta="See all" />
        <div className="grid-cards">
          {GAMES.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: "1.1rem", display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.7rem" }}>{g.emoji}</span>
                <span className="chip">{g.tag}</span>
              </div>
              <strong style={{ fontSize: "1.05rem" }}>{g.title}</strong>
              <span style={{ color: "var(--muted)", fontSize: ".88rem" }}>{g.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Championship snapshot */}
      <section>
        <SectionHead title={`Drivers' Championship ${data.season}`} href="/standings" cta="Full table" />
        <div className="card scroll-x">
          <table className="stat">
            <thead>
              <tr><th>#</th><th>Driver</th><th>Team</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {table.map((e) => (
                <tr key={e.number}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{e.position}</td>
                  <td style={{ fontWeight: 700 }}>
                    {e.driver ? `${flagEmoji(e.driver.country)} ${e.driver.firstName} ${e.driver.lastName}` : `#${e.number}`}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{e.driver?.team ?? "—"}</td>
                  <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{e.points}</td>
                </tr>
              ))}
              {table.length === 0 && (
                <tr><td colSpan={4} style={{ color: "var(--muted)" }}>Standings update after the first race.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Calendar snapshot + leaderboard */}
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div>
          <SectionHead title="Race Calendar" href="/calendar" cta="Full calendar" />
          <div className="card" style={{ padding: "1.1rem", display: "grid", gap: 10 }}>
            {next && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>NEXT</span>
                <span style={{ fontWeight: 700 }}>{flagEmoji(next.countryCode)} {next.name}</span>
                <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".85rem" }}>{fmtDate(next.raceDate)}</span>
              </div>
            )}
            {recent.map((r) => (
              <div key={r.round} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".9rem" }}>
                <span style={{ width: 22, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>R{r.round}</span>
                <span>{flagEmoji(r.countryCode)} {r.name}</span>
                <span style={{ marginLeft: "auto", color: "var(--gold)", fontFamily: "var(--font-cond)" }}>🏆 {r.winner}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHead title="Hall of Fame" href="/leaderboard" cta="View all" />
          <HomeLeaderboard />
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, textTransform: "uppercase" }}>{title}</h2>
      <Link href={href} style={{ color: "var(--accent)", fontSize: ".9rem", fontWeight: 600 }}>{cta} →</Link>
    </div>
  );
}
