import type { PathGeometry, RacerId, Vec2 } from "./types";

const RESAMPLE = 1000;

/** Build a uniform-arc-length geometry from a dense polyline. */
export function geometryFromPoints(id: RacerId, xs: ArrayLike<number>, ys: ArrayLike<number>): PathGeometry {
  const m = xs.length;
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) {
    cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  }
  const length = cum[m - 1] || 1e-9;
  const n = RESAMPLE;
  const ds = length / (n - 1);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = i * ds;
    while (j < m - 2 && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j] || 1e-12;
    const f = Math.min(1, Math.max(0, (target - cum[j]) / seg));
    x[i] = xs[j] + (xs[j + 1] - xs[j]) * f;
    y[i] = ys[j] + (ys[j + 1] - ys[j]) * f;
  }
  x[n - 1] = xs[m - 1];
  y[n - 1] = ys[m - 1];

  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const dx = x[b] - x[a];
    const dy = y[b] - y[a];
    const l = Math.hypot(dx, dy) || 1e-12;
    tx[i] = dx / l;
    ty[i] = dy / l;
  }
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const span = (b - a) * ds || 1e-12;
    const dtx = (tx[b] - tx[a]) / span;
    const dty = (ty[b] - ty[a]) / span;
    k[i] = tx[i] * dty - ty[i] * dtx;
  }
  let maxDepth = 0;
  for (let i = 0; i < n; i++) maxDepth = Math.max(maxDepth, y[i]);
  return { id, n, ds, length, x, y, tx, ty, k, maxDepth };
}

function sampleParam(id: RacerId, fn: (u: number) => Vec2, count = 4000, warp = (u: number) => u): PathGeometry {
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const p = fn(warp(i / (count - 1)));
    xs[i] = p.x;
    ys[i] = p.y;
  }
  return geometryFromPoints(id, xs, ys);
}

function bisect(f: (t: number) => number, lo: number, hi: number, iters = 120): number {
  let flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if ((fm > 0) === (flo > 0)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface CycloidParams {
  r: number;
  thetaB: number;
}

/** Cycloid x = r(θ − sin θ), y = r(1 − cos θ) passing through B = (W, H). */
export function solveCycloid(W: number, H: number): CycloidParams {
  const ratio = W / H;
  const thetaB = bisect((t) => (t - Math.sin(t)) / (1 - Math.cos(t)) - ratio, 1e-6, 2 * Math.PI - 1e-6);
  const r = H / (1 - Math.cos(thetaB));
  return { r, thetaB };
}

export function cycloidPath(W: number, H: number): PathGeometry {
  const { r, thetaB } = solveCycloid(W, H);
  return sampleParam("cycloid", (u) => {
    const t = u * thetaB;
    return { x: r * (t - Math.sin(t)), y: r * (1 - Math.cos(t)) };
  });
}

/** Exact descent time on the frictionless cycloid: θ_B·√(r/g). */
export function cycloidTheoryTime(W: number, H: number, g: number): number {
  const { r, thetaB } = solveCycloid(W, H);
  return thetaB * Math.sqrt(r / g);
}

export function straightTheoryTime(W: number, H: number, g: number): number {
  const L2 = W * W + H * H;
  return Math.sqrt((2 * L2) / (g * H));
}

export function straightPath(W: number, H: number): PathGeometry {
  return sampleParam("straight", (u) => ({ x: u * W, y: u * H }), 50);
}

/** Circle centred on the start level, vertical tangent at A, through B. */
export function arcPath(W: number, H: number): PathGeometry {
  const R = (W * W + H * H) / (2 * W);
  const cx = R;
  const phiB = Math.atan2(H, W - cx);
  return sampleParam("arc", (u) => {
    const phi = Math.PI + (phiB - Math.PI) * u;
    return { x: cx + R * Math.cos(phi), y: R * Math.sin(phi) };
  });
}

/** Sideways parabola x = W·(y/H)² (vertical start at A). */
export function parabolaPath(W: number, H: number): PathGeometry {
  return sampleParam("parabola", (u) => ({ x: W * u * u, y: H * u }));
}

/**
 * Generalised cycloid family used for the friction-tuned racer:
 *   x = r[(θ − sin θ) + a(1 − cos θ)],  y = r[(1 − cos θ) + b(θ + sin θ)]
 * a = b = 0 is the ordinary cycloid. The pair (a, b) is tuned numerically in tune.ts.
 */
export function cycloidFamilyPath(W: number, H: number, a: number, b: number, count = 3000): PathGeometry | null {
  if (Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6) return { ...cycloidPath(W, H), id: "frictionOpt" };
  const X = (t: number) => t - Math.sin(t) + a * (1 - Math.cos(t));
  const Y = (t: number) => 1 - Math.cos(t) + b * (t + Math.sin(t));
  const ratio = W / H;
  const steps = 1200;
  const top = 2 * Math.PI - 1e-3;
  let thetaB = -1;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * top;
    if (Y(t) > 0 && X(t) / Y(t) >= ratio) {
      const lo = ((i - 1) / steps) * top || 1e-6;
      thetaB = bisect((q) => X(q) / Y(q) - ratio, Math.max(lo, 1e-6), t, 60);
      break;
    }
  }
  if (thetaB <= 0) return null;
  const r = H / Y(thetaB);
  if (!(r > 0)) return null;
  const xs = new Float64Array(count);
  const ys = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * thetaB;
    xs[i] = r * X(t);
    ys[i] = r * Y(t);
    if (ys[i] < -1e-9) return null; // never rise above the start
  }
  return geometryFromPoints("frictionOpt", xs, ys);
}

/** Turn a freehand stroke into a smooth path pinned to A=(0,0) and B=(W,H). */
export function customPath(points: Vec2[], W: number, H: number): PathGeometry | null {
  if (points.length < 3) return null;
  const pts: Vec2[] = [{ x: 0, y: 0 }, ...points, { x: W, y: H }];
  // drop near-duplicates
  const clean: Vec2[] = [pts[0]];
  for (const p of pts.slice(1)) {
    const q = clean[clean.length - 1];
    if (Math.hypot(p.x - q.x, p.y - q.y) > 0.004) clean.push(p);
  }
  if (clean.length < 3) return null;
  // densify then smooth (endpoints pinned)
  const dense = geometryFromPoints("custom", clean.map((p) => p.x), clean.map((p) => p.y));
  const xs = Array.from(dense.x);
  const ys = Array.from(dense.y);
  for (let pass = 0; pass < 40; pass++) {
    for (let i = 1; i < xs.length - 1; i++) {
      xs[i] = (xs[i - 1] + 2 * xs[i] + xs[i + 1]) / 4;
      ys[i] = (ys[i - 1] + 2 * ys[i] + ys[i + 1]) / 4;
    }
  }
  return geometryFromPoints("custom", xs, ys);
}
