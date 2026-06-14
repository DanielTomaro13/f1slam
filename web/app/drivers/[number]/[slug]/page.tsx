import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverF1 } from "@/lib/serverdata";
import { driverTable, type Driver } from "@/lib/f1";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { flagEmoji, slugify } from "@/lib/format";
import JsonLd from "@/components/JsonLd";
import DriverRaceHistory from "@/components/DriverRaceHistory";

interface Params { number: string; slug: string }

function find(number: string): Driver | undefined {
  return serverF1().drivers.find((d) => String(d.number) === number);
}

export function generateStaticParams() {
  return serverF1().drivers.map((d) => ({
    number: String(d.number),
    slug: slugify(`${d.firstName} ${d.lastName}`),
  }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { number } = await params;
  const d = find(number);
  if (!d) return pageMeta({ title: "Driver not found", path: "/drivers" });
  const name = `${d.firstName} ${d.lastName}`;
  return pageMeta({
    title: `${name} — F1 Career Stats`,
    description: `${name} (#${d.number}, ${d.team}) — ${d.stats.wins} wins, ${d.stats.podiums} podiums, ${d.stats.poles} poles and ${d.stats.points} points across ${d.stats.races} races in the OpenF1 era.`,
    path: `/drivers/${d.number}/${slugify(name)}`,
    image: d.headshot || undefined,
  });
}

export default async function DriverPage({ params }: { params: Promise<Params> }) {
  const { number } = await params;
  const d = find(number);
  if (!d) notFound();

  const data = serverF1();
  const standing = driverTable(data).find((s) => s.number === d.number);
  const name = `${d.firstName} ${d.lastName}`;

  const stats: { label: string; value: string | number; gold?: boolean }[] = [
    { label: "Championship", value: standing ? `P${standing.position}` : "—" },
    { label: "Points (season)", value: standing?.points ?? "—", gold: true },
    { label: "Career wins", value: d.stats.wins },
    { label: "Podiums", value: d.stats.podiums },
    { label: "Pole positions", value: d.stats.poles },
    { label: "Career points", value: d.stats.points, gold: true },
    { label: "Races", value: d.stats.races },
    { label: "Best finish", value: d.stats.bestFinish ? `P${d.stats.bestFinish}` : "—" },
    { label: "DNFs", value: d.stats.dnf },
  ];

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={breadcrumbJsonLd([
        { name: "Drivers", path: "/drivers" },
        { name, path: `/drivers/${d.number}/${slugify(name)}` },
      ])} />
      <nav style={{ fontSize: ".82rem" }}>
        <Link href="/drivers" style={{ color: "var(--accent)" }}>← All drivers</Link>
      </nav>

      <header className="card" style={{ padding: "1.5rem", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", borderLeft: `4px solid ${d.teamColour}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.headshot || ""} alt={name} width={96} height={96} style={{ borderRadius: 14, background: "var(--panel-2)", objectFit: "cover" }} />
        <div>
          <div style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: ".9rem" }}>#{d.number} · {d.code}</div>
          <h1 style={{ margin: "2px 0 4px", fontSize: "2rem", fontWeight: 900, textTransform: "uppercase" }}>
            {flagEmoji(d.country)} {name}
          </h1>
          <div style={{ color: d.teamColour, fontWeight: 700 }}>{d.team}</div>
        </div>
      </header>

      <section className="grid-cards">
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: "1rem", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.8rem", color: s.gold ? "var(--gold)" : "var(--text)" }}>{s.value}</div>
            <div style={{ color: "var(--muted)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>Race history</h2>
        <DriverRaceHistory races={d.byRace} driverName={name} />
      </section>

      <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
        Career figures aggregate every race {name} has started in the OpenF1 era ({data.currentSeason} and back to 2023).
        Want a challenge? <Link href="/games/guess-the-driver" style={{ color: "var(--accent)" }}>Guess the Driver</Link> or
        test your knowledge in <Link href="/games/higher-or-lower" style={{ color: "var(--accent)" }}>Higher or Lower</Link>.
      </p>
    </div>
  );
}
