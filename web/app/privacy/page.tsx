import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "How F1Slam handles data: privacy-friendly analytics, Google AdSense advertising cookies, and local-only game progress.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div style={{ display: "grid", gap: "1.2rem", maxWidth: 760 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Privacy Policy</h1>
      <p style={{ color: "var(--muted)" }}>Last updated: June 2026</p>

      <Section title="What we collect">
        F1Slam is a static website. We do not run user accounts and do not ask for personal
        information. Your game progress, streaks and personal bests are stored only in your own
        browser (localStorage) and never leave your device unless you choose to post a score to a
        leaderboard, in which case only the name you type and your score are sent.
      </Section>

      <Section title="Analytics">
        We use Cloudflare Web Analytics, a privacy-first product that does not use cookies and does
        not fingerprint or track individuals across sites. It records aggregate page-view counts only.
      </Section>

      <Section title="Advertising">
        F1Slam shows ads served by Google AdSense. Google and its partners may use cookies and
        similar technologies to serve ads based on your prior visits to this and other websites.
        Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based
        on your visits. You can opt out of personalised advertising by visiting{" "}
        <a href="https://www.google.com/settings/ads" style={{ color: "var(--accent)" }}>Google Ads Settings</a>.
        For more, see{" "}
        <a href="https://policies.google.com/technologies/ads" style={{ color: "var(--accent)" }}>How Google uses information from sites that use its services</a>.
      </Section>

      <Section title="Third-party data">
        Formula 1 data shown on this site comes from the public{" "}
        <a href="https://openf1.org" style={{ color: "var(--accent)" }}>OpenF1 API</a>. Driver images
        are loaded from official Formula 1 media URLs. We do not control those third parties&apos;
        privacy practices.
      </Section>

      <Section title="Your choices">
        You can clear your local game data at any time by clearing your browser storage for this site.
        You can disable cookies in your browser settings; the site and games will still work.
      </Section>

      <Section title="Contact">
        Questions about this policy can be directed to the site operator via the F1Slam GitHub
        repository.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 6 }}>
      <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{title}</h2>
      <p style={{ color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{children}</p>
    </section>
  );
}
