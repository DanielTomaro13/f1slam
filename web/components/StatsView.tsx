"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { F1Data } from "@/lib/f1";
import { driverStandings, driverHref } from "@/lib/f1";

type Scope = "all" | number;

interface Leader {
  href: string | null;
  label: string;
  value: number;
}

interface BoardCard {
  key: string;
  title: string;
  rows: Leader[];
}

function topDrivers(
  data: F1Data,
  pick: (d: F1Data["drivers"][number]) => number,
  limit: number
): Leader[] {
  return data.drivers
    .map((d) => ({ href: driverHref(d.id), label: `${d.flag} ${d.name}`, value: pick(d) }))
    .filter((r) => r.value > 0)
    .sort((a, z) => z.value - a.value)
    .slice(0, limit);
}

export default function StatsView({ data }: { data: F1Data }) {
  const [scope, setScope] = useState<Scope>("all");

  const boards = useMemo<BoardCard[]>(() => {
    if (scope === "all") {
      const drv = (
        title: string,
        pick: (d: F1Data["drivers"][number]) => number
      ): BoardCard => ({ key: title, title, rows: topDrivers(data, pick, 12) });

      const constructorTitles: Leader[] = data.constructors
        .map((c) => ({ href: null, label: `${c.flag} ${c.name}`, value: c.career.championships }))
        .filter((r) => r.value > 0)
        .sort((a, z) => z.value - a.value)
        .slice(0, 10);

      return [
        drv("🏆 Most titles", (d) => d.career.championships),
        drv("🏁 Most wins", (d) => d.career.wins),
        drv("🥂 Most podiums", (d) => d.career.podiums),
        drv("⚡ Most poles", (d) => d.career.poles),
        drv("📊 Most points", (d) => d.career.points),
        { key: "ctor-titles", title: "🏆 Most constructor titles", rows: constructorTitles },
      ];
    }

    const rows = driverStandings(data, scope);
    const mostWins: Leader[] = rows
      .map((r) => ({ href: driverHref(r.driverId), label: `${r.flag} ${r.name}`, value: r.wins }))
      .filter((r) => r.value > 0)
      .sort((a, z) => z.value - a.value)
      .slice(0, 12);
    const mostPoints: Leader[] = rows
      .map((r) => ({ href: driverHref(r.driverId), label: `${r.flag} ${r.name}`, value: r.points }))
      .filter((r) => r.value > 0)
      .sort((a, z) => z.value - a.value)
      .slice(0, 12);

    return [
      { key: "season-wins", title: "🏁 Most wins", rows: mostWins },
      { key: "season-points", title: "📊 Most points", rows: mostPoints },
    ];
  }, [data, scope]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div
        className="scroll-x"
        style={{ display: "flex", gap: 6, overflowX: "auto", whiteSpace: "nowrap" }}
      >
        <button
          className="chip"
          onClick={() => setScope("all")}
          style={{
            cursor: "pointer",
            borderColor: scope === "all" ? "var(--accent)" : "var(--border)",
            color: scope === "all" ? "var(--accent)" : "var(--text)",
          }}
        >
          All-time
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

      <div
        className="grid-cards"
        style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}
      >
        {boards.map((b) => (
          <div key={b.key} className="card" style={{ padding: "1.1rem" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontFamily: "var(--font-cond)" }}>
              {b.title}
            </h2>
            {b.rows.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No data.</p>
            ) : (
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                {b.rows.map((r, i) => (
                  <li
                    key={`${b.key}-${i}`}
                    style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem" }}
                  >
                    <span
                      style={{
                        width: 18,
                        color: i === 0 ? "var(--gold)" : "var(--muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {i + 1}
                    </span>
                    {r.href ? (
                      <Link
                        href={r.href}
                        style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {r.label}
                      </Link>
                    ) : (
                      <span
                        style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {r.label}
                      </span>
                    )}
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
