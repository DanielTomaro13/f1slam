/** The mini-game catalogue — shared by the home page and the /games hub. */
export interface GameDef {
  slug: string;
  title: string;
  emoji: string;
  blurb: string;
  tag: string;
}

export const GAMES: GameDef[] = [
  { slug: "grand-slam", title: "Grand Slam", emoji: "🏆", blurb: "Pick the greatest career for all ten seats. Only a flawless grid wins — about 5% do.", tag: "Hard" },
  { slug: "gridle", title: "Gridle", emoji: "🟥", blurb: "Guess the mystery F1 driver in 8 tries. A new driver every day.", tag: "Daily" },
  { slug: "higher-or-lower", title: "Higher or Lower", emoji: "📈", blurb: "More wins, podiums, poles or points? Keep the streak alive.", tag: "Endless" },
  { slug: "guess-the-driver", title: "Guess the Driver", emoji: "🕵️", blurb: "Seven clues, one driver. Solve it early for more points.", tag: "Daily" },
  { slug: "pit-stop", title: "Pit Stop", emoji: "⏱️", blurb: "Name as many F1 drivers as you can before the 60-second tyre change ends.", tag: "Timed" },
];

export const gameBySlug = (slug: string) => GAMES.find((g) => g.slug === slug);
