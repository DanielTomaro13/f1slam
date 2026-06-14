import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { serverF1 } from "@/lib/serverdata";
import DriversBrowser from "@/components/DriversBrowser";

export const metadata: Metadata = pageMeta({
  title: "F1 Drivers",
  description:
    "Every Formula 1 driver from the OpenF1 era — career wins, podiums, poles and points, searchable and sortable. Tap through to a full profile.",
  path: "/drivers",
  keywords: ["F1 drivers", "F1 driver stats", "F1 wins", "F1 poles", "F1 driver list"],
});

export default function DriversPage() {
  const data = serverF1();
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Drivers</h1>
        <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
          Career stats across every season OpenF1 covers ({data.drivers.length} drivers). Search, sort and dive in.
        </p>
      </header>
      <DriversBrowser drivers={data.drivers} />
    </div>
  );
}
