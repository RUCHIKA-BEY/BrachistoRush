export type RacerId = "cycloid" | "straight" | "arc" | "parabola" | "frictionOpt" | "custom";

export interface Vec2 {
  x: number;
  y: number; // y is measured DOWNWARD (depth below the start point A), in metres
}

/** A path resampled at uniform arc-length spacing. */
export interface PathGeometry {
  id: RacerId;
  n: number;
  ds: number;
  length: number;
  x: Float64Array;
  y: Float64Array;
  tx: Float64Array; // unit tangent
  ty: Float64Array;
  k: Float64Array; // signed curvature (dT/ds · n), n = (-ty, tx)
  maxDepth: number;
}

export interface SimParams {
  g: number;
  mu: number;
}

export type SimStatus = "finished" | "stalled" | "timeout";

export interface SimResult {
  id: RacerId;
  recordDt: number;
  s: Float32Array;
  v: Float32Array;
  samples: number;
  finishTime: number | null;
  status: SimStatus;
  mu: number;
  g: number;
}

export interface RacerState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  s: number;
  v: number;
  done: boolean;
}
