import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import GuessTheDriver from "@/components/games/GuessTheDriver";

export const metadata: Metadata = pageMeta({
  title: "Guess the Driver — Daily F1 Clue Game",
  description:
    "Seven clues, one Formula 1 driver. Reveal the team, nationality, number and stats one at a time — solve it early for more points. New driver daily.",
  path: "/games/guess-the-driver",
  keywords: ["guess the F1 driver", "F1 clue game", "daily F1 quiz", "F1 trivia"],
});

export default function Page() {
  return (
    <GameShell
      slug="guess-the-driver"
      emoji="🕵️"
      title="Guess the Driver"
      intro="A mystery Formula 1 driver hides behind seven clues — team, nationality, car number, wins and more. Reveal as few as you can and name them for maximum points."
      howTo={[
        "Reveal clues one at a time, or take a guess at any point.",
        "The fewer clues you reveal before guessing correctly, the more points you score.",
        "You get one guess per remaining clue — choose your moment.",
        "A new driver is set every day at midnight UTC.",
      ]}
    >
      <GuessTheDriver />
    </GameShell>
  );
}
