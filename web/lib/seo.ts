import type { Metadata } from "next";

export const SITE = {
  name: "F1Slam",
  domain: "f1slam.com",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://f1slam.com",
  tagline:
    "The complete Formula 1 history, plus stats, standings and addictive F1 games — build a team across every era and chase a perfect season.",
  description:
    "Every F1 champion, driver, race winner and circuit since 1950 — championship standings and the race calendar for all 77 seasons, plus deep driver profiles with full race-by-race history. Then play: the Season Simulator (spin a cross-era dream team and win every race), Career Mode, Gridle, Higher or Lower, Guess the Driver and Pit Stop. Global leaderboards, no sign-up.",
  twitter: "@f1slam",
};

/** Build page metadata with sensible SEO defaults + Open Graph/Twitter cards. */
export function pageMeta(opts: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
}): Metadata {
  const url = SITE.url + (opts.path ?? "");
  const description = opts.description ?? SITE.description;
  const title = opts.title;
  return {
    title,
    description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      images: opts.image ? [{ url: opts.image }] : undefined,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: SITE.twitter,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: SITE.url + it.path,
    })),
  };
}
