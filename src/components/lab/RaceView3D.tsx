"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PathGeometry, RacerId } from "@/lib/physics/types";
import { RACERS } from "@/lib/racers";
import type { ThemeColors } from "@/lib/useThemeColors";
import { racerStateAt, type RaceApi } from "./useRace";

interface Props {
  api: RaceApi;
  colors: ThemeColors;
  focus: RacerId;
}

const LANE = 0.32;

/** Text label drawn to a canvas texture (no extra React roots). */
function Label({ text, color, bg, position }: { text: string; color: string; bg: string; position: [number, number, number] }) {
  const material = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "600 30px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  }, [text, color, bg]);
  return <sprite material={material} position={position} scale={[0.5, 0.125, 1]} />;
}

function Track({ g, z, ox, oy, floorY, color, hero }: { g: PathGeometry; z: number; ox: number; oy: number; floorY: number; color: string; hero: boolean }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const step = Math.max(1, Math.floor(g.n / 160));
    for (let i = 0; i < g.n; i += step) pts.push(new THREE.Vector3(g.x[i] - ox, -g.y[i] + oy, z));
    pts.push(new THREE.Vector3(g.x[g.n - 1] - ox, -g.y[g.n - 1] + oy, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    return new THREE.TubeGeometry(curve, 240, hero ? 0.028 : 0.02, 10, false);
  }, [g, z, ox, oy, hero]);

  // support posts every ~0.4 m
  const posts = useMemo(() => {
    const out: { x: number; top: number }[] = [];
    const every = Math.max(1, Math.round(0.4 / g.ds));
    for (let i = every; i < g.n - 1; i += every) out.push({ x: g.x[i] - ox, top: -g.y[i] + oy });
    return out;
  }, [g, ox, oy]);

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hero ? 0.6 : 0.18} roughness={0.35} metalness={0.2} />
      </mesh>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, (p.top + floorY) / 2, z]}>
          <cylinderGeometry args={[0.006, 0.006, Math.max(0.001, p.top - floorY), 6]} />
          <meshStandardMaterial color={color} transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ api, colors, focus }: Props) {
  const showingRace = api.phase !== "idle" && api.race;
  const race = showingRace ? api.race : null;
  const geoms = race ? race.geoms : api.geoms;
  const W = race ? race.settings.W : api.settings.W;
  const H = race ? race.settings.H : api.settings.H;
  const depth = Math.max(H, ...geoms.map((g) => g.maxDepth));
  const ox = W / 2;
  const oy = depth / 2;
  const floorY = -depth + oy - 0.06;
  const lanes = geoms.map((_, i) => (i - (geoms.length - 1) / 2) * LANE);

  const ballRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
  const col = (id: RacerId) => colors[RACERS[id].cssVar as keyof ThemeColors] as string;

  useFrame(() => {
    const t = api.clockRef.current.t;
    geoms.forEach((g, i) => {
      const m = ballRefs.current[i];
      if (!m) return;
      let x = g.x[0];
      let y = g.y[0];
      if (race) {
        const st = racerStateAt(race, i, t);
        x = st.x;
        y = st.y;
      }
      m.position.set(x - ox, -y + oy + 0.045, lanes[i]);
      if (g.id === "cycloid" && lightRef.current) lightRef.current.position.copy(m.position);
    });
  });

  const halfSpan = ((geoms.length - 1) / 2) * LANE + 0.25;
  return (
    <>
      <color attach="background" args={[colors["--bg"]]} />
      <fog attach="fog" args={[colors["--bg"], 6, 14]} />
      <ambientLight intensity={colors.dark ? 0.5 : 0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <pointLight ref={lightRef} color={colors["--c-cycloid"]} intensity={colors.highContrast ? 0 : 2.5} distance={1.6} />

      <gridHelper args={[12, 48, colors["--secondary"], colors.dark ? "#1e293b" : "#cbd5e1"]} position={[0, floorY, 0]} />

      {geoms.map((g, i) => (
        <group key={g.id}>
          <Track g={g} z={lanes[i]} ox={ox} oy={oy} floorY={floorY} color={col(g.id)} hero={g.id === "cycloid" || g.id === focus} />
          <mesh ref={(m) => void (ballRefs.current[i] = m)}>
            <sphereGeometry args={[g.id === "cycloid" ? 0.06 : 0.05, 24, 24]} />
            <meshStandardMaterial color={col(g.id)} emissive={col(g.id)} emissiveIntensity={g.id === "cycloid" ? 0.9 : 0.35} roughness={0.25} />
          </mesh>
          <Label text={`${RACERS[g.id].symbol} ${RACERS[g.id].short}`} color={col(g.id)} bg={colors["--surface"]} position={[-ox - 0.3, oy + 0.02, lanes[i]]} />
        </group>
      ))}

      {/* start platform */}
      <mesh position={[-ox - 0.06, oy + 0.02, 0]}>
        <boxGeometry args={[0.12, 0.04, halfSpan * 2]} />
        <meshStandardMaterial color={colors["--secondary"]} transparent opacity={0.6} />
      </mesh>
      {/* finish gate */}
      <group position={[W - ox, -H + oy, 0]}>
        {[-halfSpan, halfSpan].map((z) => (
          <mesh key={z} position={[0, 0.25, z]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
            <meshStandardMaterial color={colors["--c-finish"]} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.03, 0.06, halfSpan * 2]} />
          <meshStandardMaterial color={colors["--c-finish"]} emissive={colors["--c-finish"]} emissiveIntensity={0.3} />
        </mesh>
      </group>

      <OrbitControls makeDefault enableDamping target={[0, 0, 0]} minDistance={1.2} maxDistance={9} />
    </>
  );
}

export default function RaceView3D(props: Props) {
  return (
    <Canvas camera={{ position: [-1.3, 0.85, 2.3], fov: 45 }} dpr={[1, 2]} className="!absolute inset-0 rounded-[inherit]" aria-label="3D view of the race track. Drag to orbit, scroll or pinch to zoom.">
      <Scene {...props} />
    </Canvas>
  );
}
