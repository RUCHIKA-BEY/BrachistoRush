"use client";

import { CameraControls, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clock, sceneRefs } from "@/lib/lab3d/clock";
import { focusBallId, snapTrackFor, useLab } from "@/lib/lab3d/store";
import { localAt, toLocal, toWorld, trackPath } from "@/lib/lab3d/tracks";
import { BALLS, type BallObj, type TrackObj } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { BallMesh, LooseBall } from "./Balls";
import { pointer, rayToPlane, rayToTable } from "./interaction";
import { Stopwatch3D } from "./Stopwatch3D";
import { TableSurface } from "./TableSurface";
import { trackGeometry, STRIP } from "./trackGeometry";
import { TrackModel } from "./TrackModel";

/** Advances the experiment clock (scaled by slow motion) and ends the run. */
function ClockDriver() {
  useFrame((_, dt) => {
    if (!clock.running) return;
    const st = useLab.getState();
    clock.t += Math.min(dt, 1 / 20) * st.settings.speed;
    if (clock.t >= st.duration) st.finish();
  });
  return null;
}

/** Window-level pointer handling for sliding, turning, shaping and placing parts. */
function Interaction() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toRay = (ev: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray;
    };
    const overCanvas = (ev: PointerEvent) => document.elementFromPoint(ev.clientX, ev.clientY) === gl.domElement;
    const snapV = (v: number) => (useLab.getState().settings.snap ? Math.round(v / 0.05) * 0.05 : v);

    const onMove = (ev: PointerEvent) => {
      const st = useLab.getState();
      if (st.placing) {
        const p = rayToTable(toRay(ev));
        pointer.ghost.over = !!p && overCanvas(ev);
        if (p) {
          pointer.ghost.x = snapV(p.x);
          pointer.ghost.z = snapV(p.z);
        }
        return;
      }
      const d = pointer.drag;
      if (!d) return;
      const o = st.objects.find((q) => q.id === d.id);
      if (!o) return;
      if (d.kind === "move") {
        if (!d.moved && Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) < 4) return;
        d.moved = true;
        const p = rayToTable(toRay(ev));
        if (!p) return;
        st.update(d.id, { x: snapV(p.x + d.offX), z: snapV(p.z + d.offZ), ...(o.type === "ball" ? { trackId: null } : {}) });
      } else if (d.kind === "rotate" && "rot" in o) {
        const p = rayToTable(toRay(ev));
        if (!p) return;
        let rot = d.startRot + Math.atan2(-(p.z - o.z), p.x - o.x) - d.startAng;
        if (st.settings.snap) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
        st.update(d.id, { rot });
      } else if (d.kind === "handle" && o.type === "track") {
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(Math.sin(o.rot), 0, Math.cos(o.rot)), new THREE.Vector3(o.x, 0, o.z));
        const hit = rayToPlane(toRay(ev), plane);
        if (!hit) return;
        const loc = toLocal(o, hit.x, hit.z);
        const handles = (o.handles ?? []).map((h) => [...h] as [number, number]);
        const lo = d.index === 0 ? 0.03 : handles[0][0] + 0.06;
        const hi = d.index === 0 ? handles[1][0] - 0.06 : 0.97;
        const u = Math.min(hi, Math.max(lo, (loc.x + o.W / 2) / o.W));
        const depth = Math.min(1.8, Math.max(0.02, (d.top - hit.y) / o.H));
        handles[d.index] = [u, depth];
        st.update<TrackObj>(d.id, { handles });
      }
    };

    const onUp = (ev: PointerEvent) => {
      const st = useLab.getState();
      if (st.placing) {
        if (overCanvas(ev) && pointer.ghost.over) {
          st.place(st.placing, pointer.ghost.x, pointer.ghost.z);
          pointer.placedAt = performance.now();
          if (!ev.shiftKey) st.setPlacing(null);
        }
        return;
      }
      const d = pointer.drag;
      if (!d) return;
      pointer.drag = null;
      if (d.kind === "move" && d.moved) {
        const o = useLab.getState().objects.find((q) => q.id === d.id);
        if (o?.type === "ball") st.dropBall(o.id, o.x, o.z);
      }
      st.setDragging(false);
      if (pointer.controls) pointer.controls.enabled = true;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl]);
  return null;
}

/** Translucent preview of the part being placed; balls snap to a nearby start gate. */
function Ghost() {
  const placing = useLab((s) => s.placing);
  const group = useRef<THREE.Group>(null);
  const preview = useMemo(() => {
    if (placing?.type !== "track") return null;
    const path = trackPath({ shape: placing.shape, W: 1.2, H: 0.55, handles: undefined });
    return trackGeometry(path, 1.2).board;
  }, [placing]);

  useFrame(() => {
    const g = group.current;
    if (!g || !placing) return;
    g.visible = pointer.ghost.over;
    let { x, z } = pointer.ghost;
    let y = 0;
    if (placing.type === "ball") {
      const objs = useLab.getState().objects;
      const t = snapTrackFor(objs, x, z);
      const r = BALLS[placing.kind].radius;
      if (t) {
        const p = localAt(trackPath(t), t.W, 0);
        const w = toWorld(t, p.x + p.nx * (r + STRIP.lift), 0);
        x = w.x;
        z = w.z;
        y = p.y + p.ny * (r + STRIP.lift);
      } else y = r;
    }
    g.position.set(x, y, z);
  });

  if (!placing) return null;
  return (
    <group ref={group} visible={false}>
      {placing.type === "track" && preview && (
        <mesh geometry={preview}>
          <meshBasicMaterial color="#2dd4bf" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      {placing.type === "ball" && <BallMesh kind={placing.kind} ghost />}
      {placing.type === "stopwatch" && (
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.026, 32]} />
          <meshBasicMaterial color="#2dd4bf" transparent opacity={0.35} depthWrite={false} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.05, 0.065, 40]} />
        <meshBasicMaterial color="#2dd4bf" transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function sceneCentre(): THREE.Vector3 {
  const tracks = useLab.getState().objects.filter((o): o is TrackObj => o.type === "track");
  if (!tracks.length) return new THREE.Vector3(0, 0.25, 0);
  const c = new THREE.Vector3();
  for (const t of tracks) c.add(new THREE.Vector3(t.x, 0.3, t.z));
  return c.divideScalar(tracks.length);
}

function focusBall(): string | null {
  return focusBallId(useLab.getState());
}

/** Eased camera presets, a chase cam that follows a ball, and a slow cinematic orbit. */
function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const mode = useLab((s) => s.settings.camera);
  const nonce = useLab((s) => s.cameraNonce);
  const dragging = useLab((s) => s.dragging);
  const placing = useLab((s) => s.placing);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));

  useEffect(() => {
    // tall phone screens need the camera further back to fit the table
    const k = aspect < 1 ? Math.min(2.1, 1 / aspect) : 1;
    void ref.current?.setLookAt(-1.25 * k, 1.05 * k, 1.95 * k, 0.05, 0.2, 0, false);
    pointer.controls = ref.current;
    return () => void (pointer.controls = null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frame once on mount
  }, []);
  useEffect(() => {
    if (ref.current) ref.current.enabled = !dragging && !placing;
  }, [dragging, placing]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const m = sceneCentre();
    c.smoothTime = 0.35;
    if (mode === "side") void c.setLookAt(m.x, 0.4, m.z + 2.4, m.x, 0.28, m.z, true);
    else if (mode === "top") void c.setLookAt(m.x, 3.2, m.z + 0.02, m.x, 0, m.z, true);
    else if (mode === "cinematic") void c.setLookAt(m.x - 1.9, 0.75, m.z + 1.6, m.x, 0.25, m.z, true);
    else if (mode === "closeup" || mode === "follow") {
      const id = focusBall();
      const b = id ? sceneRefs.balls.get(id) : undefined;
      if (b) {
        b.getWorldPosition(tmp);
        void c.setLookAt(tmp.x - 0.45, tmp.y + 0.3, tmp.z + 0.85, tmp.x, tmp.y + 0.05, tmp.z, true);
      }
    }
  }, [mode, nonce, tmp]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    if (mode === "cinematic") void c.rotate(dt * 0.12, 0, false);
    if (mode === "follow") {
      const id = focusBall();
      const b = id ? sceneRefs.balls.get(id) : undefined;
      if (b) {
        b.getWorldPosition(tmp);
        c.smoothTime = 0.12;
        void c.moveTo(tmp.x, tmp.y, tmp.z, true);
      }
    }
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.15}
      maxDistance={7}
      maxPolarAngle={Math.PI * 0.49}
      dollySpeed={0.6}
    />
  );
}

function Lights({ colors }: { colors: ThemeColors }) {
  const dark = colors.dark;
  return (
    <>
      <hemisphereLight args={[dark ? "#cbd5e1" : "#ffffff", dark ? "#0b1220" : "#cbd5e1", dark ? 0.45 : 0.55]} />
      <directionalLight
        position={[1.8, 3.6, 2.2]}
        intensity={dark ? 2.2 : 1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={1.6}
        shadow-camera-bottom={-1.6}
        shadow-camera-near={0.5}
        shadow-camera-far={9}
      />
      <directionalLight position={[-2.5, 1.5, -1.5]} intensity={dark ? 0.6 : 0.8} color={dark ? "#818cf8" : "#ffffff"} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 1.5, 2]} rotation-y={Math.PI / 2.5} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1} position={[4, 1.2, -2]} rotation-y={-Math.PI / 2.5} scale={[4, 1, 1]} />
        <Lightformer form="ring" color="#2dd4bf" intensity={2} position={[0, 1.5, -4]} scale={2} />
      </Environment>
    </>
  );
}

function Scene({ colors }: { colors: ThemeColors }) {
  const objects = useLab((s) => s.objects);
  const selectedId = useLab((s) => s.selectedId);
  const tracks = objects.filter((o): o is TrackObj => o.type === "track");
  const balls = objects.filter((o): o is BallObj => o.type === "ball");
  return (
    <>
      <color attach="background" args={[colors.dark ? "#030a18" : "#eef2f7"]} />
      <fog attach="fog" args={[colors.dark ? "#030a18" : "#eef2f7", 5, 13]} />
      <Lights colors={colors} />
      <TableSurface colors={colors} />
      {tracks.map((t) => (
        <TrackModel key={t.id} t={t} balls={balls.filter((b) => b.trackId === t.id)} colors={colors} selected={selectedId === t.id} selectedId={selectedId} />
      ))}
      {balls
        .filter((b) => !b.trackId || !tracks.some((t) => t.id === b.trackId))
        .map((b) => (
          <LooseBall key={b.id} ball={b} selected={selectedId === b.id} />
        ))}
      {objects.map((o) => (o.type === "stopwatch" ? <Stopwatch3D key={o.id} o={o} colors={colors} selected={selectedId === o.id} /> : null))}
      <Ghost />
      <Interaction />
      <ClockDriver />
      <CameraRig />
      {!colors.highContrast && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={colors.dark ? 0.55 : 0.25} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
          <Vignette offset={0.32} darkness={colors.dark ? 0.5 : 0.25} />
        </EffectComposer>
      )}
    </>
  );
}

export default function TableCanvas({ colors }: { colors: ThemeColors }) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ position: [-1.5, 1.25, 2.3], fov: 42, near: 0.02, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = colors.dark ? 1.0 : 1.05;
      }}
      onPointerMissed={(e) => {
        if (e.button === 0 && !useLab.getState().placing && performance.now() - pointer.placedAt > 400) useLab.getState().select(null);
      }}
      className="!absolute inset-0"
      aria-label="3D lab table. Drag empty space to orbit, right-drag to pan, scroll or pinch to zoom."
    >
      <Scene colors={colors} />
    </Canvas>
  );
}

