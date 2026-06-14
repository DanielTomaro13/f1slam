import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About F1Slam",
  description:
    "How F1Slam works — real Formula 1 data from the OpenF1 API, the Grand Slam concept, and the mini-games. Part of the 0 Series alongside AFL 23-0, NRL 24-0 and Football Invincibles.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: 760 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>About F1Slam</h1>

      <section className="card" style={{ padding: "1.4rem", display: "grid", gap: 10, color: "var(--muted)" }}>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>F1Slam</strong> is a free Formula 1 stats and games site.
          Track the drivers&apos; and constructors&apos; championships, browse the race calendar and every
          driver&apos;s career numbers, then test your knowledge in a vault of F1 mini-games.
        </p>
        <p style={{ margin: 0 }}>
          The name comes from the <Link href="/grand-slams" style={{ color: "var(--accent)" }}>Grand Slam</Link> —
          pole, win, fastest lap and leading every lap of a race. It&apos;s the rarest perfect drive in the sport,
          and the spirit behind everything here.
        </p>
        <p style={{ margin: 0 }}>
          All data comes from the public <a href="https://openf1.org" style={{ color: "var(--accent)" }}>OpenF1 API</a>,
          which republishes official F1 live-timing data. Career figures cover the OpenF1 era (2023 onward) and
          refresh automatically through the season.
        </p>
      </section>

      <section className="card" style={{ padding: "1.4rem", display: "grid", gap: 8, color: "var(--muted)" }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: "1.2rem" }}>The 0 Series</h2>
        <p style={{ margin: 0 }}>F1Slam is a sister site to three other sports projects chasing perfect seasons:</p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: 4 }}>
          <li><a href="https://afl23-0.com" style={{ color: "var(--accent)" }}>AFL 23-0</a> — Australian Football</li>
          <li><a href="https://nrl24-0.com" style={{ color: "var(--accent)" }}>NRL 24-0</a> — Rugby League</li>
          <li><a href="https://footballinvincibles.com" style={{ color: "var(--accent)" }}>Football Invincibles</a> — Soccer</li>
        </ul>
      </section>

      <p style={{ color: "var(--muted)", fontSize: ".82rem" }}>
        F1Slam is unofficial and not affiliated with Formula 1, the FIA or any team. F1, FORMULA 1 and related
        marks are trademarks of Formula One Licensing BV.
      </p>
    </div>
  );
}
