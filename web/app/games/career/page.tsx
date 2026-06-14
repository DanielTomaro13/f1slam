import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import GameShell from "@/components/games/GameShell";
import CareerMode from "@/components/games/CareerMode";

export const metadata: Metadata = pageMeta({
  title: "F1 Career Mode — Manage a Team Across a Season",
  description:
    "The enhanced F1 management game: run a team through a championship campaign. Manage a budget, develop the car between races, navigate random events and gambles, and watch every race play out on the real track map.",
  path: "/games/career",
  keywords: ["F1 career mode", "F1 manager game", "F1 management sim", "F1 budget game", "F1 team manager"],
});

export default function Page() {
  return (
    <GameShell
      slug="career"
      emoji="🧰"
      title="Career Mode"
      intro="The enhanced management game. Sign two drivers, then run a championship campaign race by race — develop the car on a budget, ride your luck through random paddock events, and watch each Grand Prix unfold on the real circuit map."
      howTo={[
        "Sign two drivers and name your team to begin the season.",
        "Between rounds, react to a random event — a sponsor, a windfall, a fine or a gamble — then spend your budget developing the car.",
        "Strong results earn prize money to reinvest; poor ones leave you short.",
        "Race through the calendar and finish as high in the championship as you can.",
      ]}
    >
      <CareerMode />
    </GameShell>
  );
}
