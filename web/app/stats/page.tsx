import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import { flagEmoji, slugify } from "@/lib/format";
import type { Driver } from "@/lib/f1";

export const metadata: Metadata = pageMeta({
  title: "F1 Stat Leaders",
  description:
    "Formula 1 stat leaders from the OpenF1 era — most wins, podiums, pole positions and championship points. Live leaderboards across the field.",
  path: "/stats",
  keywords: ["F1 stats", "F1 wins leaders", "F1 pole leaders", "most F1 podiums"],
});

const BOARDS: { key: keyof Driver["stats"]; label: string; emoji: string }[] = [
  { key: "wins", label: "Most wins", emoji: "🏆" },
  { key: "podiums", label: "Most podiums", emoji: "🥂" },
  { key: "poles", label: "Most pole positions", emoji: "⚡" },
  { key: "points", label: "Most points", emoji: "📊" },
];

export default function StatsPage() {
  const data = serverF1();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Stat Leaders</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Career totals across the OpenF1 era (2023–{data.season}).</p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        {BOARDS.map((b) => {
          const rows = [...data.drivers]
            .sort((a, z) => (z.stats[b.key] as number) - (a.stats[b.key] as number))
            .slice(0, 10);
          return (
            <div key={b.key} className="card" style={{ padding: "1.1rem" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>{b.emoji} {b.label}</h2>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                {rows.map((d, i) => (
                  <li key={d.number} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem" }}>
                    <span style={{ width: 18, color: i === 0 ? "var(--gold)" : "var(--muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</span>
                    <Link href={`/drivers/${d.number}/${slugify(`${d.firstName} ${d.lastName}`)}`} style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {flagEmoji(d.country)} {d.firstName} {d.lastName}
                    </Link>
                    <span style={{ fontFamily: "var(--font-cond)", color: "var(--gold)" }}>{d.stats[b.key] as number}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
