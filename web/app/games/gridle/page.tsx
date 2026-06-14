import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import Gridle from "@/components/games/Gridle";

export const metadata: Metadata = pageMeta({
  title: "Gridle — The Daily F1 Driver Wordle",
  description:
    "Guess the mystery Formula 1 driver in eight tries. Each guess reveals how close you are on team, nationality, number, wins and points. A new driver every day.",
  path: "/games/gridle",
  keywords: ["F1 wordle", "Gridle", "guess the F1 driver", "daily F1 game", "F1 puzzle"],
});

export default function Page() {
  return (
    <GameShell
      slug="gridle"
      emoji="🟥"
      title="Gridle"
      intro="Wordle for Formula 1. Guess the mystery driver in eight tries — each guess grades your driver against the answer on team, nationality, car number, wins and points."
      howTo={[
        "Type a driver's name and submit your guess.",
        "Green means an exact match; orange means close (and an arrow shows higher/lower for numbers).",
        "You have eight guesses to find today's mystery driver.",
        "A new driver is chosen every day at midnight UTC — keep your streak alive.",
      ]}
    >
      <Gridle />
    </GameShell>
  );
}
