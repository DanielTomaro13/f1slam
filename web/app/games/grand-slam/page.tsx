import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import GrandSlamGame from "@/components/games/GrandSlamGame";

export const metadata: Metadata = pageMeta({
  title: "Grand Slam — Build the Perfect F1 Grid",
  description:
    "Pick a driver for every seat on the grid and chase the highest Grand Slam score. Real F1 career stats decide your total — go for the perfect lineup.",
  path: "/games/grand-slam",
  keywords: ["F1 team builder", "F1 grand slam game", "build an F1 grid", "F1 fantasy game"],
});

export default function Page() {
  return (
    <GameShell
      slug="grand-slam"
      emoji="🏆"
      title="Grand Slam"
      intro="Ten seats, ten brutal choices. For each seat you're shown four real drivers and must pick the one with the greatest career — judging only by wins, podiums and poles. Get all ten exactly right for a Grand Slam. It's meant to be rare: only a flawless, perfectly-optimal grid wins, roughly 5% of the time."
      howTo={[
        "For each of the ten seats, four real drivers are offered.",
        "Pick the one you believe has the greatest overall F1 career — you only see wins, podiums and poles, never the exact ranking.",
        "Each correct (optimal) seat is worth 10 points; a wrong seat scores nothing.",
        "Only a perfect 100/100 — every seat optimal — counts as a Grand Slam. One slip and the run is broken.",
        "Your score posts to the Hall of Fame either way, so chase that perfect grid.",
      ]}
    >
      <GrandSlamGame />
    </GameShell>
  );
}
