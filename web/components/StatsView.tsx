"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { F1Data, Driver } from "@/lib/f1";
import { flagEmoji, slugify } from "@/lib/format";

type Scope = "career" | number;
type Board = { key: "wins" | "podiums" | "poles" | "points"; label: string; emoji: string };

const BOARDS: Board[] = [
  { key: "wins", label: "Most wins", emoji: "🏆" },
  { key: "podiums", label: "Most podiums", emoji: "🥂" },
  { key: "poles", label: "Most poles", emoji: "⚡" },
  { key: "points", label: "Most points", emoji: "📊" },
];

type Row = { driver: Driver; value: number };

export default function StatsView({ data }: { data: F1Data }) {
  const [scope, setScope] = useState<Scope>("career");

  const boards = useMemo(() => {
    return BOARDS.map((b) => {
      // Poles are not present in per-season race data → omit for a season scope.
      if (scope !== "career" && b.key === "poles") return null;

      const rows: Row[] = data.drivers
        .map((driver): Row => {
          let value: number;
          if (scope === "career") {
            value = driver.stats[b.key];
          } else {
            const races = driver.byRace.filter((r) => r.season === scope);
            if (b.key === "wins") value = races.filter((r) => r.position === 1).length;
            else if (b.key === "podiums") value = races.filter((r) => r.position != null && r.position <= 3).length;
            else value = races.reduce((sum, r) => sum + r.points, 0); // points
          }
          return { driver, value };
        })
        .filter((r) => r.value > 0)
        .sort((a, z) => z.value - a.value)
        .slice(0, 10);

      return { ...b, rows };
    }).filter((b): b is Board & { rows: Row[] } => b !== null);
  }, [data, scope]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="scroll-x" style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        <button
          className="chip"
          onClick={() => setScope("career")}
          style={{
            cursor: "pointer",
            borderColor: scope === "career" ? "var(--accent)" : "var(--border)",
            color: scope === "career" ? "var(--accent)" : "var(--text)",
          }}
        >
          Career
        </button>
        {data.seasons.map((y) => (
          <button
            key={y}
            className="chip"
            onClick={() => setScope(y)}
            style={{
              cursor: "pointer",
              borderColor: scope === y ? "var(--accent)" : "var(--border)",
              color: scope === y ? "var(--accent)" : "var(--text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {y}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        {boards.map((b) => (
          <div key={b.key} className="card" style={{ padding: "1.1rem" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>{b.emoji} {b.label}</h2>
            {b.rows.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No data yet.</p>
            ) : (
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                {b.rows.map((r, i) => (
                  <li key={r.driver.number} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem" }}>
                    <span style={{ width: 18, color: i === 0 ? "var(--gold)" : "var(--muted)", fontFamily: "var(--font-mono)" }}>{i + 1}</span>
                    <Link
                      href={`/drivers/${r.driver.number}/${slugify(`${r.driver.firstName} ${r.driver.lastName}`)}`}
                      style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {flagEmoji(r.driver.country)} {r.driver.firstName} {r.driver.lastName}
                    </Link>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{r.value}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
