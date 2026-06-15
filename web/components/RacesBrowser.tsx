"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export interface RaceSummary {
  season: number;
  round: number;
  name: string;
  circuit: string;
  country: string;
  countryCode: string | null;
  date: string | null;
  winnerName: string | null;
  winnerCode: string | null;
  winnerFlag: string | null;
  winnerTeam: string | null;
  winnerColour: string | null;
}

const ALL = "All seasons";
const CAP = 600; // max rows rendered when browsing across every season

const decadeOf = (y: number) => `${Math.floor(y / 10) * 10}s`;
const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "";

export default function RacesBrowser({
  races,
  seasons,
}: {
  races: RaceSummary[];
  seasons: number[];
}) {
  const [q, setQ] = useState("");
  const [season, setSeason] = useState<string>(String(seasons[0])); // default: latest season

  // honour a ?season= deep-link (e.g. from a race detail page) after mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("season");
    if (p && (p === ALL || seasons.includes(Number(p)))) setSeason(p);
  }, [seasons]);

  const decades = useMemo(
    () => [...new Set(seasons.map(decadeOf))],
    [seasons]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return races.filter((r) => {
      if (season !== ALL && String(r.season) !== season) return false;
      if (!needle) return true;
      return `${r.name} ${r.circuit} ${r.country} ${r.winnerName ?? ""} ${r.season}`
        .toLowerCase()
        .includes(needle);
    });
  }, [races, q, season]);

  const shown = filtered.slice(0, CAP);
  // group rows by season so the "All seasons" view stays scannable
  const groups = useMemo(() => {
    const m = new Map<number, RaceSummary[]>();
    for (const r of shown) {
      if (!m.has(r.season)) m.set(r.season, []);
      m.get(r.season)!.push(r);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [shown]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search races, circuits, countries, winners…"
          aria-label="Search races"
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            padding: "0.6rem 0.8rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
          }}
        />
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          aria-label="Filter by season"
          style={{
            padding: "0.6rem 0.8rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--panel-2)",
            color: "var(--text)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <option value={ALL}>All seasons</option>
          {seasons.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
        <button
          className="chip"
          onClick={() => setSeason(ALL)}
          style={{
            whiteSpace: "nowrap",
            borderColor: season === ALL ? "var(--accent)" : "var(--border)",
            color: season === ALL ? "var(--accent)" : "var(--text)",
          }}
        >
          All
        </button>
        {decades.map((dec) => {
          // a decade chip jumps to that decade's most recent season
          const target = seasons.find((y) => decadeOf(y) === dec);
          const active = season !== ALL && decadeOf(Number(season)) === dec;
          return (
            <button
              key={dec}
              className="chip"
              onClick={() => target != null && setSeason(String(target))}
              style={{
                whiteSpace: "nowrap",
                borderColor: active ? "var(--accent)" : "var(--border)",
                color: active ? "var(--accent)" : "var(--text)",
              }}
            >
              {dec}
            </button>
          );
        })}
      </div>

      <div style={{ color: "var(--muted)", fontSize: ".82rem" }}>
        {filtered.length.toLocaleString()} race{filtered.length === 1 ? "" : "s"}
        {filtered.length > CAP ? ` · showing first ${CAP}, narrow your search` : ""}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {groups.map(([yr, list]) => (
          <section key={yr} style={{ display: "grid", gap: 8 }}>
            {season === ALL && (
              <h2
                style={{
                  fontFamily: "var(--font-cond)",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  margin: "4px 0 0",
                  color: "var(--muted)",
                }}
              >
                {yr}
              </h2>
            )}
            <div style={{ display: "grid", gap: 6 }}>
              {list.map((r) => (
                <Link
                  key={`${r.season}-${r.round}`}
                  href={`/races/${r.season}/${r.round}`}
                  className="card"
                  style={{
                    padding: "0.7rem 0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderLeft: `3px solid ${r.winnerColour ?? "var(--border)"}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: ".72rem",
                      color: "var(--muted)",
                      width: 30,
                      flexShrink: 0,
                    }}
                  >
                    R{r.round}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: ".78rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.circuit}
                      {r.date ? ` · ${fmtDate(r.date)}` : ""}
                    </div>
                  </div>
                  {r.winnerName && (
                    <div style={{ textAlign: "right", flexShrink: 0, maxWidth: "42%" }}>
                      <div
                        style={{
                          fontSize: ".82rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        🏆 {r.winnerFlag} {r.winnerName}
                      </div>
                      <div style={{ color: r.winnerColour ?? "var(--muted)", fontSize: ".72rem" }}>
                        {r.winnerTeam}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No races match “{q}”.</p>
        )}
      </div>
    </div>
  );
}
