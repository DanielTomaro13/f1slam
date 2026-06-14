import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description:
    "Get in touch with F1Slam — questions, corrections, feedback or partnership enquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div style={{ display: "grid", gap: "1.2rem", maxWidth: 680 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Contact</h1>

      <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        F1Slam is run by an independent developer. We&apos;d love to hear from you — whether it&apos;s a
        data correction, a bug, a feature idea for the games, or a partnership enquiry.
      </p>

      <div className="card" style={{ padding: "1.3rem", display: "grid", gap: 14 }}>
        <Row label="Email">
          <a href="mailto:danieltomaro3@gmail.com" style={{ color: "var(--accent)", fontWeight: 600 }}>
            danieltomaro3@gmail.com
          </a>
        </Row>
        <Row label="GitHub">
          <a href="https://github.com/DanielTomaro13/f1slam" style={{ color: "var(--accent)", fontWeight: 600 }}>
            github.com/DanielTomaro13/f1slam
          </a>
          <div style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 2 }}>
            Open an issue to report a bug or suggest a feature.
          </div>
        </Row>
      </div>

      <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
        We aim to reply to genuine enquiries within a few days. F1Slam is unofficial and not affiliated
        with Formula 1, the FIA or any team.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <span style={{ color: "var(--muted)", fontSize: ".74rem", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}
