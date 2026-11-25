import * as THREE from "three";
import type { PathGeometry } from "@/lib/physics/types";
import { localAt } from "@/lib/lab3d/tracks";
import { BOARD } from "@/lib/lab3d/types";

export const STRIP = { lift: 0.0015, half: 0.017 };
export const LIP = { up: 0.012, z: 0.026, r: 0.0045 };

export interface TrackGeometry {
  board: THREE.ExtrudeGeometry;
  strip: THREE.BufferGeometry;
  lips: [THREE.TubeGeometry, THREE.TubeGeometry];
  feet: { x: number }[];
}

const cache = new WeakMap<PathGeometry, Map<number, TrackGeometry>>();

/** Board (thick profile standing on the table), glowing running strip and two guide lips. */
export function trackGeometry(path: PathGeometry, W: number): TrackGeometry {
  let byW = cache.get(path);
  if (!byW) cache.set(path, (byW = new Map()));
  const hit = byW.get(W);
  if (hit) return hit;

  const N = 220;
  const pts = Array.from({ length: N }, (_, i) => localAt(path, W, (i / (N - 1)) * path.length));

  // board profile: straight down from A to the table, along the path, down from B
  const shape = new THREE.Shape();
  // the board starts a little behind A so a vertical start never makes a zero-width sliver
  shape.moveTo(pts[0].x - 0.012, 0);
  shape.lineTo(pts[0].x - 0.012, pts[0].y);
  for (const p of pts) shape.lineTo(p.x, p.y);
  shape.lineTo(pts[N - 1].x, 0);
  shape.closePath();
  const board = new THREE.ExtrudeGeometry(shape, {
    depth: BOARD.thickness,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 1,
  });
  board.translate(0, 0, -BOARD.thickness / 2);

  // ribbon on top of the board's edge
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const x = p.x + p.nx * STRIP.lift;
    const y = p.y + p.ny * STRIP.lift;
    pos.push(x, y, -STRIP.half, x, y, STRIP.half);
    if (i < N - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const strip = new THREE.BufferGeometry();
  strip.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  strip.setIndex(idx);
  strip.computeVertexNormals();

  const lip = (z: number) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.filter((_, i) => i % 2 === 0 || i === N - 1).map((p) => new THREE.Vector3(p.x + p.nx * LIP.up, p.y + p.ny * LIP.up, z)),
      false,
      "centripetal",
    );
    return new THREE.TubeGeometry(curve, 260, LIP.r, 8, false);
  };

  const geo: TrackGeometry = {
    board,
    strip,
    lips: [lip(-LIP.z), lip(LIP.z)],
    feet: [{ x: pts[0].x + 0.08 }, { x: pts[N - 1].x - 0.08 }],
  };
  byW.set(W, geo);
  return geo;
}
