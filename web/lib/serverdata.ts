/** Build-time (server) reader for the static F1 snapshot. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { F1Data } from "@/lib/f1";

let _cache: F1Data | null = null;

export function serverF1(): F1Data {
  if (!_cache) {
    _cache = JSON.parse(
      readFileSync(join(process.cwd(), "public", "data", "f1.json"), "utf8")
    ) as F1Data;
  }
  return _cache;
}
