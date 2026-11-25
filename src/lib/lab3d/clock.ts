/**
 * The experiment clock. It is mutated every frame by the scene, so it lives outside React
 * state; the DOM and the 3D scene both read it in their own animation loops.
 */
export const clock = {
  t: 0,
  /** frozen / finished runs are scrubbed by writing t directly */
  running: false,
};

/** Live 3D objects other parts of the scene need to find (follow cam, snapping). */
export const sceneRefs = {
  balls: new Map<string, { getWorldPosition: (v: import("three").Vector3) => import("three").Vector3 }>(),
};
