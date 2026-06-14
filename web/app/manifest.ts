import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "F1Slam",
    description: SITE.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#060d0a",
    theme_color: "#060d0a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
