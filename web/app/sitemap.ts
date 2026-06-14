import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { GAMES } from "@/lib/gamelist";
import { serverF1 } from "@/lib/serverdata";
import { slugify } from "@/lib/format";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = [
    "",
    "/grand-slams",
    "/standings",
    "/drivers",
    "/calendar",
    "/tracks",
    "/stats",
    "/games",
    "/leaderboard",
    "/about",
    "/contact",
    "/privacy",
  ].map((p) => ({
    url: SITE.url + p,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const gamePaths = GAMES.map((g) => ({
    url: `${SITE.url}/games/${g.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const data = serverF1();
  const driverPaths = data.drivers.map((d) => ({
    url: `${SITE.url}/drivers/${d.number}/${slugify(`${d.firstName} ${d.lastName}`)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const trackPaths = Object.keys(data.tracks).map((key) => ({
    url: `${SITE.url}/tracks/${key}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPaths, ...gamePaths, ...driverPaths, ...trackPaths];
}
