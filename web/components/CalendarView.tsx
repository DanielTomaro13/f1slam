"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { F1Data, Round } from "@/lib/f1";
import { calendar, trackByKey } from "@/lib/f1";
import { flagEmoji, fmtDateLong, isPast } from "@/lib/format";
import TrackMap from "@/components/TrackMap";

export default function CalendarView({ data }: { data: F1Data }) {
  const [season, setSeason] = useState<number>(data.currentSeason);

  const rounds = useMemo<Round[]>(() => calendar(data, season), [data, season]);

  // The next race only makes sense for the current season; for past/future
  // seasons every round is either complete or hypothetical.
  const nextRound = useMemo<number | null>(() => {
    if (season !== data.currentSeason) return null;
    return rounds.find((r) => !isPast(r.raceDate ?? undefined))?.round ?? null;
  }, [rounds, season, data.currentSeason]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Season selector — horizontal scroll over all 77 seasons (no wrap) */}
      <div
        className="scroll-x"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          whiteSpace: "nowrap",
          flexWrap: "nowrap",
        }}
      >
        {data.seasons.map((y) => {
          const active = y === season;
          return (
            <button
              key={y}
              type="button"
              className="chip"
              onClick={() => setSeason(y)}
              aria-pressed={active}
              style={{
                cursor: "pointer",
                flex: "0 0 auto",
                fontFamily: "var(--font-mono)",
                whiteSpace: "nowrap",
                borderColor: active ? "var(--accent)" : "var(--border)",
                color: active ? "var(--accent)" : "var(--text)",
              }}
            >
              {y}
            </button>
          );
        })}
      </div>

      {/* Race grid */}
      {rounds.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No calendar available for {season}.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
          }}
        >
          {rounds.map((r) => {
            const track = trackByKey(data, r.circuitKey);
            const isNext = r.round === nextRound;
            return <RaceCard key={r.round} round={r} hasTrack={!!track} isNext={isNext} data={data} />;
          })}
        </div>
      )}
    </div>
  );
}

function RaceCard({
  round: r,
  hasTrack,
  isNext,
  data,
}: {
  round: Round;
  hasTrack: boolean;
  isNext: boolean;
  data: F1Data;
}) {
  const track = trackByKey(data, r.circuitKey);

  const body = (
    <>
      {/* Top thumbnail (current season only — historical rounds have no map) */}
      {hasTrack && track ? (
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-2)" }}>
          <TrackMap track={track} height={120} animate={false} />
        </div>
      ) : null}

      {/* Body */}
      <div style={{ padding: "0.8rem", display: "grid", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 700 }}>
            R{r.round}
          </span>
          {r.raceDate ? (
            <span style={{ color: "var(--muted)", fontSize: ".72rem", textAlign: "right" }}>
              {fmtDateLong(r.raceDate)}
            </span>
          ) : null}
        </div>

        <div style={{ fontWeight: 800, lineHeight: 1.2 }}>
          {flagEmoji(r.countryCode)} {r.name}
        </div>

        <div style={{ color: "var(--muted)", fontSize: ".78rem" }}>
          {r.circuit}, {r.country}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 6 }}>
          {r.winner ? (
            <span
              title={r.winnerName ?? undefined}
              style={{ color: "var(--gold)", fontFamily: "var(--font-cond)", fontSize: "1rem" }}
            >
              🏆 {r.winner}
              {r.winnerName ? (
                <span style={{ color: "var(--muted)", fontSize: ".72rem", marginLeft: 6 }}>
                  {r.winnerName}
                </span>
              ) : null}
            </span>
          ) : isNext ? (
            <span
              className="chip"
              style={{ color: "var(--accent)", borderColor: "var(--accent)", fontSize: ".7rem" }}
            >
              NEXT
            </span>
          ) : (
            <span style={{ color: "var(--muted)", fontSize: ".78rem" }}>Upcoming</span>
          )}
        </div>
      </div>
    </>
  );

  const cardStyle: React.CSSProperties = {
    padding: 0,
    display: "block",
    overflow: "hidden",
    borderColor: isNext ? "var(--accent)" : "var(--border)",
  };

  // With a track map → whole card links to the circuit page.
  if (hasTrack && r.circuitKey != null) {
    return (
      <Link href={`/tracks/${r.circuitKey}`} className="card" style={cardStyle}>
        {body}
      </Link>
    );
  }

  // Historical round (no map) → not a link.
  return (
    <div className="card" style={cardStyle}>
      {body}
    </div>
  );
}
