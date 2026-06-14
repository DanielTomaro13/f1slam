import Link from "next/link";
import { SITE } from "@/lib/seo";

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "4rem",
        padding: "2rem 0",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        color: "var(--muted)",
      }}
    >
      <div className="container-x" style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ maxWidth: 320 }}>
          <strong style={{ color: "var(--text)" }}>{SITE.name}</strong>
          <p style={{ fontSize: ".85rem", marginTop: 6 }}>{SITE.tagline}</p>
          <p style={{ fontSize: ".78rem", marginTop: 10 }}>
            Part of the 0 Series ·{" "}
            <a href="https://afl23-0.com" style={{ color: "var(--accent)" }}>AFL 23-0</a> ·{" "}
            <a href="https://nrl24-0.com" style={{ color: "var(--accent)" }}>NRL 24-0</a> ·{" "}
            <a href="https://footballinvincibles.com" style={{ color: "var(--accent)" }}>Football Invincibles</a>
          </p>
          <a
            href="https://ko-fi.com/danieltomaro"
            target="_blank"
            rel="noopener"
            className="btn"
            style={{ marginTop: 12, minHeight: 36, padding: "0.4rem 0.9rem", fontSize: ".82rem", borderColor: "var(--gold)", color: "var(--text)" }}
          >
            ☕ Support F1Slam on Ko-fi
          </a>
        </div>
        <div style={{ display: "flex", gap: "2.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Play</strong>
            <Link href="/games/grand-slam">Grand Slam</Link>
            <Link href="/games">Mini-games</Link>
            <Link href="/leaderboard">Hall of Fame</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>Stats</strong>
            <Link href="/standings">Standings</Link>
            <Link href="/drivers">Drivers</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/stats">Leaders</Link>
          </nav>
          <nav style={{ display: "grid", gap: 6, fontSize: ".85rem" }}>
            <strong style={{ color: "var(--text)" }}>About</strong>
            <Link href="/grand-slams">What is a Grand Slam?</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <a href="https://ko-fi.com/danieltomaro" target="_blank" rel="noopener">☕ Support on Ko-fi</a>
          </nav>
        </div>
      </div>
      <div className="container-x" style={{ marginTop: "1.5rem", fontSize: ".78rem", opacity: 0.7 }}>
        © {new Date().getFullYear()} {SITE.name}. Unofficial and unaffiliated with Formula 1,
        the FIA or any team. Data via the OpenF1 API for informational and entertainment use.
        F1, FORMULA 1 and related marks are trademarks of Formula One Licensing BV.
      </div>
    </footer>
  );
}
