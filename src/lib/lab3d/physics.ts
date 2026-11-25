import { simulate } from "@/lib/physics/simulate";
import type { PathGeometry, SimResult } from "@/lib/physics/types";
import { localAt } from "./tracks";
import { BALLS, type BallKind } from "./types";

export interface BallRun {
  ballId: string;
  trackId: string;
  kind: BallKind;
  path: PathGeometry;
  W: number;
  sim: SimResult;
  g: number;
  mu: number;
  /** time the ball stops moving: finish, stall or timeout */
  end: number;
}

export function runBall(ballId: string, trackId: string, kind: BallKind, path: PathGeometry, W: number, g: number, mu: number): BallRun {
  const sim = simulate(path, { g, mu, inertia: BALLS[kind].inertia });
  const end = sim.finishTime ?? (sim.samples - 1) * sim.recordDt;
  return { ballId, trackId, kind, path, W, sim, g, mu, end };
}

/** Arc length and signed speed at time t, interpolated from the recorded run. */
export function motionAt(r: BallRun, t: number) {
  const { sim } = r;
  const u = Math.max(0, t / sim.recordDt);
  if (u >= sim.samples - 1) return { s: sim.s[sim.samples - 1], v: r.sim.finishTime !== null && t >= r.sim.finishTime ? sim.v[sim.samples - 1] : 0 };
  const i = Math.floor(u);
  const f = u - i;
  return { s: sim.s[i] + (sim.s[i + 1] - sim.s[i]) * f, v: sim.v[i] + (sim.v[i + 1] - sim.v[i]) * f };
}

/** Everything the inspector shows at time t. Energies are measured from the track's lowest point. */
export function inspectAt(r: BallRun, t: number) {
  const spec = BALLS[r.kind];
  const { s, v } = motionAt(r, Math.min(t, r.end));
  const p = localAt(r.path, r.W, s);
  const m = spec.mass;
  const h = r.path.maxDepth - p.depth; // height above the lowest point
  const PE = m * r.g * h;
  const KE = 0.5 * m * v * v * (1 + spec.inertia); // translation + spin
  const E0 = m * r.g * r.path.maxDepth;
  const heat = Math.max(0, E0 - PE - KE);
  // curvature at s (path frame has y down; sign does not matter for |N|)
  const u = Math.min(Math.max(s / r.path.ds, 0), r.path.n - 1);
  const k = r.path.k[Math.min(Math.round(u), r.path.n - 1)];
  const txDown = r.path.tx[Math.min(Math.round(u), r.path.n - 1)];
  const Nper = v * v * k - r.g * txDown; // per unit mass, along the path normal
  const N = m * Math.abs(Nper);
  const friction = r.mu > 0 && Math.abs(v) > 1e-4 ? r.mu * N : 0;
  return {
    t: Math.min(t, r.end),
    s,
    length: r.path.length,
    v: Math.abs(v),
    vx: p.tx * Math.abs(v),
    vy: p.ty * Math.abs(v),
    p,
    h,
    m,
    PE,
    KE,
    heat,
    E0,
    N,
    /**
     * Direction of the track's push along the up-normal (+1 = supports the ball from below,
     * −1 = the groove's upper lip holds it in). The path frame's normal points into the board,
     * so the force along our up-normal is −Nper.
     */
    nSign: Nper <= 0 ? 1 : -1,
    friction,
    weight: m * r.g,
    finished: r.sim.finishTime !== null && t >= r.sim.finishTime,
  };
}

export type Inspect = ReturnType<typeof inspectAt>;
