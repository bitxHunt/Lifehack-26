/**
 * Python's `round()`, reproduced.
 *
 * The scoring numbers in this project were tuned against the original Python
 * prototype, and Python rounds halves to even (round(0.5) is 0, round(1.5) is
 * 2) while JavaScript's Math.round always rounds halves up. A score landing on
 * exactly 62.5 would otherwise read 63 here and 62 there, so we match Python
 * rather than quietly shift every tie by a point.
 *
 * Like Python, this works on the binary double as-is: no decimal correction,
 * so round(2.675, 2) is 2.67 in both.
 */
export function pyRound(value: number, digits = 0): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const remainder = scaled - floor;

  let rounded: number;
  if (remainder > 0.5) {
    rounded = floor + 1;
  } else if (remainder < 0.5) {
    rounded = floor;
  } else {
    rounded = floor % 2 === 0 ? floor : floor + 1; // exact tie -> nearest even
  }

  return rounded / factor;
}
