export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** ISO-3 country code (OpenF1, e.g. "NED") → flag emoji. */
const ISO3_TO_2: Record<string, string> = {
  GBR: "GB", NED: "NL", GER: "DE", ESP: "ES", FRA: "FR", ITA: "IT", MON: "MC",
  AUS: "AU", FIN: "FI", MEX: "MX", CAN: "CA", THA: "TH", JPN: "JP", DEN: "DK",
  CHN: "CN", USA: "US", BRA: "BR", AUT: "AT", BEL: "BE", NZL: "NZ", ARG: "AR",
  POL: "PL", SUI: "CH", SWE: "SE", RUS: "RU", IND: "IN", IDN: "ID", KSA: "SA",
  UAE: "AE", BRN: "BH", QAT: "QA", AZE: "AZ", SGP: "SG", HUN: "HU", POR: "PT",
  TUR: "TR", VNM: "VN", KOR: "KR", ZAF: "ZA",
};

export function flagEmoji(iso?: string | null): string {
  if (!iso) return "🏁";
  const cc = (iso.length === 3 ? ISO3_TO_2[iso.toUpperCase()] : iso.toUpperCase()) || "";
  if (cc.length !== 2) return "🏁";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

export function fmtDate(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtDateLong(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isPast(s?: string | null): boolean {
  if (!s) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}
