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
      intro="Sign two real drivers, build your car, and simulate a full Formula 1 season against the grid. Driver skill and car performance are drawn from real career data — can you take the title?"
      howTo={[
        "Pick two drivers for your team from the real grid.",
        "Spend your development budget across chassis, power unit, aero and reliability — pace wins races, but unreliable cars don't finish.",
        "Simulate the season and see the full drivers' and constructors' championships.",
        "Win the title to be crowned champions — a perfect, race-every-win season is the ultimate Slam.",
      ]}
    >
      <SeasonSimulator />
    </GameShell>
  );
}
