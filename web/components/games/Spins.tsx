"use client";
import { useEffect, useRef, useState } from "react";
import type { SeasonPick, CarPick } from "@/lib/games-data";
import { tick, settle, tap } from "@/lib/sound";

export interface Sponsor { name: string; emoji: string; blurb: string; value: number }

export function sample<T>(arr: T[], n: number, exclude: (x: T) => boolean = () => false): T[] {
  const pool = arr.filter((x) => !exclude(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function useSpin<T>(make: () => T[]) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [opts, setOpts] = useState<T[]>([]);
  const [flash, setFlash] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  function spin() {
    setPhase("spinning"); setOpts(make());
    let n = 0;
    timer.current = setInterval(() => { setFlash((f) => f + 1); tick(); if (++n > 12) { if (timer.current) clearInterval(timer.current); setPhase("done"); settle(); } }, 70);
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return { phase, opts, flash, spin };
}

function SpinShell({ title, subtitle, phase, onSpin, children }: { title: string; subtitle: string; phase: string; onSpin: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, textTransform: "uppercase", fontFamily: "var(--font-cond)" }}>{title}</h2>
        <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: ".9rem" }}>{subtitle}</p>
      </div>
      {phase === "idle" ? <button className="btn btn-primary" onClick={onSpin} style={{ justifySelf: "start", fontSize: "1rem" }}>🎰 Spin</button> : children}
    </div>
  );
}

const Spinning = () => <div style={{ color: "var(--accent)", fontFamily: "var(--font-cond)", textAlign: "center" }}>Spinning…</div>;

export function DriverSpin({ pool, exclude, onPick, which }: { pool: SeasonPick[]; exclude: string[]; onPick: (p: SeasonPick) => void; which: string }) {
  const { phase, opts, flash, spin } = useSpin<SeasonPick>(() => sample(pool, 5, (p) => exclude.includes(p.driverId)));
  const shown = phase === "spinning" ? sample(pool, 5, (p) => exclude.includes(p.driverId)) : opts;
  return (
    <SpinShell title={`Spin for your ${which} driver`} subtitle="Five drivers from across F1 history — each rated on how they performed that very season. Pick one." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} key={flash}>
        {shown.map((p) => (
          <button key={p.key} disabled={phase === "spinning"} onClick={() => { if (phase === "done") { tap(); onPick(p); } }} className="card"
            style={{ padding: "0.9rem", textAlign: "center", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", borderTop: `3px solid ${p.teamColour}`, opacity: phase === "spinning" ? 0.55 : 1 }}>
            {p.headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.headshot} alt="" width={50} height={50} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
            ) : <div style={{ width: 50, height: 50, borderRadius: 10, background: "var(--panel-2)", display: "grid", placeItems: "center", margin: "0 auto", fontFamily: "var(--font-cond)" }}>{p.code}</div>}
            <div style={{ fontWeight: 800, marginTop: 6, fontSize: ".86rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.flag} {p.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".72rem" }}>{p.year} · {p.team}</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 4 }}>OVR {p.rating} <span style={{ color: "var(--muted)", fontSize: ".72rem" }}>· {p.wins}W</span></div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <Spinning />}
    </SpinShell>
  );
}

export function CarSpin({ pool, onPick }: { pool: CarPick[]; onPick: (c: CarPick) => void }) {
  const { phase, opts, flash, spin } = useSpin<CarPick>(() => sample(pool, 3));
  const shown = phase === "spinning" ? sample(pool, 3) : opts;
  return (
    <SpinShell title="Spin for a car" subtitle="Three real constructor seasons — a dominant year is a rocket, an off year is a dog. Pick your chassis." phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }} key={flash}>
        {shown.map((c) => (
          <button key={c.key} disabled={phase === "spinning"} onClick={() => { if (phase === "done") { tap(); onPick(c); } }} className="card"
            style={{ padding: "1rem", textAlign: "left", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", opacity: phase === "spinning" ? 0.55 : 1, borderLeft: `4px solid ${c.colour}` }}>
            <div style={{ fontFamily: "var(--font-cond)", fontSize: "1.4rem" }}>{c.year}</div>
            <div style={{ fontWeight: 800 }}>{c.flag} {c.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".76rem" }}>That season: P{c.position} · {c.wins} wins · {c.points} pts</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 6, fontSize: "1.1rem" }}>🏎️ car strength {c.strength}</div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <Spinning />}
    </SpinShell>
  );
}

export function SponsorSpin({ sponsors, onPick, unit }: { sponsors: Sponsor[]; onPick: (s: Sponsor) => void; unit: string }) {
  const { phase, opts, flash, spin } = useSpin<Sponsor>(() => sample(sponsors, 5));
  const shown = phase === "spinning" ? sample(sponsors, 5) : opts;
  return (
    <SpinShell title="Spin for a title sponsor" subtitle={`Your sponsor sets your ${unit} — a bigger backer means more to work with.`} phase={phase} onSpin={spin}>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }} key={flash}>
        {shown.map((s) => (
          <button key={s.name} disabled={phase === "spinning"} onClick={() => { if (phase === "done") { tap(); onPick(s); } }} className="card"
            style={{ padding: "1rem", textAlign: "left", cursor: phase === "done" ? "pointer" : "default", color: "var(--text)", opacity: phase === "spinning" ? 0.55 : 1, borderTop: "3px solid var(--gold)" }}>
            <div style={{ fontSize: "1.6rem" }}>{s.emoji}</div>
            <div style={{ fontWeight: 800 }}>{s.name}</div>
            <div style={{ color: "var(--muted)", fontSize: ".78rem", minHeight: 32 }}>{s.blurb}</div>
            <div style={{ fontFamily: "var(--font-cond)", color: "var(--gold)", marginTop: 6, fontSize: "1.1rem" }}>💵 {s.value} {unit}</div>
          </button>
        ))}
      </div>
      {phase === "spinning" && <Spinning />}
    </SpinShell>
  );
}
