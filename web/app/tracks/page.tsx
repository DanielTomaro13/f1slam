import Link from "next/link";
import type { Metadata } from "next";
import { serverF1 } from "@/lib/serverdata";
import { pageMeta } from "@/lib/seo";
import { flagEmoji } from "@/lib/format";
import TrackMap from "@/components/TrackMap";

export const metadata: Metadata = pageMeta({
  title: "F1 Circuits & Track Maps",
  description:
    "Every Formula 1 circuit with an interactive track map — corners, layout and past winners.",
  path: "/tracks",
  keywords: ["F1 circuits", "F1 track maps", "Grand Prix circuits", "F1 tracks"],
});

export default function TracksPage() {
  const data = serverF1();
  const tracks = Object.values(data.tracks).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
          Circuits
        </h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          {tracks.length} Formula 1 circuits — tap any track for its interactive map, corners and past winners.
        </p>
      </header>

      <section className="grid-cards">
        {tracks.map((t) => (
          <Link
            key={t.key}
            href={`/tracks/${t.key}`}
            className="card"
            style={{ display: "block", overflow: "hidden", color: "inherit", textDecoration: "none" }}
          >
            <TrackMap track={t} height={150} animate={false} />
            <div style={{ padding: "0.9rem 1rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{t.name}</div>
              <div style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 2 }}>
                {flagEmoji(t.countryCode)} {t.country}
              </div>
              <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{t.location}</div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
