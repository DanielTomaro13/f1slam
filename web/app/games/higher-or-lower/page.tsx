import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import HigherOrLower from "@/components/games/HigherOrLower";

export const metadata: Metadata = pageMeta({
  title: "Higher or Lower — F1 Driver Stats",
  description:
    "Which F1 driver has more career wins, podiums, poles or points? Keep guessing and build the longest streak you can.",
  path: "/games/higher-or-lower",
  keywords: ["F1 higher or lower", "F1 stats game", "F1 driver comparison game"],
});

export default function Page() {
  return (
    <GameShell
      slug="higher-or-lower"
      emoji="📈"
      title="Higher or Lower"
      intro="Two drivers, one stat. Does the hidden driver have more or fewer career wins, podiums, poles or points than the one shown? Keep the streak alive."
      howTo={[
        "You're shown one driver's stat and the name of a second driver.",
        "Guess whether the second driver's number is higher or lower.",
        "Get it right and the streak continues with a new pairing.",
        "One wrong answer ends the run — post your best streak to the Hall of Fame.",
      ]}
    >
      <HigherOrLower />
    </GameShell>
  );
}
