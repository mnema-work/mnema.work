// The geometry of the home page's hero: the field of lines with the eye in it. It holds no colour and no markup, only where
// the lines and the points are at one instant, so the build can draw the frame at rest into the page (what a reader sees
// before the script runs, and the whole of it under `prefers-reduced-motion`) and the page's script can draw the same
// frames as time passes and the pointer moves. The lines themselves are the brand's (`field.mjs` of the release, which the
// build copies to `src/generated/field.mjs` and hands in as `field`), and so is the cycle of the blink: `.github/the-brand/eye.mjs`.

/** The length of the cycle of the brand's eye, in milliseconds. */
export const CYCLE_MS = 9000;

/**
 * Where in the cycle the eye of the home page's bar is when the page opens, in seconds: its SMIL begins at minus this (the build
 * draws it with `begin: -BAR_PHASE_S`), and the hero's clock starts at the same phase, so the two blink together.
 */
export const BAR_PHASE_S = 6.1;

/** How far open the brand's lids are when shut: its `ry` goes to 0.4 of the 15.5 an open iris has. */
const SHUT = 0.4 / 15.5;

/**
 * The brand's easing between two stops: `keySplines=".45 0 .25 1"` on every segment of its cycle, the cubic Bezier of those
 * control points, solved for the progress of the time.
 * @param {number} s progress of the time through the segment, 0 to 1
 */
function easeOf(s) {
  const [x1, y1, x2, y2] = [0.45, 0, 0.25, 1];
  const at = (u, a, b) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < s) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}

/**
 * How open the lids are along the 9 s cycle of the brand's eye: open, then one blink, then two. The stops are those of
 * `.github/the-brand/eye.mjs` (the lids close at 0.83, 0.925 of the cycle), and each closing is eased like the brand's.
 * @param {number} ms
 * @returns {number} from 0 (shut) to 1 (open)
 */
export function opennessAt(ms) {
  const at = (((ms % CYCLE_MS) + CYCLE_MS) % CYCLE_MS) / CYCLE_MS;
  /** @type {readonly (readonly [number, number])[]} */
  const stops = [[0.8, 1], [0.83, SHUT], [0.86, 1], [0.9, 1], [0.925, SHUT], [0.95, 1]];
  for (let i = 1; i < stops.length; i++) {
    const [t0, o0] = stops[i - 1];
    const [t1, o1] = stops[i];
    if (at >= t0 && at <= t1) {
      const s = (at - t0) / (t1 - t0);
      return o0 + (o1 - o0) * easeOf(s);
    }
  }
  return 1;
}

/** The fixed points of the hero as shares of its box: `[x, y, radius, stretch, phase]`. The first is the eye. */
export const stonesOf = (W) =>
  W > 600
    ? [[0.72, 0.34, Math.min(78, W * 0.07), 1.45, 0], [0.9, 0.66, 40, 1, 1.7], [0.46, 0.16, 28, 1, 3.1]]
    : [[0.5, 0.24, 60, 1.45, 0], [0.86, 0.5, 30, 1, 1.7], [0.2, 0.12, 22, 1, 3.1]];

/**
 * How much of the opening the iris fills in the hero: 0.43, the approved page's. The eye at the bar, the ring and the quick start
 * is the brand's own, whose iris fills 15.5 of 21; in the hero the opening is a field's, large and open, and the iris is smaller.
 */
const IRIS = 0.43;

/**
 * One frame of the hero. `field` is the brand's `{ line, smooth, relative, f }`; `t` is the time in milliseconds (0 for a frame at
 * rest, where the points do not drift); `open` how open the lids are; `pointer` is `[x, y, radius]` or null; `steps` is how
 * many segments a line has (the frame the build writes has fewer than the one the script draws, to weigh less). The lines are
 * written as the brand's pictures write them, compact (`relative`).
 * @returns {{ d: string, iris: { cx: string, cy: string, rx: string, ry: string }, opening: { rx: string, ry: string }, dots: { cx: string, cy: string, r: string }[], pointer: { cx: string, cy: string, r: string } | null }}
 */
export function frameOf(field, { W, H, t = 0, open = 1, pointer = null, drift = true, steps = Math.round(W / 16) }) {
  const { line, smooth, relative, f } = field;
  const seconds = t / 1000;
  // The eye closes as the brand's does: its width stays and its height goes to the slit the lids leave. The opening is a
  // fixed point of the field with a radius `a` and a stretch `k` along the lines, so a closing of `open` is a radius of
  // `a * open` and a stretch of `k / open`, which keeps `a * k`, its half width.
  const shut = Math.max(open, 0.01);
  const stones = stonesOf(W).map(([x, y, a, k, phase], i) => {
    const dx = drift ? Math.sin(seconds * 0.31 + phase) * 18 : 0;
    const dy = drift ? Math.cos(seconds * 0.23 + phase) * 10 : 0;
    return i === 0 ? [x * W + dx, y * H + dy, a * shut, k / shut] : [x * W + dx, y * H + dy, a, k];
  });
  const opening = stonesOf(W)[0];
  const all = pointer ? [...stones, pointer] : stones;
  const pitch = W < 700 ? 28 : 22;
  const eyeY = stones[0][1];
  // The levels sit half a pitch either side of the eye, as in the brand's symbol, so no line runs into its centre.
  const first = eyeY + pitch / 2 - Math.ceil((eyeY + pitch) / pitch) * pitch;
  let d = '';
  for (let c = first; c < H + pitch; c += pitch) d += relative(smooth(line(c, all, -20, W + 20, steps)));
  const [ex, ey] = stones[0];
  const a = opening[2];
  let lx = 0;
  let ly = 0;
  if (pointer) {
    const vx = pointer[0] - ex;
    const vy = pointer[1] - ey;
    const m = Math.hypot(vx, vy) || 1;
    const k = Math.min(1, m / 300);
    lx = (vx / m) * k;
    ly = (vy / m) * k;
  } else if (drift) {
    lx = Math.sin(seconds / 1.7);
    ly = Math.sin(seconds / 2.3) * 0.5;
  }
  const r = a * IRIS;
  return {
    d,
    // The iris keeps its width and closes its height with the lids, as the brand's eye's does (its `ry` goes to 0.4 of 15.5).
    iris: {
      cx: f(ex + lx * a * 0.3),
      cy: f(ey + ly * a * 0.22 * open),
      rx: f(r),
      ry: f(r * open),
    },
    opening: { rx: f(a * opening[3]), ry: f(a * shut) },
    dots: stones.slice(1).map(([x, y, radius]) => ({ cx: f(x), cy: f(y), r: f(radius * 0.5) })),
    pointer: pointer ? { cx: f(pointer[0]), cy: f(pointer[1]), r: f(pointer[2] * 0.5) } : null,
  };
}
