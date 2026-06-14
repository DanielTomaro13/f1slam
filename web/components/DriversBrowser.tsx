"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Driver } from "@/lib/f1";
import { driverHref } from "@/lib/f1";

type SortKey = "championships" | "wins" | "poles" | "points" | "seasons";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "championships", label: "Titles" },
  { key: "wins", label: "Wins" },
  { key: "poles", label: "Poles" },
  { key: "points", label: "Points" },
  { key: "seasons", label: "Seasons" },
];

const ALL_ERAS = "All time" as const;
const DECADES = [
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
] as const;

/** Career [firstYear,lastYear] overlaps the given decade (e.g. "1990s"). */
function inDecade(d: Driver, decade: string): boolean {
  const start = parseInt(decade, 10);
  const end = start + 9;
  return d.career.firstYear <= end && d.career.lastYear >= start;
}

export default function DriversBrowser({ drivers }: { drivers: Driver[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("championships");
  const [era, setEra] = useState<string>(ALL_ERAS);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drivers
      .filter(
        (d) =>
          !needle ||
          `${d.name} ${d.latestTeam} ${d.nationality} ${d.code}`
            .toLowerCase()
            .includes(needle)
      )
      .filter((d) => era === ALL_ERAS || inDecade(d, era))
      .slice()
      .sort((a, b) => b.career[sort] - a.career[sort]);
  }, [drivers, q, sort, era]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search drivers, teams, nationality…"
          aria-label="Search drivers"
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
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
          {SORTS.map((s) => (
            <button
              key={s.key}
              className="nav-link"
              onClick={() => setSort(s.key)}
              style={{
                whiteSpace: "nowrap",
                borderColor: sort === s.key ? "var(--accent)" : "var(--border)",
                color: sort === s.key ? "var(--accent)" : "var(--text)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
        <button
          className="chip"
          onClick={() => setEra(ALL_ERAS)}
          style={{
            whiteSpace: "nowrap",
            borderColor: era === ALL_ERAS ? "var(--accent)" : "var(--border)",
            color: era === ALL_ERAS ? "var(--accent)" : "var(--text)",
          }}
        >
          {ALL_ERAS}
        </button>
        {DECADES.map((dec) => (
          <button
            key={dec}
            className="chip"
            onClick={() => setEra(dec)}
            style={{
              whiteSpace: "nowrap",
              borderColor: era === dec ? "var(--accent)" : "var(--border)",
              color: era === dec ? "var(--accent)" : "var(--text)",
            }}
          >
            {dec}
          </button>
        ))}
      </div>

      <div className="grid-cards">
        {list.map((d) => (
          <Link
            key={d.id}
            href={driverHref(d.id)}
            className="card"
            style={{ padding: "1rem", display: "grid", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 4,
                  alignSelf: "stretch",
                  background: d.latestTeamColour,
                  borderRadius: 2,
                }}
              />
              {d.headshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.headshot}
                  alt={d.name}
                  width={52}
                  height={52}
                  loading="lazy"
                  style={{
                    borderRadius: 10,
                    background: "var(--panel-2)",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    fontFamily: "var(--font-cond)",
                    fontWeight: 800,
                    fontSize: ".95rem",
                    color: "var(--muted)",
                  }}
                >
                  {d.code}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.flag} {d.name}
                </div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>
                  {d.latestTeam} · {d.career.firstYear}–{d.career.lastYear}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: ".82rem", color: "var(--muted)" }}>
              <Stat label="Titles" value={d.career.championships} />
              <Stat label="Wins" value={d.career.wins} />
              <Stat label="Poles" value={d.career.poles} />
              <Stat label="Pts" value={d.career.points} gold />
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <p style={{ color: "var(--muted)" }}>No drivers match “{q}”.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-cond)",
          fontSize: "1.05rem",
          color: gold ? "var(--gold)" : "var(--text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: ".64rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
    </div>
  );
}
