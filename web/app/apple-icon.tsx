import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Proper PNG home-screen icon for iOS (SVG apple-touch icons are unreliable). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#ff5436,#e8c469)",
          color: "#1a0a06",
          fontSize: 92,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        F1
      </div>
    ),
    { ...size }
  );
}
