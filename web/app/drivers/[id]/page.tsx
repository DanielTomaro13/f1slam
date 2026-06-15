import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverF1, serverHistory } from "@/lib/serverdata";
import { driverById } from "@/lib/f1";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { flagEmoji } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import DriverRaceHistory from "@/components/DriverRaceHistory";

interface Params {
  id: string;
}

export function generateStaticParams() {
  return serverF1().drivers.map((d) => ({ id: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const d = driverById(serverF1(), id);
  if (!d) return pageMeta({ title: "Driver not found", path: "/drivers" });
  const c = d.career;
  const titles =
    c.championships > 0
      ? `${c.championships}× World Champion — `
      : "";
  return pageMeta({
    title: `${d.name} — F1 Career Stats`,
    description: `${titles}${d.name}'s full Formula 1 record: ${c.wins} wins, ${c.poles} poles, ${c.points} points across ${c.seasons} seasons (${c.firstYear}–${c.lastYear}).`,
    path: `/drivers/${d.id}`,
    keywords: [
      d.name,
      `${d.name} stats`,
      `${d.name} F1 career`,
      "F1 driver stats",
    ],
    image: d.headshot || undefined,
  });
}

const headingStyle = {
  fontSize: "1.3rem",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  fontFamily: "var(--font-cond)",
};

export default async function DriverPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const data = serverF1();
  const d = driverById(data, id);
  if (!d) notFound();

  const c = d.career;
  const history = serverHistory(d.id);

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: d.name,
    nationality: d.nationality,
    jobTitle: "Formula One Driver",
    url: `https://f1slam.com/drivers/${d.id}`,
    ...(d.headshot ? { image: d.headshot } : {}),
    description: `${d.name} — ${c.championships > 0 ? `${c.championships}× Formula 1 World Champion, ` : ""}${c.wins} Grand Prix wins, ${c.podiums} podiums and ${c.poles} pole positions across ${c.races} starts (${c.firstYear}–${c.lastYear}).`,
    ...(c.championships > 0 ? { award: `${c.championships}× Formula 1 World Champion` } : {}),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={personLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Drivers", path: "/drivers" },
          { name: d.name, path: `/drivers/${d.id}` },
        ])}
      />

      <nav style={{ fontSize: ".82rem" }}>
        <Link href="/drivers" style={{ color: "var(--accent)" }}>
          ← All drivers
        </Link>
      </nav>

      <header
        className="card"
        style={{
          padding: "1.5rem",
          borderLeft: `4px solid ${d.latestTeamColour}`,
          display: "flex",
          gap: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {d.headshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.headshot}
            alt={d.name}
            width={96}
            height={96}
            style={{
              borderRadius: 16,
              background: "var(--panel-2)",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: 96,
              height: 96,
              borderRadius: 16,
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              fontFamily: "var(--font-cond)",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "var(--muted)",
            }}
          >
            {d.code}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            #{d.code} · {d.nationality}
          </div>
          <h1
            style={{
              margin: "2px 0 4px",
              fontSize: "2rem",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            {flagEmoji(d.country)} {d.name}
          </h1>
          <div style={{ color: d.latestTeamColour, fontWeight: 700 }}>
            {d.latestTeam}
          </div>
          <div style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: 4 }}>
            {c.firstYear}–{c.lastYear} · {c.seasons} seasons
          </div>
        </div>
      </header>

      <section className="grid-cards">
        <StatCard label="World titles" value={c.championships} gold />
        <StatCard label="Race wins" value={c.wins} gold />
        <StatCard label="Podiums" value={c.podiums} />
        <StatCard label="Pole positions" value={c.poles} />
        <StatCard label="Career points" value={c.points} />
        <StatCard label="Race starts" value={c.races} />
        <StatCard label="Seasons" value={c.seasons} />
        <StatCard label="Best championship" value={c.bestPos ? `P${c.bestPos}` : "—"} />
        {c.fantasy != null && <StatCard label="Fantasy points" value={c.fantasy.toLocaleString()} />}
      </section>

      <section>
        <h2 style={headingStyle}>Season by season</h2>
        <div className="card scroll-x" style={{ padding: "0.25rem" }}>
          <table className="stat">
            <thead>
              <tr>
                <th>Year</th>
                <th>Team</th>
                <th>Pos</th>
                <th>Wins</th>
                <th>Poles</th>
                <th>Pod.</th>
                <th>Points</th>
                <th title="F1 Fantasy points scored that season">Fantasy</th>
                <th title="Average finishing position">Avg</th>
                <th title="Race head-to-head vs team-mate">vs Mate</th>
                <th title="Season rating used by the games">OVR</th>
              </tr>
            </thead>
            <tbody>
              {d.bySeason.map((s) => (
                <tr key={`${s.year}-${s.team}`}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{s.year}</td>
                  <td>
                    <span style={{ color: s.teamColour, fontWeight: 700 }}>▍</span>{" "}
                    {s.team}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: s.position === 1 ? "var(--gold)" : "var(--text)",
                      fontWeight: s.position === 1 ? 700 : 400,
                    }}
                  >
                    {s.position ? `P${s.position}` : "NC"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{s.wins}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{s.poles}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{s.podiums}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>
                    {s.points}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-2)" }}>
                    {s.fantasy != null ? s.fantasy : "—"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {s.avgFinish != null ? `P${s.avgFinish}` : "—"}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-2)" }}>
                    {s.tmR ?? "—"}
                  </td>
                  <td style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", fontSize: "1rem" }}>
                    {s.rating}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>
            Race by race
          </h2>
          <DriverRaceHistory races={history} />
        </section>
      )}

      <p style={{ color: "var(--muted)" }}>
        Want more {d.first}?{" "}
        <Link href="/games/season" style={{ color: "var(--accent)" }}>
          Spin this driver into a team
        </Link>{" "}
        or test your knowledge in{" "}
        <Link href="/games/higher-or-lower" style={{ color: "var(--accent)" }}>
          Higher or Lower
        </Link>
        .
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  gold,
}: {
  label: string;
  value: number | string;
  gold?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "1.1rem" }}>
      <div
        style={{
          fontFamily: "var(--font-cond)",
          fontSize: "2.2rem",
          fontWeight: 800,
          lineHeight: 1,
          color: gold ? "var(--gold)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: ".72rem",
          textTransform: "uppercase",
          letterSpacing: ".05em",
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
