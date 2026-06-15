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
      intro="The enhanced management game. Spin for your two drivers, your car and your title sponsor — just like the Season Simulator — then run a championship campaign race by race: develop the car on a budget, survive the paddock, and watch each Grand Prix unfold on the real circuit map."
      howTo={[
        "Spin for your first and second drivers (five options each), then spin for a car and a title sponsor — your sponsor sets your starting budget.",
        "Between every round a random event hits. The paddock is brutal: more often than not it's a fine, a crash that damages the car, a blown engine or a sponsor walking — so a good week is a relief, not a given.",
        "Spend what money you have left developing the car; strong results pay prize money, poor ones leave you broke.",
        "Race the calendar and finish as high in the championship as you can — if your battered car still has the pace.",
      ]}
    >
      <CareerMode />
    </GameShell>
  );
}
