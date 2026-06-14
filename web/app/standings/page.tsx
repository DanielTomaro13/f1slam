import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import StandingsView from "@/components/StandingsView";

export const metadata: Metadata = pageMeta({
  title: "F1 Championship Standings",
  description:
    "Live and historical F1 drivers' and constructors' championship standings by season, from real race data.",
  path: "/standings",
  keywords: ["F1 standings", "F1 championship", "drivers championship", "constructors championship"],
});

export default function StandingsPage() {
  const data = serverF1();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Championship</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          Drivers&apos; and constructors&apos; standings by season, from real OpenF1 race data.
        </p>
      </header>

      <StandingsView data={data} />
    </div>
  );
}
