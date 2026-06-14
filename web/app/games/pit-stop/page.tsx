import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import PitStop from "@/components/games/PitStop";

export const metadata: Metadata = pageMeta({
  title: "Pit Stop — 60-Second F1 Driver Rush",
  description:
    "Name as many Formula 1 drivers as you can before the 60-second pit stop ends. A fast-fire F1 memory challenge.",
  path: "/games/pit-stop",
  keywords: ["F1 beat the clock", "name F1 drivers game", "F1 60 second game", "F1 memory game"],
});

export default function Page() {
  return (
    <GameShell
      slug="pit-stop"
      emoji="⏱️"
      title="Pit Stop"
      intro="The clock is the tyre change. Name as many real F1 drivers as you can in 60 seconds — every correct name is one more on the board."
      howTo={[
        "Hit start and the 60-second clock begins.",
        "Type a driver's surname (or full name) and submit — correct names light up green.",
        "Each driver only counts once; spelling is forgiving on accents.",
        "When the clock hits zero, post your total to the Hall of Fame.",
      ]}
    >
      <PitStop />
    </GameShell>
  );
}
