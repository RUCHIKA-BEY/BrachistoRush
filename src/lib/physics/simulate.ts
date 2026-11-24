import type { PathGeometry, RacerState, SimParams, SimResult, SimStatus } from "./types";

export const RECORD_DT = 1 / 500;
const DEFAULT_DT = 1e-4;
const T_MAX = 20;

/** Linear interpolation of geometry quantities at arc length s. */
function lookup(p: PathGeometry, s: number) {
  const u = Math.min(Math.max(s / p.ds, 0), p.n - 1);
  const i = Math.min(Math.floor(u), p.n - 2);
  const f = u - i;
  return {
    i,
    f,
    tx: p.tx[i] + (p.tx[i + 1] - p.tx[i]) * f,
    ty: p.ty[i] + (p.ty[i + 1] - p.ty[i]) * f,
    k: p.k[i] + (p.k[i + 1] - p.k[i]) * f,
  };
}

/**
 * Bead sliding on a rigid wire under gravity with Coulomb friction.
 *   normal force / m:  N = v²κ − g·T_x
 *   tangential accel:  a = g·T_y − μ|N|·sign(v)
 */
function accel(p: PathGeometry, s: number, v: number, g: number, mu: number): number {
  const q = lookup(p, s);
  const drive = g * q.ty;
  if (mu === 0) return drive;
  const N = Math.abs(v * v * q.k - g * q.tx);
  const fr = mu * N;
  if (Math.abs(v) < 1e-6) {
    // static case: friction can cancel the drive up to μN
    if (Math.abs(drive) <= fr) return 0;
    return drive - Math.sign(drive) * fr;
  }
  return drive - Math.sign(v) * fr;
}

export function simulate(p: PathGeometry, params: SimParams, DT = DEFAULT_DT): SimResult {
  const { g, mu } = params;
  const sArr: number[] = [0];
  const vArr: number[] = [0];
  let s = 0;
  let v = 0;
  let t = 0;
  let nextRecord = RECORD_DT;
  let status: SimStatus = "timeout";
  let finishTime: number | null = null;
  let stillFor = 0;

  while (t < T_MAX) {
    // RK4 on (s, v)
    const a1 = accel(p, s, v, g, mu);
    const k1s = v;
    const a2 = accel(p, s + (k1s * DT) / 2, v + (a1 * DT) / 2, g, mu);
    const k2s = v + (a1 * DT) / 2;
    const a3 = accel(p, s + (k2s * DT) / 2, v + (a2 * DT) / 2, g, mu);
    const k3s = v + (a2 * DT) / 2;
    const a4 = accel(p, s + k3s * DT, v + a3 * DT, g, mu);
    const k4s = v + a3 * DT;
    let ns = s + (DT / 6) * (k1s + 2 * k2s + 2 * k3s + k4s);
    let nv = v + (DT / 6) * (a1 + 2 * a2 + 2 * a3 + a4);

    // with friction, velocity cannot flip sign within one step: it stops instead
    if (mu > 0 && v !== 0 && Math.sign(nv) !== Math.sign(v)) nv = 0;

    if (ns <= 0) {
      ns = 0;
      if (nv < 0) nv = 0;
    }

    if (ns >= p.length) {
      const frac = (p.length - s) / (ns - s || 1e-12);
      finishTime = t + DT * frac;
      const vf = v + (nv - v) * frac;
      // record up to the finish
      while (nextRecord <= finishTime) {
        sArr.push(p.length);
        vArr.push(vf);
        nextRecord += RECORD_DT;
      }
      sArr.push(p.length);
      vArr.push(vf);
      status = "finished";
      break;
    }

    s = ns;
    v = nv;
    t += DT;

    if (Math.abs(v) < 1e-5 && accel(p, s, 0, g, mu) === 0) {
      stillFor += DT;
      if (stillFor > 0.05) {
        status = "stalled";
        break;
      }
    } else stillFor = 0;

    while (t >= nextRecord) {
      sArr.push(s);
      vArr.push(v);
      nextRecord += RECORD_DT;
    }
  }

  return {
    id: p.id,
    recordDt: RECORD_DT,
    s: Float32Array.from(sArr),
    v: Float32Array.from(vArr),
    samples: sArr.length,
    finishTime,
    status,
    mu,
    g,
  };
}

/** Position, tangent and speed of a racer at time t (seconds since release). */
export function stateAt(p: PathGeometry, r: SimResult, t: number): RacerState {
  const u = Math.max(0, t / r.recordDt);
  let s: number;
  let v: number;
  if (u >= r.samples - 1) {
    s = r.s[r.samples - 1];
    v = r.v[r.samples - 1];
  } else {
    const i = Math.floor(u);
    const f = u - i;
    s = r.s[i] + (r.s[i + 1] - r.s[i]) * f;
    v = r.v[i] + (r.v[i + 1] - r.v[i]) * f;
  }
  const done = r.finishTime !== null && t >= r.finishTime;
  if (done) v = r.v[r.samples - 1];
  const q = pointAt(p, s);
  return { ...q, s, v: Math.abs(v), done };
}

export function pointAt(p: PathGeometry, s: number) {
  const u = Math.min(Math.max(s / p.ds, 0), p.n - 1);
  const i = Math.min(Math.floor(u), p.n - 2);
  const f = u - i;
  const sgn = 1;
  return {
    x: p.x[i] + (p.x[i + 1] - p.x[i]) * f,
    y: p.y[i] + (p.y[i + 1] - p.y[i]) * f,
    tx: sgn * (p.tx[i] + (p.tx[i + 1] - p.tx[i]) * f),
    ty: sgn * (p.ty[i] + (p.ty[i + 1] - p.ty[i]) * f),
  };
}

export function maxSpeed(r: SimResult): number {
  let m = 0;
  for (let i = 0; i < r.samples; i++) m = Math.max(m, Math.abs(r.v[i]));
  return m;
}
