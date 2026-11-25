import { arcPath, cycloidPath, geometryFromPoints, parabolaPath, straightPath } from "@/lib/physics/curves";
import type { PathGeometry } from "@/lib/physics/types";
import { BOARD, type TrackObj } from "./types";

export const DEFAULT_HANDLES: [number, number][] = [
  [0.12, 0.75],
  [0.55, 1.05],
];

/** Catmull-Rom spline through A, the two handles and B (y measured downward from A). */
function customGeometry(W: number, H: number, handles: [number, number][]): PathGeometry {
  const pts = [[0, 0], ...handles.map(([u, d]) => [u * W, d * H]), [W, H]];
  // phantom end points keep the ends natural
  const P = [[2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]], ...pts, [2 * pts[3][0] - pts[2][0], 2 * pts[3][1] - pts[2][1]]];
  const xs: number[] = [];
  const ys: number[] = [];
  const per = 400;
  for (let seg = 1; seg < P.length - 2; seg++) {
    const [p0, p1, p2, p3] = [P[seg - 1], P[seg], P[seg + 1], P[seg + 2]];
    for (let i = 0; i < per; i++) {
      const t = i / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      xs.push(f(p0[0], p1[0], p2[0], p3[0]));
      ys.push(Math.max(0, f(p0[1], p1[1], p2[1], p3[1]))); // never above the start
    }
  }
  xs.push(W);
  ys.push(H);
  return geometryFromPoints("custom", xs, ys);
}

const cache = new Map<string, PathGeometry>();

/** Path in the track's own 2D frame: x to the right, y measured DOWN from A (metres). */
export function trackPath(t: Pick<TrackObj, "shape" | "W" | "H" | "handles">): PathGeometry {
  const key = `${t.shape}|${t.W.toFixed(3)}|${t.H.toFixed(3)}|${t.shape === "custom" ? JSON.stringify(t.handles ?? DEFAULT_HANDLES) : ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let g: PathGeometry;
  switch (t.shape) {
    case "straight":
      g = straightPath(t.W, t.H);
      break;
    case "arc":
      g = arcPath(t.W, t.H);
      break;
    case "parabola":
      g = parabolaPath(t.W, t.H);
      break;
    case "cycloid":
      g = cycloidPath(t.W, t.H);
      break;
    default:
      g = customGeometry(t.W, t.H, t.handles ?? DEFAULT_HANDLES);
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, g);
  return g;
}

/**
 * The track's 3D frame: local x runs A→B centred on the footprint, y is up from the table,
 * z is across the groove. The lowest point of the path sits BOARD.clearance above the table.
 */
export function frameOf(path: PathGeometry, W: number) {
  const top = BOARD.clearance + path.maxDepth;
  return {
    top,
    /** local position of path point (x, depth) */
    lx: (x: number) => x - W / 2,
    ly: (depth: number) => top - depth,
  };
}

/** Local 2D point, unit tangent (direction of travel) and up-normal at arc length s. */
export function localAt(path: PathGeometry, W: number, s: number) {
  const u = Math.min(Math.max(s / path.ds, 0), path.n - 1);
  const i = Math.min(Math.floor(u), path.n - 2);
  const f = u - i;
  const x = path.x[i] + (path.x[i + 1] - path.x[i]) * f;
  const d = path.y[i] + (path.y[i + 1] - path.y[i]) * f;
  let tx = path.tx[i] + (path.tx[i + 1] - path.tx[i]) * f;
  let ty = -(path.ty[i] + (path.ty[i + 1] - path.ty[i]) * f); // flip to y-up
  const l = Math.hypot(tx, ty) || 1;
  tx /= l;
  ty /= l;
  const fr = frameOf(path, W);
  // up-normal: tangent rotated +90°, i.e. the open side of the groove
  return { x: fr.lx(x), y: fr.ly(d), depth: d, tx, ty, nx: -ty, ny: tx };
}

/** Rotate a local (x, z) offset by the track's yaw and add its position (three.js Y-rotation convention). */
export function toWorld(o: { x: number; z: number; rot: number }, lx: number, lz: number) {
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  return { x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c };
}

export function toLocal(o: { x: number; z: number; rot: number }, wx: number, wz: number) {
  const dx = wx - o.x;
  const dz = wz - o.z;
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
