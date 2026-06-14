import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import StatsView from "@/components/StatsView";

export const metadata: Metadata = pageMeta({
  title: "F1 Stat Leaders",
  description:
    "Formula 1 stat leaders — most wins, podiums, poles and points, all-time across the OpenF1 era or by season.",
  path: "/stats",
  keywords: ["F1 stats", "F1 wins leaders", "F1 pole leaders", "most F1 podiums"],
});

export default function StatsPage() {
  const data = serverF1();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Stat Leaders</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          Most wins, podiums, poles and points — all-time across the OpenF1 era or by season.
        </p>
      </header>

      <StatsView data={data} />
    </div>
  );
}
