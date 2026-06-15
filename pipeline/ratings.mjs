/**
 * F1Slam — ratings model (shared by the pipeline and the recompute script).
 *
 * Driver-season rating and constructor-season strength, computed from as much
 * real data as we have: per-race finishing positions, grid (qualifying)
 * positions, DNFs, points, championship position AND head-to-head versus
 * team-mate (the best available proxy for isolating driver skill from the car).
 *
 * Everything is normalised within its own season so eras with different points
 * systems and grid sizes stay comparable.
 */

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Driver-season rating, 54–99.
 * @param s per-season stats:
 *   { ppr, seasonMaxPpr, winRate, podiumRate, poleRate, avgFinish, dnfRate,
 *     champPos, tmGridW, tmGridR, tmRaceW, tmRaceR, ptsShare, hasTeammate }
 */
export function driverSeasonRating(s) {
  const ppN = clamp01(s.ppr / (s.seasonMaxPpr || 1));         // points-per-race vs season best
  const finishScore = s.avgFinish != null ? clamp01((20 - s.avgFinish) / 19) : 0.4; // P1→1, P20→0

  // absolute output (driver + car)
  let core =
    0.40 * ppN +
    0.18 * clamp01(s.podiumRate) +
    0.12 * clamp01(s.winRate) +
    0.08 * clamp01(s.poleRate) +
    0.12 * finishScore;

  // championship standing bonus
  core += s.champPos === 1 ? 0.10 : s.champPos <= 3 ? 0.05 : s.champPos <= 6 ? 0.02 : 0;

  // reliability drag (DNFs are partly car, but a messy season is a messy season)
  core -= 0.06 * clamp01(s.dnfRate);

  // team-mate head-to-head — rewards beating your reference point in equal machinery
  if (s.hasTeammate) {
    const q = s.tmGridR > 0 ? s.tmGridW / s.tmGridR : 0.5;
    const r = s.tmRaceR > 0 ? s.tmRaceW / s.tmRaceR : 0.5;
    const share = s.ptsShare != null ? s.ptsShare : 0.5;
    const h2h = 0.4 * q + 0.4 * r + 0.2 * share; // 0.5 == evenly matched
    core += (h2h - 0.5) * 0.18; // up to ±0.09
  }

  return Math.round(54 + clamp01(core) * 45);
}

/**
 * Constructor-season strength, 45–99.
 * @param s { ptsN, paceScore (from avg best-car finish), winRate, poleRate, champPos }
 */
export function constructorStrength(s) {
  let core =
    0.45 * clamp01(s.ptsN) +
    0.30 * clamp01(s.paceScore) +
    0.15 * clamp01(s.winRate) +
    0.10 * clamp01(s.poleRate);
  core += s.champPos === 1 ? 0.08 : s.champPos <= 3 ? 0.03 : 0;
  return Math.round(45 + clamp01(core) * 54);
}
