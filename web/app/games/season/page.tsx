import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import SeasonSimulator from "@/components/games/SeasonSimulator";

export const metadata: Metadata = pageMeta({
  title: "F1 Season Simulator — Build a Team & Race a Season",
  description:
    "Sign two real F1 drivers, build your car across chassis, power unit, aero and reliability, then simulate a full championship season against the grid. Can you win the title?",
  path: "/games/season",
  keywords: ["F1 season simulator", "F1 team builder game", "build an F1 team", "F1 management game", "F1 championship simulator"],
});

export default function Page() {
  return (
    <GameShell
      slug="season"
      emoji="🏆"
      title="Season Simulator"
      intro="Spin for your two drivers, your engineering team and your title sponsor, then develop the car and simulate a full Formula 1 season against the grid. It's a gamble — the spins decide what you've got to work with. Can you take the title anyway?"
      howTo={[
        "Spin for your first driver — the wheel deals you five from the real grid, and you pick one (no take-backs). Spin again for your second.",
        "Spin for an engineering team — each gives a different base car (some fast, some reliable, some a gamble).",
        "Spin for a title sponsor — the bigger the backer, the bigger your development budget.",
        "Spend that budget improving the car across chassis, power unit, aero and reliability — pace wins races, but unreliable cars don't finish.",
        "Simulate the season. Win the title to be crowned champions — a perfect, win-every-race season is the ultimate Slam.",
      ]}
    >
      <SeasonSimulator />
    </GameShell>
  );
}
