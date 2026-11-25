export type TrackShape = "straight" | "arc" | "parabola" | "cycloid" | "custom";
export type BallKind = "steel" | "hollow" | "bead";
export type GravityId = "earth" | "moon" | "mars" | "jupiter";
export type CameraMode = "free" | "follow" | "side" | "top" | "closeup" | "cinematic";

export interface TrackObj {
  id: string;
  type: "track";
  shape: TrackShape;
  x: number; // centre of the track's footprint on the table (metres)
  z: number;
  rot: number; // rotation about the vertical axis (radians)
  W: number; // horizontal distance A → B
  H: number; // drop A → B
  /** custom shape only: two shaping points as fractions (x/W, depth/H) */
  handles?: [number, number][];
}

export interface BallObj {
  id: string;
  type: "ball";
  kind: BallKind;
  x: number;
  z: number;
  trackId: string | null; // sitting in this track's start gate
}

export interface StopwatchObj {
  id: string;
  type: "stopwatch";
  x: number;
  z: number;
  rot: number;
}

export type TableObj = TrackObj | BallObj | StopwatchObj;
export type TableObjType = TableObj["type"];

export type PlaceItem = { type: "track"; shape: TrackShape } | { type: "ball"; kind: BallKind } | { type: "stopwatch" };

export interface BallSpec {
  label: string;
  short: string;
  radius: number; // m
  mass: number; // kg
  inertia: number; // I/(m r²)
  note: string;
}

export const BALLS: Record<BallKind, BallSpec> = {
  steel: { label: "Steel ball", short: "Steel", radius: 0.022, mass: 0.35, inertia: 2 / 5, note: "Solid ball that rolls: 2/7 of its energy goes into spinning." },
  hollow: { label: "Hollow ball", short: "Hollow", radius: 0.022, mass: 0.01, inertia: 2 / 3, note: "Thin shell that rolls: 2/5 of its energy goes into spinning, so it is slower." },
  bead: { label: "Sliding bead", short: "Bead", radius: 0.016, mass: 0.02, inertia: 0, note: "Slides without rolling, like the classic textbook bead on a wire." },
};

export const GRAVITY: Record<GravityId, { label: string; g: number }> = {
  earth: { label: "Earth", g: 9.81 },
  moon: { label: "Moon", g: 1.62 },
  mars: { label: "Mars", g: 3.71 },
  jupiter: { label: "Jupiter", g: 24.79 },
};

export const TRACKS: Record<TrackShape, { label: string; cssVar: string; blurb: string }> = {
  cycloid: { label: "Cycloid", cssVar: "--c-cycloid", blurb: "The brachistochrone: steep start, fastest descent." },
  straight: { label: "Straight", cssVar: "--c-straight", blurb: "Shortest path from A to B." },
  arc: { label: "Circular arc", cssVar: "--c-arc", blurb: "A quarter-circle-like curve with a vertical start." },
  parabola: { label: "Parabola", cssVar: "--c-parabola", blurb: "Sideways parabola, vertical start." },
  custom: { label: "Custom curve", cssVar: "--c-custom", blurb: "Drag its two handles to design your own curve." },
};

/** Table top is the plane y = 0. */
export const TABLE = { width: 3.6, depth: 2.4, thickness: 0.06, legHeight: 0.74 };
/** Track board dimensions (metres). */
export const BOARD = { thickness: 0.06, clearance: 0.05, gate: 0.004 };
