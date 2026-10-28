/** MarketMover cross-promo. Asset lives in /public; links carry campaign UTMs. */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const MARKETMOVER_MARK = `${base}/marketmover-mark.png`;

export function marketMoverHref(medium: "sister_bar" | "popup") {
  return `https://www.marketmover.net?utm_source=f1slam&utm_medium=${medium}&utm_campaign=crosspromo`;
}
