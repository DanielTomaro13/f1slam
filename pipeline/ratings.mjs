/**
 * F1Slam — ranking model based on the official F1 Fantasy scoring system.
 * (https://fantasy.formula1.com — Game Rules, 2024/25 values.)
 *
 * A driver scores fantasy points each race weekend from:
 *   • Qualifying position    P1 10 … P10 1  (P11+ 0)
 *   • Race finish position   P1 25, P2 18, P3 15, P4 12, P5 10, P6 8, P7 6,
 *                            P8 4, P9 2, P10 1  (P11+ 0)
 *   • Positions gained/lost  +1 / −1 per place (grid → finish)
 *   • Fastest lap            +10
 *   • DNF / not classified   −20      • Disqualified  −25
 * (Overtakes and Driver of the Day aren't in the historical record, so are
 *  omitted; they're noted in the UI.)
 *
 * Constructor fantasy = the sum of its drivers' fantasy points plus a per-race
 * qualifying bonus (both cars in Q3 +10, one +5, both in Q2 +3, one +1, none −1;
 * Q2/Q3 are approximated from grid ≤ 15 / ≤ 10 since the cut data isn't stored).
 */

const Q_PTS = [0, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];        // by grid 1..10
const R_PTS = [0, 25, 18, 15, 12, 10, 8, 6, 4, 2, 1];    // by finish 1..10

/** Fantasy points for one driver in one race. row: {grid,position,dnf,status,fl} */
export function fantasyForRace(row) {
  let pts = 0;
  const grid = row.grid || 0;
  if (grid >= 1 && grid <= 10) pts += Q_PTS[grid];          // qualifying
  const dsq = /disqualif/i.test(row.status || "");
  if (dsq) pts -= 25;
  else if (row.dnf || row.position == null) pts -= 20;       // DNF / not classified
  else {
    if (row.position >= 1 && row.position <= 10) pts += R_PTS[row.position]; // race finish
    if (grid > 0) pts += grid - row.position;                // positions gained / lost
  }
  if (row.fl) pts += 10;                                      // fastest lap
  return pts;
}

/** Constructor qualifying bonus for a race, from both cars' grid slots. */
export function constructorQualiBonus(grids) {
  const q3 = grids.filter((g) => g >= 1 && g <= 10).length;  // ≈ reached Q3
  const q2 = grids.filter((g) => g >= 1 && g <= 15).length;  // ≈ reached Q2
  if (q3 >= 2) return 10;
  if (q3 === 1) return 5;
  if (q2 >= 2) return 3;
  if (q2 === 1) return 1;
  return -1;
}

const clamp = (lo, hi, x) => Math.max(lo, Math.min(hi, x));

/**
 * 0–99 game rating from fantasy points per race, normalised to the season's
 * best so eras stay comparable. (The sim uses this as the driver's value.)
 */
export function ratingFromFantasy(fantasyPerRace, seasonBestFpr) {
  const n = seasonBestFpr > 0 ? fantasyPerRace / seasonBestFpr : 0;
  return Math.round(clamp(45, 99, 52 + n * 47));
}

/** 0–99 car strength from a constructor's fantasy-per-race, normalised. */
export function strengthFromFantasy(fantasyPerRace, seasonBestFpr) {
  const n = seasonBestFpr > 0 ? fantasyPerRace / seasonBestFpr : 0;
  return Math.round(clamp(40, 99, 46 + n * 53));
}
