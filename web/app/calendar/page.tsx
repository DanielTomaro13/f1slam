import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import { calendar } from "@/lib/f1";
import JsonLd from "@/components/JsonLd";
import CalendarView from "@/components/CalendarView";

export const metadata: Metadata = pageMeta({
  title: "F1 Race Calendar",
  description:
    "The full Formula 1 race calendar by season — every Grand Prix, circuit, date and winner, with track maps.",
  path: "/calendar",
  keywords: ["F1 calendar", "F1 schedule", "Grand Prix calendar", "F1 race dates"],
});

export default function CalendarPage() {
  const data = serverF1();
  const current = calendar(data, data.currentSeason);

  const eventsLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Formula 1 ${data.currentSeason} race calendar`,
    itemListElement: current.map((r) => ({
      "@type": "ListItem",
      position: r.round,
      item: {
        "@type": "SportsEvent",
        name: `${r.name} ${data.currentSeason}`,
        startDate: r.raceDate,
        sport: "Formula 1",
        eventStatus: "https://schema.org/EventScheduled",
        location: { "@type": "Place", name: `${r.circuit}, ${r.country}` },
        url: `${SITE.url}/calendar`,
      },
    })),
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <JsonLd data={eventsLd} />
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
          {data.currentSeason} Calendar
        </h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          Every Grand Prix of the season — circuit, date and winner, with track maps. Pick a season to explore.
        </p>
      </header>

      <CalendarView data={data} />
    </div>
  );
}
