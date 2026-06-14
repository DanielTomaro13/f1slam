import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SisterSites from "@/components/SisterSites";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { AD_CLIENT, AD_SLOTS } from "@/lib/ads";
import { SITE } from "@/lib/seo";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060d0a",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "F1Slam — Formula 1 stats, standings & mini-games",
    template: "%s — F1Slam",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "F1", "Formula 1", "F1 history", "F1 champions", "F1 game", "F1 games",
    "F1 season simulator", "F1 manager game", "Grand Slam", "Grand Chelem",
    "F1 standings", "F1 championship", "F1 calendar", "F1 drivers", "F1 stats",
    "F1 wordle", "Gridle", "guess the F1 driver", "F1 quiz", "F1 trivia",
  ],
  authors: [{ name: "Daniel Tomaro" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: "F1Slam — Formula 1 stats, standings & mini-games",
    description: SITE.description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "F1Slam — Formula 1 stats, standings & mini-games",
    description: SITE.description,
    site: SITE.twitter,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: {
    capable: true,
    title: "F1Slam",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

const orgLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: "en-GB",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE.url}/drivers?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};
const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  url: SITE.url,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: "en-GB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* Warm up the third-party origins we connect to (ads, headshots, analytics) */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.formula1.com" />
        <link rel="dns-prefetch" href="https://media.formula1.com" />
        <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
        <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
        {/* Google AdSense — literal loader in <head> for site verification + Auto Ads */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SisterSites active="f1" />
        <SiteHeader />
        <main className="container-x" style={{ paddingTop: "1.5rem", minHeight: "60vh" }}>
          {children}
        </main>
        <div className="container-x">
          <AdUnit slot={AD_SLOTS.inline} />
        </div>
        <SiteFooter />
        <JsonLd data={orgLd} />
        <JsonLd data={appLd} />
        {/* Cloudflare Web Analytics — privacy-friendly, no cookies */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token": "2d8e27c812394086b306714df76dd80c"}'
        />
      </body>
    </html>
  );
}
