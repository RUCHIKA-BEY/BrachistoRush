import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useLab } from "@/lib/lab3d/store";
import { frameOf, trackPath } from "@/lib/lab3d/tracks";
import type { TrackObj } from "@/lib/lab3d/types";

/** What the pointer is currently doing (module state: updated per pointer move, no re-renders). */
export type Drag =
  | { kind: "move"; id: string; offX: number; offZ: number; startX: number; startY: number; moved: boolean }
  | { kind: "rotate"; id: string; startRot: number; startAng: number }
  | { kind: "handle"; id: string; index: number; top: number };

export const pointer = {
  drag: null as Drag | null,
  /** ghost position while placing a new part */
  ghost: { x: 0, z: 0, over: false },
  controls: null as { enabled: boolean } | null,
  /** time of the last placement, so the same click does not also deselect it */
  placedAt: 0,
};

const TABLE_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

export function rayToTable(ray: THREE.Ray): { x: number; z: number } | null {
  return ray.intersectPlane(TABLE_PLANE, hit) ? { x: hit.x, z: hit.z } : null;
}

export function rayToPlane(ray: THREE.Ray, plane: THREE.Plane): THREE.Vector3 | null {
  return ray.intersectPlane(plane, hit) ? hit.clone() : null;
}

function lockCamera() {
  if (pointer.controls) pointer.controls.enabled = false;
}

function canEdit() {
  const s = useLab.getState();
  return !s.placing && s.status !== "running" && s.status !== "paused";
}

/** Press on a part: select it, and (when editing is allowed) start sliding it on the table. */
export function startMove(e: ThreeEvent<PointerEvent>, id: string, x: number, z: number) {
  if (e.button !== 0) return;
  // controls drawn on top (curve handles) win even when a board is physically in front of them
  if (e.intersections.some((i) => i.object.userData.onTop && i.object !== e.object)) return;
  const st = useLab.getState();
  if (st.placing) return;
  e.stopPropagation();
  st.select(id);
  if (!canEdit()) return;
  const p = rayToTable(e.ray);
  if (!p) return;
  lockCamera();
  pointer.drag = { kind: "move", id, offX: x - p.x, offZ: z - p.z, startX: e.nativeEvent.clientX, startY: e.nativeEvent.clientY, moved: false };
  st.setDragging(true);
}

export function startRotate(e: ThreeEvent<PointerEvent>, id: string, x: number, z: number, rot: number) {
  if (e.button !== 0 || !canEdit()) return;
  e.stopPropagation();
  const p = rayToTable(e.ray);
  if (!p) return;
  lockCamera();
  pointer.drag = { kind: "rotate", id, startRot: rot, startAng: Math.atan2(-(p.z - z), p.x - x) };
  useLab.getState().setDragging(true);
}

export function startHandle(e: ThreeEvent<PointerEvent>, t: TrackObj, index: number) {
  if (e.button !== 0 || !canEdit()) return;
  e.stopPropagation();
  lockCamera();
  // keep the vertical frame fixed while dragging so the handle tracks the cursor exactly
  pointer.drag = { kind: "handle", id: t.id, index, top: frameOf(trackPath(t), t.W).top };
  useLab.getState().setDragging(true);
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __pointer: typeof pointer }).__pointer = pointer;
