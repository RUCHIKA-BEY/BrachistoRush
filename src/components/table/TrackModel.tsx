"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clock } from "@/lib/lab3d/clock";
import { useLab } from "@/lib/lab3d/store";
import { DEFAULT_HANDLES, frameOf, localAt, trackPath } from "@/lib/lab3d/tracks";
import { BALLS, BOARD, TRACKS, type BallObj, type TrackObj } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { BallOnTrack } from "./Balls";
import { startHandle, startMove, startRotate } from "./interaction";
import { fontStack, pillTexture } from "./textures";
import { STRIP, trackGeometry } from "./trackGeometry";

function Tag({ text, color, bg, font, position, h = 0.04 }: { text: string; color: string; bg: string; font: string; position: [number, number, number]; h?: number }) {
  const t = useMemo(() => pillTexture(text, color, bg, font), [text, color, bg, font]);
  return (
    <sprite position={position} scale={[h * t.aspect, h, 1]} renderOrder={10}>
      <spriteMaterial map={t.tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

/** Ring on the table around the selected part: drag it to turn the part. */
export function RotateRing({ radius, onDown, color }: { radius: number; onDown: (e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void; color: string }) {
  return (
    <group position={[0, 0.003, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onDown}>
        <ringGeometry args={[radius - 0.022, radius + 0.022, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.004, radius + 0.004, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* grip knob */}
      <mesh position={[radius, 0.012, 0]} onPointerDown={onDown}>
        <sphereGeometry args={[0.024, 20, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export function TrackModel({ t, balls, colors, selected, selectedId }: { t: TrackObj; balls: BallObj[]; colors: ThemeColors; selected: boolean; selectedId: string | null }) {
  const clear = useLab((s) => s.settings.clearBoards);
  const status = useLab((s) => s.status);
  const path = useMemo(() => trackPath(t), [t]);
  const geo = useMemo(() => trackGeometry(path, t.W), [path, t.W]);
  const fr = frameOf(path, t.W);
  const color = colors[TRACKS[t.shape].cssVar as keyof ThemeColors] as string;
  const font = fontStack(colors["--font-grotesk"]);
  const dark = colors.dark;
  const hc = colors.highContrast;

  const A = localAt(path, t.W, 0);
  const B = localAt(path, t.W, path.length);
  const occupant = balls[0];
  const r = occupant ? BALLS[occupant.kind].radius : BALLS.steel.radius;

  // start gate: a small plate just ahead of the ball that slides out sideways on release
  const gate = useRef<THREE.Mesh>(null);
  const gateAt = localAt(path, t.W, r + 0.006);
  useFrame((_, dt) => {
    const m = gate.current;
    if (!m) return;
    const open = useLab.getState().status !== "idle";
    const target = open ? 0.085 : 0;
    m.position.z += (target - m.position.z) * Math.min(1, dt * 18);
  });

  // finish time for the ball on this track, once it has crossed B
  const finishTime = useLab((s) => {
    const run = occupant ? s.runs[occupant.id] : undefined;
    return run && run.trackId === t.id ? run.sim.finishTime : null;
  });
  const showFinish = useRef<THREE.Group>(null);
  useFrame(() => {
    if (showFinish.current) showFinish.current.visible = finishTime !== null && clock.t >= finishTime;
  });

  const boardMat = clear ? (
    <meshPhysicalMaterial color={dark ? "#94a3b8" : "#cbd5e1"} transparent opacity={0.16} roughness={0.08} metalness={0} clearcoat={1} depthWrite={false} />
  ) : (
    <meshPhysicalMaterial
      color={dark ? "#1b2a40" : "#aebdcd"}
      roughness={0.42}
      metalness={0.05}
      clearcoat={0.5}
      clearcoatRoughness={0.3}
      emissive={selected ? (colors["--secondary"] as string) : "#000000"}
      emissiveIntensity={selected ? 0.12 : 0}
    />
  );

  return (
    <group position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]}>
      <group
        onPointerDown={(e) => startMove(e, t.id, t.x, t.z)}
        onPointerOver={() => (document.body.style.cursor = status === "idle" || status === "finished" ? "grab" : "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <mesh geometry={geo.board} castShadow={!clear} receiveShadow renderOrder={clear ? 5 : 0}>
          {boardMat}
        </mesh>
        <mesh geometry={geo.strip}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hc ? 0 : dark ? 0.85 : 0.35} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        {geo.lips.map((g, i) => (
          <mesh key={i} geometry={g} castShadow>
            <meshStandardMaterial color={dark ? "#cbd5e1" : "#94a3b8"} metalness={0.95} roughness={0.22} />
          </mesh>
        ))}
        {geo.feet.map((f, i) => (
          <mesh key={i} position={[f.x, 0.008, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 0.016, 0.2]} />
            <meshStandardMaterial color={dark ? "#334155" : "#64748b"} metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        {/* start gate */}
        <group position={[gateAt.x + gateAt.nx * (r + STRIP.lift), gateAt.y + gateAt.ny * (r + STRIP.lift), 0]} rotation={[0, 0, Math.atan2(gateAt.ty, gateAt.tx)]}>
          <mesh ref={gate} castShadow>
            <boxGeometry args={[0.004, 2 * r + 0.012, 0.07]} />
            <meshStandardMaterial color={colors["--c-friction"]} metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
        {/* end stop at B */}
        <group position={[B.x + B.tx * (r + 0.008) + B.nx * 0.018, B.y + B.ty * (r + 0.008) + B.ny * 0.018, 0]} rotation={[0, 0, Math.atan2(B.ty, B.tx)]}>
          <mesh castShadow>
            <boxGeometry args={[0.014, 0.045, BOARD.thickness + 0.012]} />
            <meshStandardMaterial color={dark ? "#e2e8f0" : "#334155"} metalness={0.7} roughness={0.25} />
          </mesh>
        </group>
      </group>

      <Tag text="A" color={color} bg={dark ? "rgba(2,6,23,0.8)" : "rgba(255,255,255,0.9)"} font={font} position={[A.x - 0.05, A.y + 0.07, 0]} />
      <Tag text="B" color={color} bg={dark ? "rgba(2,6,23,0.8)" : "rgba(255,255,255,0.9)"} font={font} position={[B.x + 0.05, B.y + 0.09, 0]} />
      <group ref={showFinish} visible={false}>
        {finishTime !== null && <Tag text={`${finishTime.toFixed(3)} s`} color={color} bg="rgba(2,6,23,0.85)" font={font} position={[B.x, B.y + 0.17, 0]} h={0.05} />}
      </group>

      {balls.map((b) => (
        <BallOnTrack key={b.id} ball={b} track={t} colors={colors} selected={selectedId === b.id} />
      ))}

      {selected && (status === "idle" || status === "finished") && (
        <>
          <RotateRing radius={t.W / 2 + 0.12} color={colors["--secondary-soft"] || "#a5b4fc"} onDown={(e) => startRotate(e, t.id, t.x, t.z, t.rot)} />
          {t.shape === "custom" &&
            (t.handles ?? DEFAULT_HANDLES).map(([u, d], i) => (
              <mesh
                key={i}
                position={[fr.lx(u * t.W), fr.ly(d * t.H), 0]}
                userData={{ onTop: true }}
                onPointerDown={(e) => startHandle(e, t, i)}
                onPointerOver={() => (document.body.style.cursor = "move")}
                onPointerOut={() => (document.body.style.cursor = "")}
                renderOrder={30}
              >
                <sphereGeometry args={[0.03, 20, 14]} />
                <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} toneMapped={false} />
              </mesh>
            ))}
        </>
      )}
    </group>
  );
}
