import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverRaces } from "@/lib/serverdata";
import RacesBrowser, { type RaceSummary } from "@/components/RacesBrowser";

export const metadata: Metadata = pageMeta({
  title: "F1 Race Results — Every Grand Prix Since 1950",
  description:
    "Browse every Formula 1 Grand Prix in history — filter by season, decade or search by circuit, country and winner, then open any race for the full classification, grid, fantasy points and fastest lap.",
  path: "/races",
  keywords: [
    "F1 race results",
    "Formula 1 results archive",
    "every F1 Grand Prix",
    "F1 race winners",
    "F1 classification",
  ],
});

export default function RacesPage() {
  const all = serverRaces();
  const summaries: RaceSummary[] = all.map((r) => {
    const w = r.results.find((x) => x.position === 1) ?? r.results[0];
    return {
      season: r.season,
      round: r.round,
      name: r.name,
      circuit: r.circuit,
      country: r.country,
      countryCode: r.countryCode,
      date: r.date,
      winnerName: w?.name ?? null,
      winnerCode: w?.code ?? null,
      winnerFlag: w?.flag ?? null,
      winnerTeam: w?.team ?? null,
      winnerColour: w?.teamColour ?? null,
    };
  });
  const seasons = [...new Set(summaries.map((s) => s.season))].sort((a, b) => b - a);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>
          Race Results
        </h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          All {summaries.length.toLocaleString()} Formula 1 Grands Prix since 1950. Filter by
          season or decade, search any circuit or winner, and open a race for the full classification.
        </p>
      </header>
      <RacesBrowser races={summaries} seasons={seasons} />
    </div>
  );
}
