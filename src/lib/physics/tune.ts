import { cycloidFamilyPath, cycloidPath } from "./curves";
import { simulate } from "./simulate";
import type { PathGeometry } from "./types";

const cache = new Map<string, PathGeometry>();

/**
 * With friction the plain cycloid is no longer the fastest curve.
 * We search the generalised cycloid family (a, b) with a small pattern search
 * and keep whichever curve has the shortest simulated descent time.
 */
export function frictionTunedPath(W: number, H: number, mu: number, g: number): PathGeometry {
  const key = `${W.toFixed(3)}|${H.toFixed(3)}|${mu.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (mu < 1e-3) {
    const p = { ...cycloidPath(W, H), id: "frictionOpt" as const };
    cache.set(key, p);
    return p;
  }

  const timeOf = (a: number, b: number): number => {
    const p = cycloidFamilyPath(W, H, a, b, 700);
    if (!p) return Infinity;
    const r = simulate(p, { g, mu }, 5e-4);
    return r.finishTime ?? Infinity;
  };

  let a = 0;
  let b = 0;
  let best = timeOf(0, 0);
  let step = 0.2;
  let guard = 0;
  while (step > 0.01 && guard++ < 40) {
    let improved = false;
    for (const [da, db] of [[step, 0], [-step, 0], [0, step / 2], [0, -step / 2], [step, step / 2], [step, -step / 2]]) {
      const t = timeOf(a + da, b + db);
      if (t < best - 1e-5) {
        best = t;
        a += da;
        b += db;
        improved = true;
        break;
      }
    }
    if (!improved) step /= 2;
  }

  const p = cycloidFamilyPath(W, H, a, b) ?? { ...cycloidPath(W, H), id: "frictionOpt" as const };
  if (cache.size > 200) cache.clear();
  cache.set(key, p);
  return p;
}
