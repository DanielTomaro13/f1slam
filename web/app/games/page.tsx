import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { GAMES } from "@/lib/gamelist";

export const metadata: Metadata = pageMeta({
  title: "F1 Mini-Games",
  description:
    "A vault of free Formula 1 mini-games — the Grand Slam grid builder, Gridle (F1 wordle), Higher or Lower, Guess the Driver and Pit Stop. New daily puzzles, global leaderboards, no sign-up.",
  path: "/games",
  keywords: ["F1 games", "free F1 games", "F1 wordle", "F1 trivia", "F1 quiz online"],
});

export default function GamesPage() {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>The Games Vault</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0", maxWidth: 640 }}>
          Five free Formula 1 games built on real race data. Daily puzzles reset at midnight UTC; endless
          modes chase a personal best. Post a score to the global Hall of Fame.
        </p>
      </header>
      <div className="grid-cards">
        {GAMES.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="card" style={{ padding: "1.3rem", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "2rem" }}>{g.emoji}</span>
              <span className="chip">{g.tag}</span>
            </div>
            <strong style={{ fontSize: "1.15rem" }}>{g.title}</strong>
            <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>{g.blurb}</span>
            <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: ".85rem", marginTop: 4 }}>Play →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
