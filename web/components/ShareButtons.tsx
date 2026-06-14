"use client";
import { useEffect, useRef, useState } from "react";

const URL_BASE = "https://f1slam.com";

export interface ShareCard {
  eyebrow: string;   // e.g. "SEASON SIMULATOR"
  big: string;       // e.g. "387 pts"
  headline: string;  // e.g. "World Champions!"
  lines: string[];   // up to ~4 supporting lines
  path: string;      // e.g. "/games/season"
}

/** Draw a 1080×1080 share card to a canvas and return a PNG blob. */
async function renderCard(c: ShareCard): Promise<Blob | null> {
  const cv = document.createElement("canvas");
  cv.width = 1080; cv.height = 1080;
  const x = cv.getContext("2d");
  if (!x) return null;
  // background
  const g = x.createLinearGradient(0, 0, 1080, 1080);
  g.addColorStop(0, "#0b1411"); g.addColorStop(1, "#060d0a");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
  // accent glow
  const rg = x.createRadialGradient(540, 120, 50, 540, 120, 700);
  rg.addColorStop(0, "rgba(255,84,54,0.22)"); rg.addColorStop(1, "rgba(255,84,54,0)");
  x.fillStyle = rg; x.fillRect(0, 0, 1080, 1080);
  x.textAlign = "center";
  // wordmark
  x.fillStyle = "#ff5436"; x.font = "900 64px Arial";
  x.fillText("F1Slam", 540, 150);
  // eyebrow
  x.fillStyle = "#9fb0a6"; x.font = "700 34px Arial";
  x.fillText(c.eyebrow.toUpperCase(), 540, 250);
  // headline
  x.fillStyle = "#eef2ec"; x.font = "900 76px Arial";
  x.fillText(c.headline, 540, 420);
  // big stat
  x.fillStyle = "#e8c469"; x.font = "900 200px Arial";
  x.fillText(c.big, 540, 660);
  // supporting lines
  x.fillStyle = "#cfd8d0"; x.font = "400 40px Arial";
  c.lines.slice(0, 4).forEach((ln, i) => x.fillText(ln, 540, 780 + i * 60));
  // footer
  x.fillStyle = "#9fb0a6"; x.font = "700 38px Arial";
  x.fillText("f1slam.com", 540, 1030);
  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

export default function ShareButtons({ card, caption }: { card: ShareCard; caption: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const built = useRef(false);
  const shareUrl = URL_BASE + card.path;

  useEffect(() => {
    if (built.current) return;
    built.current = true;
    renderCard(card).then((blob) => {
      if (!blob) return;
      setFile(new File([blob], "f1slam.png", { type: "image/png" }));
      setUrl(URL.createObjectURL(blob));
    });
  }, [card]);

  async function nativeShare() {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    try {
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: caption, url: shareUrl });
        return;
      }
      if (nav.share) { await nav.share({ text: caption, url: shareUrl }); return; }
      await navigator.clipboard.writeText(`${caption} ${shareUrl}`);
      setMsg("Copied to clipboard — paste into Instagram!");
    } catch { /* user cancelled */ }
  }

  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(caption)}`;

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <div style={{ color: "var(--muted)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em" }}>Share your result</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={nativeShare} style={{ minHeight: 40 }}>📷 Share / Instagram</button>
        <a className="btn" href={twitter} target="_blank" rel="noopener" style={{ minHeight: 40 }}>𝕏 Twitter</a>
        <a className="btn" href={facebook} target="_blank" rel="noopener" style={{ minHeight: 40 }}>f Facebook</a>
        {url && <a className="btn" href={url} download="f1slam-result.png" style={{ minHeight: 40 }}>⬇ Save image</a>}
      </div>
      {msg && <div style={{ color: "var(--accent-2)", fontSize: ".82rem" }}>{msg}</div>}
      <div style={{ color: "var(--muted)", fontSize: ".68rem" }}>Instagram: tap Share to post the image to your story or feed.</div>
    </div>
  );
}
