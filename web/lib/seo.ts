import type { Metadata } from "next";

export const SITE = {
  name: "F1Slam",
  domain: "f1slam.com",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://f1slam.com",
  tagline:
    "Formula 1 stats, championship standings, the race calendar and addictive F1 mini-games — chase the perfect Grand Slam.",
  description:
    "Live F1 championship standings, the full race calendar, deep driver profiles and a vault of Formula 1 mini-games — Gridle, Higher or Lower, Guess the Driver, Pit Stop and the Grand Slam builder. Real data from every race, new daily puzzles, global leaderboards, no sign-up.",
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
