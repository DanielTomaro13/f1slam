"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Driver } from "@/lib/f1";
import { flagEmoji, slugify } from "@/lib/format";

type SortKey = "points" | "wins" | "podiums" | "poles" | "races";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "points", label: "Points" },
  { key: "wins", label: "Wins" },
  { key: "podiums", label: "Podiums" },
  { key: "poles", label: "Poles" },
  { key: "races", label: "Races" },
];

const ALL_TEAMS = "all" as const;

export default function DriversBrowser({ drivers }: { drivers: Driver[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("points");
  const [team, setTeam] = useState<string>(ALL_TEAMS);

  const teams = useMemo(() => {
    const set = new Set<string>();
    for (const d of drivers) if (d.team) set.add(d.team);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drivers]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drivers
      .filter((d) =>
        !needle ||
        `${d.firstName} ${d.lastName} ${d.team} ${d.code}`.toLowerCase().includes(needle)
      )
      .filter((d) => team === ALL_TEAMS || d.team === team)
      .sort((a, b) => b.stats[sort] - a.stats[sort]);
  }, [drivers, q, sort, team]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search drivers or teams…"
          aria-label="Search drivers"
          style={{
            flex: "1 1 220px", minWidth: 0, padding: "0.6rem 0.8rem", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)",
          }}
        />
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
          {SORTS.map((s) => (
            <button
              key={s.key}
              className="nav-link"
              onClick={() => setSort(s.key)}
              style={{ borderColor: sort === s.key ? "var(--accent)" : "var(--border)", color: sort === s.key ? "var(--accent)" : "var(--text)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="scroll-x">
        <button
          className="chip"
          onClick={() => setTeam(ALL_TEAMS)}
          style={{ borderColor: team === ALL_TEAMS ? "var(--accent)" : "var(--border)", color: team === ALL_TEAMS ? "var(--accent)" : "var(--text)", whiteSpace: "nowrap" }}
        >
          All teams
        </button>
        {teams.map((t) => (
          <button
            key={t}
            className="chip"
            onClick={() => setTeam(t)}
            style={{ borderColor: team === t ? "var(--accent)" : "var(--border)", color: team === t ? "var(--accent)" : "var(--text)", whiteSpace: "nowrap" }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid-cards">
        {list.map((d) => (
          <Link
            key={d.number}
            href={`/drivers/${d.number}/${slugify(`${d.firstName} ${d.lastName}`)}`}
            className="card"
            style={{ padding: "1rem", display: "grid", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 4, alignSelf: "stretch", background: d.teamColour, borderRadius: 2 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.headshot || ""}
                alt={`${d.firstName} ${d.lastName}`}
                width={52}
                height={52}
                loading="lazy"
                style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {flagEmoji(d.country)} {d.firstName} {d.lastName}
                </div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>#{d.number} · {d.team}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: ".82rem", color: "var(--muted)" }}>
              <Stat label="Wins" value={d.stats.wins} />
              <Stat label="Podiums" value={d.stats.podiums} />
              <Stat label="Poles" value={d.stats.poles} />
              <Stat label="Pts" value={d.stats.points} gold />
            </div>
          </Link>
        ))}
        {list.length === 0 && <p style={{ color: "var(--muted)" }}>No drivers match “{q}”.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.05rem", color: gold ? "var(--gold)" : "var(--text)" }}>{value}</div>
      <div style={{ fontSize: ".64rem", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
    </div>
  );
}
