import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverF1 } from "@/lib/serverdata";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { flagEmoji } from "@/lib/format";
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
  raceName: string;
  winner: string;
  winnerName: string | null;
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

  // Winners at this circuit, scanned across every season.
  const trackName = track.name.toLowerCase();
  const winners: WinnerRow[] = [];
  for (const [season, rounds] of Object.entries(data.calendars)) {
    for (const round of rounds) {
      const matches =
        round.circuitKey === track.key ||
        (!!round.circuit &&
          !!track.name &&
          round.circuit.toLowerCase().includes(trackName));
      if (matches && round.winner) {
        winners.push({
          season: Number(season),
          raceName: round.name,
          winner: round.winner,
          winnerName: round.winnerName,
        });
      }
    }
  }
  winners.sort((a, b) => b.season - a.season);
  const winnerRows = winners.slice(0, 40);

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
        {winnerRows.length > 0 ? (
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
                {winnerRows.map((w, i) => (
                  <tr key={`${w.season}-${i}`}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{w.season}</td>
                    <td>{w.raceName}</td>
                    <td style={{ color: "var(--gold)", fontWeight: 700 }}>
                      {w.winnerName || w.winner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            No past winners recorded for this circuit.
          </p>
        )}
      </section>
    </div>
  );
}
