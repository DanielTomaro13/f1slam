import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = pageMeta({
  title: "What is a Grand Slam in F1?",
  description:
    "A Grand Slam (Grand Chelem) is the rarest perfect drive in Formula 1: pole position, race win, fastest lap and leading every single lap — all in one Grand Prix. Here's what it takes and who has done it most.",
  path: "/grand-slams",
  keywords: ["F1 grand slam", "grand chelem", "F1 perfect race", "what is a grand slam F1"],
});

const REQUIREMENTS = [
  { emoji: "⚡", title: "Pole position", text: "Fastest in qualifying — start the race from P1." },
  { emoji: "🏆", title: "Race win", text: "Take the chequered flag in first place." },
  { emoji: "⏱️", title: "Fastest lap", text: "Set the quickest lap of anyone in the race." },
  { emoji: "🥇", title: "Led every lap", text: "Lead the field across the line on every single lap — never headed." },
];

/** A curated sample of the most-celebrated Grand Slams in F1 history. */
const HALL: { driver: string; team: string; race: string; year: number }[] = [
  { driver: "Lewis Hamilton", team: "Mercedes", race: "Australian Grand Prix", year: 2015 },
  { driver: "Max Verstappen", team: "Red Bull", race: "Emilia-Romagna Grand Prix", year: 2023 },
  { driver: "Sebastian Vettel", team: "Red Bull", race: "Singapore Grand Prix", year: 2013 },
  { driver: "Fernando Alonso", team: "Renault", race: "French Grand Prix", year: 2005 },
  { driver: "Michael Schumacher", team: "Ferrari", race: "Hungarian Grand Prix", year: 2004 },
  { driver: "Ayrton Senna", team: "McLaren", race: "Australian Grand Prix", year: 1991 },
  { driver: "Jim Clark", team: "Lotus", race: "Dutch Grand Prix", year: 1963 },
  { driver: "Alberto Ascari", team: "Ferrari", race: "British Grand Prix", year: 1952 },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a Grand Slam in Formula 1?",
    a: "A Grand Slam (also called a Grand Chelem) is when a driver takes pole position, wins the race, sets the fastest lap and leads every single lap of that Grand Prix. All four must happen in the same race.",
  },
  {
    q: "How rare is a Grand Slam in F1?",
    a: "Very rare. Across more than 75 years and over a thousand World Championship races, a Grand Slam has only been achieved a few dozen times. Leading every lap is the hardest of the four conditions.",
  },
  {
    q: "What is the difference between a Grand Slam and a hat-trick?",
    a: "A hat-trick is pole, win and fastest lap. A Grand Slam adds the fourth, toughest requirement: leading every lap of the race from lights to flag.",
  },
  {
    q: "Who has the most Grand Slams in F1?",
    a: "Jim Clark holds the all-time record for most Grand Slams, with Lewis Hamilton and Max Verstappen among the leaders in the modern era. Records are maintained by the FIA and Formula 1.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function GrandSlamsPage() {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Grand Slams", path: "/grand-slams" }])} />
      <header className="card" style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
        <span className="chip" style={{ marginBottom: 12 }}>🏁 The rarest perfect drive</span>
        <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.8rem)", margin: "0 0 .5rem", fontWeight: 900, textTransform: "uppercase" }}>
          The <span style={{ color: "var(--accent)" }}>Grand Slam</span>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 620, margin: "0 auto", fontSize: "1.05rem" }}>
          Also called a <em>Grand Chelem</em>, it&apos;s a flawless weekend: pole, win, fastest lap and
          leading every lap of the race. In 75+ years of Formula 1 it has happened only a few dozen times.
          That&apos;s the slam F1Slam is named for.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link href="/games/grand-slam" className="btn btn-primary">🏆 Build your Grand Slam grid</Link>
        </div>
      </header>

      <section>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase" }}>The four boxes you must tick</h2>
        <div className="grid-cards">
          {REQUIREMENTS.map((r) => (
            <div key={r.title} className="card" style={{ padding: "1.2rem", display: "grid", gap: 6 }}>
              <span style={{ fontSize: "1.8rem" }}>{r.emoji}</span>
              <strong style={{ fontSize: "1.05rem" }}>{r.title}</strong>
              <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>{r.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase" }}>Grand Slam hall of fame</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>A handful of the most celebrated perfect drives in the sport&apos;s history.</p>
        <div className="card scroll-x">
          <table className="stat">
            <thead><tr><th>Driver</th><th>Team</th><th>Grand Prix</th><th>Year</th></tr></thead>
            <tbody>
              {HALL.map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{h.driver}</td>
                  <td style={{ color: "var(--muted)" }}>{h.team}</td>
                  <td>{h.race}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{h.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".8rem", marginTop: 10 }}>
          A selected list for illustration — not the complete record. Records are maintained by the FIA and Formula 1.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, textTransform: "uppercase" }}>Grand Slam FAQ</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {FAQ.map((f) => (
            <details key={f.q} className="card" style={{ padding: "1rem 1.2rem" }}>
              <summary style={{ fontWeight: 700, cursor: "pointer" }}>{f.q}</summary>
              <p style={{ color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p style={{ textAlign: "center", color: "var(--muted)" }}>
        Think you know the grid? Test it in the <Link href="/games/grand-slam" style={{ color: "var(--accent)" }}>Grand Slam game</Link>{" "}
        or browse the <Link href="/stats" style={{ color: "var(--accent)" }}>all-time stat leaders</Link>.
      </p>
    </div>
  );
}
