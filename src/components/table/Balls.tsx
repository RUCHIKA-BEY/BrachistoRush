"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clock, sceneRefs } from "@/lib/lab3d/clock";
import { motionAt } from "@/lib/lab3d/physics";
import { trackStartWorld, useLab } from "@/lib/lab3d/store";
import { localAt, trackPath } from "@/lib/lab3d/tracks";
import { BALLS, type BallKind, type BallObj, type TrackObj } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { startMove } from "./interaction";
import { InspectOverlay } from "./InspectOverlay";
import { ballTexture } from "./textures";
import { STRIP } from "./trackGeometry";

export function BallMesh({ kind, selected, ghost = false }: { kind: BallKind; selected?: boolean; ghost?: boolean }) {
  const r = BALLS[kind].radius;
  const map = useMemo(() => {
    if (kind === "steel") return ballTexture("#e2e8f0", "#7d8a9a");
    if (kind === "hollow") return ballTexture("#ffffff", "#fb923c");
    return ballTexture("#f59e0b", "#7c2d12");
  }, [kind]);
  return (
    <group>
      <mesh castShadow={!ghost}>
        <sphereGeometry args={[r, 48, 32]} />
        {kind === "steel" ? (
          <meshStandardMaterial map={map} metalness={1} roughness={0.14} transparent={ghost} opacity={ghost ? 0.5 : 1} />
        ) : kind === "hollow" ? (
          <meshStandardMaterial map={map} metalness={0} roughness={0.45} transparent={ghost} opacity={ghost ? 0.5 : 1} />
        ) : (
          <meshPhysicalMaterial map={map} metalness={0} roughness={0.12} clearcoat={1} transparent={ghost} opacity={ghost ? 0.5 : 1} />
        )}
      </mesh>
      {selected && (
        <mesh>
          <sphereGeometry args={[r * 1.35, 24, 16]} />
          <meshBasicMaterial color="#2dd4bf" transparent opacity={0.18} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** A ball sitting in a track's start gate, or rolling along it during a run (track-local frame). */
export function BallOnTrack({ ball, track, colors, selected }: { ball: BallObj; track: TrackObj; colors: ThemeColors; selected: boolean }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const path = trackPath(track);
  const r = BALLS[ball.kind].radius;

  useEffect(() => {
    const g = group.current;
    if (g) sceneRefs.balls.set(ball.id, g);
    return () => void sceneRefs.balls.delete(ball.id);
  }, [ball.id]);

  useFrame(() => {
    const run = useLab.getState().runs[ball.id];
    const s = run && run.trackId === track.id ? motionAt(run, Math.min(clock.t, run.end)).s : 0;
    const p = localAt(path, track.W, s);
    const off = r + STRIP.lift;
    group.current?.position.set(p.x + p.nx * off, p.y + p.ny * off, 0);
    // rolling without slipping: angle = distance / radius (beads slide, so they do not spin)
    if (spin.current) spin.current.rotation.z = BALLS[ball.kind].inertia > 0 ? -s / r : 0;
  });

  return (
    <>
      <group
        ref={group}
        onPointerDown={(e) => {
          const a = trackStartWorld(track);
          startMove(e, ball.id, a.x, a.z);
        }}
      >
        <group ref={spin}>
          <BallMesh kind={ball.kind} selected={selected} />
        </group>
      </group>
      <InspectOverlay ball={ball} track={track} colors={colors} selected={selected} />
    </>
  );
}

/** A ball resting loose on the table. */
export function LooseBall({ ball, selected }: { ball: BallObj; selected: boolean }) {
  const group = useRef<THREE.Group>(null);
  const r = BALLS[ball.kind].radius;
  useEffect(() => {
    const g = group.current;
    if (g) sceneRefs.balls.set(ball.id, g);
    return () => void sceneRefs.balls.delete(ball.id);
  }, [ball.id]);
  return (
    <group ref={group} position={[ball.x, r, ball.z]} onPointerDown={(e) => startMove(e, ball.id, ball.x, ball.z)}>
      <BallMesh kind={ball.kind} selected={selected} />
    </group>
  );
}
