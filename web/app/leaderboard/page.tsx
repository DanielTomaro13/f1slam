import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import LeaderboardView from "@/components/LeaderboardView";

export const metadata: Metadata = pageMeta({
  title: "Hall of Fame — F1Slam Leaderboards",
  description:
    "Global leaderboards for every F1Slam game — top Grand Slam scores, Higher or Lower streaks, Pit Stop runs and daily Gridle streaks.",
  path: "/leaderboard",
  keywords: ["F1 game leaderboard", "F1Slam hall of fame", "F1 high scores"],
});

export default function LeaderboardPage() {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Hall of Fame</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          The best runs across the games vault. Set a name, post a score, climb the board.
        </p>
      </header>
      <LeaderboardView />
    </div>
  );
}
