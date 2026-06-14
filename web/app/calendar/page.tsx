import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import { flagEmoji, fmtDateLong, isPast } from "@/lib/format";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = pageMeta({
  title: "F1 Race Calendar",
  description:
    "The full Formula 1 race calendar — every Grand Prix, circuit and date, with winners for completed rounds and a marker on the next race.",
  path: "/calendar",
  keywords: ["F1 calendar", "F1 schedule", "F1 race dates", "Grand Prix calendar"],
});

export default function CalendarPage() {
  const data = serverF1();
  const nextRound = data.calendar.find((r) => !isPast(r.raceDate))?.round;

  const eventsLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Formula 1 ${data.season} race calendar`,
    itemListElement: data.calendar.map((r) => ({
      "@type": "ListItem",
      position: r.round,
      item: {
        "@type": "SportsEvent",
        name: `${r.name} ${data.season}`,
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
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>{data.season} Calendar</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{data.calendar.length} rounds. Winners shown for completed races.</p>
      </header>

      <div style={{ display: "grid", gap: 10 }}>
        {data.calendar.map((r) => {
          const done = isPast(r.raceDate);
          const isNext = r.round === nextRound;
          return (
            <div
              key={r.round}
              className="card"
              style={{
                padding: "1rem 1.1rem", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                borderColor: isNext ? "var(--accent)" : "var(--border)",
                opacity: done && !isNext ? 0.85 : 1,
              }}
            >
              <span style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem", color: "var(--muted)", width: 44 }}>R{r.round}</span>
              <div style={{ minWidth: 180, flex: "1 1 200px" }}>
                <div style={{ fontWeight: 800 }}>{flagEmoji(r.countryCode)} {r.name}</div>
                <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>{r.circuit}, {r.country} · {fmtDateLong(r.raceDate)}</div>
              </div>
              {isNext && <span className="chip" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>NEXT RACE</span>}
              {r.winner ? (
                <span style={{ marginLeft: "auto", color: "var(--gold)", fontFamily: "var(--font-cond)", fontSize: "1.1rem" }}>🏆 {r.winner}</span>
              ) : (
                <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".82rem" }}>{done ? "—" : "Upcoming"}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
