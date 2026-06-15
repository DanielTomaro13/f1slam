import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverF1, serverRace, serverRaces } from "@/lib/serverdata";
import { trackByKey, type RaceResultRow } from "@/lib/f1";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { flagEmoji } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import TrackMap from "@/components/TrackMap";

interface Params {
  season: string;
  round: string;
}

export function generateStaticParams() {
  return serverRaces().map((r) => ({ season: String(r.season), round: String(r.round) }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { season, round } = await params;
  const race = serverRace(season, round);
  if (!race) return pageMeta({ title: "Race not found", path: "/races" });
  const w = race.results.find((r) => r.position === 1);
  return pageMeta({
    title: `${race.season} ${race.name} — Results & Classification`,
    description: `Full result of the ${race.season} ${race.name} at ${race.circuit}${
      w ? `, won by ${w.name} (${w.team})` : ""
    } — complete classification with grid, positions gained, fantasy points and fastest lap.`,
    path: `/races/${race.season}/${race.round}`,
    keywords: [
      `${race.season} ${race.name}`,
      `${race.name} result`,
      `${race.circuit} F1`,
      "F1 race classification",
    ],
  });
}

const fmtDate = (d: string | null) =>
  d
    ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

const PODIUM = ["var(--gold)", "#c8ccd2", "#cd7f4d"]; // gold / silver / bronze

export default async function RacePage({ params }: { params: Promise<Params> }) {
  const { season, round } = await params;
  const data = serverF1();
  const race = serverRace(season, round);
  if (!race) notFound();

  const track = trackByKey(data, race.circuitKey);
  const podium = race.results.filter((r) => r.position && r.position <= 3);
  const date = fmtDate(race.date);

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${race.season} ${race.name}`,
    sport: "Formula 1",
    ...(race.date ? { startDate: race.date } : {}),
    location: { "@type": "Place", name: race.circuit, address: race.country },
    ...(podium[0]
      ? { winner: { "@type": "Person", name: podium[0].name } }
      : {}),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={eventLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Races", path: "/races" },
          { name: `${race.season} ${race.name}`, path: `/races/${race.season}/${race.round}` },
        ])}
      />

      <nav style={{ fontSize: ".82rem", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/races" style={{ color: "var(--accent)" }}>← All races</Link>
        <Link href={`/races?season=${race.season}`} style={{ color: "var(--muted)" }}>
          {race.season} season
        </Link>
      </nav>

      <header className="card" style={{ padding: "1.5rem" }}>
        <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          Round {race.round} · {race.season}
          {date ? ` · ${date}` : ""}
        </div>
        <h1 style={{ margin: "4px 0 4px", fontSize: "2rem", fontWeight: 900, textTransform: "uppercase" }}>
          {flagEmoji(race.countryCode)} {race.name}
        </h1>
        <div style={{ color: "var(--muted)" }}>{race.circuit}{race.country ? ` · ${race.country}` : ""}</div>
      </header>

      {podium.length > 0 && (
        <section className="grid-cards">
          {podium.map((r, i) => (
            <div
              key={r.driverId}
              className="card"
              style={{ padding: "1.1rem", borderTop: `3px solid ${PODIUM[i]}` }}
            >
              <div style={{ color: PODIUM[i], fontWeight: 800, fontFamily: "var(--font-cond)" }}>
                P{r.position}
              </div>
              <Link href={`/drivers/${r.driverId}`} style={{ fontWeight: 800, display: "block", marginTop: 2 }}>
                {r.flag} {r.name}
              </Link>
              <div style={{ color: r.teamColour, fontSize: ".85rem" }}>{r.team}</div>
              <div style={{ color: "var(--muted)", fontSize: ".8rem", marginTop: 4 }}>
                {r.grid ? `From P${r.grid} on the grid` : "Pit lane start"}
                {r.fl ? " · fastest lap" : ""}
              </div>
            </div>
          ))}
        </section>
      )}

      {track && (
        <section className="card" style={{ padding: "1rem" }}>
          <TrackMap track={track} height={240} />
        </section>
      )}

      <section>
        <h2
          style={{
            fontSize: "1.3rem",
            fontWeight: 800,
            textTransform: "uppercase",
            fontFamily: "var(--font-cond)",
          }}
        >
          Classification
        </h2>
        <div className="card scroll-x" style={{ padding: "0.25rem" }}>
          <table className="stat">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th title="Grid position">Grid</th>
                <th title="Positions gained or lost">+/−</th>
                <th>Points</th>
                <th title="F1 Fantasy points scored">Fantasy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {race.results.map((r) => (
                <ResultRow key={r.driverId} r={r} />
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".75rem", marginTop: 8 }}>
          Fantasy points use the{" "}
          <a
            href="https://fantasy.formula1.com/en/game-rules"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            official F1 Fantasy
          </a>{" "}
          scoring (qualifying + finish + positions gained/lost + fastest lap, minus DNF/DSQ
          penalties). Overtakes and Driver of the Day aren’t in the historical record.
        </p>
      </section>
    </div>
  );
}

function ResultRow({ r }: { r: RaceResultRow }) {
  const gl = r.gainedLost;
  return (
    <tr>
      <td
        style={{
          fontFamily: "var(--font-mono)",
          color: r.position === 1 ? "var(--gold)" : "var(--text)",
          fontWeight: r.position && r.position <= 3 ? 700 : 400,
        }}
      >
        {r.position ?? "—"}
      </td>
      <td>
        <Link href={`/drivers/${r.driverId}`} style={{ fontWeight: 600 }}>
          {r.flag} {r.name}
        </Link>
        {r.fl && (
          <span title="Fastest lap" style={{ color: "var(--accent-2)", marginLeft: 6, fontSize: ".75rem" }}>
            FL
          </span>
        )}
      </td>
      <td>
        <span style={{ color: r.teamColour, fontWeight: 700 }}>▍</span> {r.team}
      </td>
      <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{r.grid || "—"}</td>
      <td
        style={{
          fontFamily: "var(--font-mono)",
          color: gl == null || gl === 0 ? "var(--muted)" : gl > 0 ? "var(--accent-2)" : "var(--danger)",
        }}
      >
        {gl == null ? "—" : gl === 0 ? "—" : gl > 0 ? `+${gl}` : gl}
      </td>
      <td style={{ fontFamily: "var(--font-mono)", color: r.points > 0 ? "var(--gold)" : "var(--muted)" }}>
        {r.points || "—"}
      </td>
      <td
        style={{
          fontFamily: "var(--font-mono)",
          color: r.fantasy > 0 ? "var(--accent-2)" : r.fantasy < 0 ? "var(--danger)" : "var(--muted)",
        }}
      >
        {r.fantasy > 0 ? `+${r.fantasy}` : r.fantasy}
      </td>
      <td style={{ color: "var(--muted)", fontSize: ".82rem" }}>
        {r.dnf && r.position == null ? r.status || "DNF" : r.status || "Finished"}
      </td>
    </tr>
  );
}
