import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "F1Slam — Formula 1 stats, standings & mini-games";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Og() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#060d0a",
          backgroundImage:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,84,54,0.30), transparent 55%)",
          color: "#eef2ec",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 18,
              background: "linear-gradient(135deg,#ff5436,#e8c469)",
              color: "#1a0a06",
              fontSize: 40,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            F1
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, letterSpacing: -1 }}>
            <span>F1</span>
            <span style={{ color: "#ff5436" }}>Slam</span>
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#ff5436", textTransform: "uppercase" }}>
          Chase the perfect Grand Slam
        </div>
        <div style={{ fontSize: 28, color: "#9fb0a6", marginTop: 14, maxWidth: 900, textAlign: "center" }}>
          F1 stats · championship standings · the race calendar · five free F1 mini-games
        </div>
      </div>
    ),
    { ...size }
  );
}
