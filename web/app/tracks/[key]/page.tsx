import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverF1 } from "@/lib/serverdata";
import type { Driver } from "@/lib/f1";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { flagEmoji, slugify } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import TrackMap from "@/components/TrackMap";

interface Params {
  key: string;
}

export function generateStaticParams() {
  return Object.keys(serverF1().tracks).map((key) => ({ key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { key } = await params;
  const track = serverF1().tracks[key];
  if (!track) return pageMeta({ title: "Circuit not found", path: "/tracks" });
  return pageMeta({
    title: `${track.name} — F1 Circuit & Track Map`,
    description: `Interactive track map of ${track.name} in ${track.location}, ${track.country} — ${track.corners.length} corners, circuit layout and past Grand Prix winners.`,
    path: `/tracks/${key}`,
    keywords: [
      track.name,
      `${track.name} track map`,
      `${track.country} Grand Prix`,
      "F1 circuit",
    ],
    image: track.image || undefined,
  });
}

interface WinnerRow {
  season: number;
  grandPrix: string;
  winner: string;
}

interface FormRow {
  driver: Driver;
  starts: number;
  wins: number;
  points: number;
  best: number | null;
}

export default async function TrackPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { key } = await params;
  const data = serverF1();
  const track = data.tracks[key];
  if (!track) notFound();

  // Winners at this circuit, across every season.
  const winners: WinnerRow[] = [];
  for (const [season, rounds] of Object.entries(data.calendars)) {
    for (const round of rounds) {
      if (round.circuitKey === track.key && round.winner) {
        winners.push({
          season: Number(season),
          grandPrix: round.name,
          winner: round.winner,
        });
      }
    }
  }
  winners.sort((a, b) => b.season - a.season);

  // Track form — drivers ranked by success at this circuit.
  const form: FormRow[] = [];
  for (const driver of data.drivers) {
    const here = driver.byRace.filter((r) => r.circuitKey === track.key);
    if (here.length === 0) continue;
    const wins = here.filter((r) => r.position === 1).length;
    const points = here.reduce((s, r) => s + (r.points || 0), 0);
    const finishes = here
      .map((r) => r.position)
      .filter((p): p is number => p != null);
    const best = finishes.length ? Math.min(...finishes) : null;
    form.push({ driver, starts: here.length, wins, points, best });
  }
  form.sort((a, b) => b.wins - a.wins || b.points - a.points);
  const topForm = form.slice(0, 6);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Circuits", path: "/tracks" },
          { name: track.name, path: `/tracks/${key}` },
        ])}
      />

      <nav style={{ fontSize: ".82rem" }}>
        <Link href="/tracks" style={{ color: "var(--accent)" }}>
          ← All circuits
        </Link>
      </nav>

      <header
        className="card"
        style={{ padding: "1.5rem", borderLeft: "4px solid var(--accent)" }}
      >
        <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 900, textTransform: "uppercase" }}>
          {flagEmoji(track.countryCode)} {track.name}
        </h1>
        <div style={{ color: "var(--muted)" }}>
          {track.location}, {track.country}
        </div>
        <div style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 4 }}>
          {track.corners.length} corners
        </div>
      </header>

      <section className="card" style={{ padding: "1rem" }}>
        <TrackMap track={track} height={320} animate lapSeconds={7} />
      </section>

      {winners.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              textTransform: "uppercase",
              fontFamily: "var(--font-cond)",
            }}
          >
            Winners at this circuit
          </h2>
          <div className="card scroll-x" style={{ padding: "0.25rem" }}>
            <table className="stat">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Grand Prix</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w, i) => (
                  <tr key={`${w.season}-${i}`}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{w.season}</td>
                    <td>{w.grandPrix}</td>
                    <td style={{ color: "var(--gold)", fontWeight: 700 }}>{w.winner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {topForm.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              textTransform: "uppercase",
              fontFamily: "var(--font-cond)",
            }}
          >
            Most successful here
          </h2>
          <div className="card scroll-x" style={{ padding: "0.25rem" }}>
            <table className="stat">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Starts</th>
                  <th>Wins</th>
                  <th>Best</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {topForm.map((row) => {
                  const name = `${row.driver.firstName} ${row.driver.lastName}`;
                  return (
                    <tr key={row.driver.number}>
                      <td>
                        <Link
                          href={`/drivers/${row.driver.number}/${slugify(name)}`}
                          style={{ color: "var(--text)", fontWeight: 700, textDecoration: "none" }}
                        >
                          {flagEmoji(row.driver.country)} {name}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{row.starts}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{row.wins}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        {row.best != null ? `P${row.best}` : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
