"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clock } from "@/lib/lab3d/clock";
import { useLab } from "@/lib/lab3d/store";
import { TRACKS, type StopwatchObj, type TrackObj } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { startMove, startRotate } from "./interaction";
import { fontStack } from "./textures";
import { RotateRing } from "./TrackModel";

const R = 0.07;

/** A desk stopwatch that shows the experiment clock and each finisher's time. */
export function Stopwatch3D({ o, colors, selected }: { o: StopwatchObj; colors: ThemeColors; selected: boolean }) {
  const status = useLab((s) => s.status);
  const font = fontStack(colors["--font-jetbrains"]);
  const label = fontStack(colors["--font-grotesk"]);
  const face = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { ctx: cv.getContext("2d")!, tex };
  }, []);
  const last = useRef("");

  useFrame(() => {
    const st = useLab.getState();
    const t = st.status === "idle" ? 0 : Math.min(clock.t, st.duration);
    const laps = Object.values(st.runs)
      .filter((r) => r.sim.finishTime !== null && clock.t >= r.sim.finishTime)
      .sort((a, b) => (a.sim.finishTime ?? 0) - (b.sim.finishTime ?? 0))
      .slice(0, 4)
      .map((r) => {
        const tr = st.objects.find((q): q is TrackObj => q.id === r.trackId && q.type === "track");
        return { c: tr ? (colors[TRACKS[tr.shape].cssVar as keyof ThemeColors] as string) : "#fff", name: tr ? TRACKS[tr.shape].label : "?", t: r.sim.finishTime! };
      });
    const mode = st.status === "running" ? "RUNNING" : st.status === "paused" ? "FROZEN" : st.status === "finished" ? "FINISHED" : "READY";
    const key = `${t.toFixed(3)}|${mode}|${laps.length}`;
    if (key === last.current) return;
    last.current = key;
    const c = face.ctx;
    c.clearRect(0, 0, 512, 512);
    c.fillStyle = "#0b1220";
    c.beginPath();
    c.arc(256, 256, 252, 0, Math.PI * 2);
    c.fill();
    // second-hand dial
    c.strokeStyle = "rgba(148,163,184,0.5)";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = i % 5 === 0 ? 212 : 226;
      c.lineWidth = i % 5 === 0 ? 5 : 2;
      c.beginPath();
      c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0);
      c.lineTo(256 + Math.sin(a) * 240, 256 - Math.cos(a) * 240);
      c.stroke();
    }
    const a = ((t % 1) / 1) * Math.PI * 2; // one sweep per second
    c.strokeStyle = "#fb7185";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(256, 256);
    c.lineTo(256 + Math.sin(a) * 205, 256 - Math.cos(a) * 205);
    c.stroke();
    // LCD window
    c.fillStyle = "rgba(2,6,23,0.92)";
    c.beginPath();
    c.roundRect(96, 150, 320, 120, 18);
    c.fill();
    c.fillStyle = mode === "FROZEN" ? "#a5b4fc" : "#5eead4";
    c.font = `700 76px ${font}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(t.toFixed(3), 256, 214);
    c.font = `700 22px ${label}`;
    c.fillStyle = "rgba(203,213,225,0.85)";
    c.fillText(`${mode} · seconds`, 256, 128);
    laps.forEach((l, i) => {
      const y = 300 + i * 34;
      c.fillStyle = l.c;
      c.beginPath();
      c.arc(150, y, 9, 0, Math.PI * 2);
      c.fill();
      c.textAlign = "left";
      c.font = `600 24px ${label}`;
      c.fillStyle = "#e2e8f0";
      c.fillText(l.name, 168, y);
      c.textAlign = "right";
      c.font = `700 24px ${font}`;
      c.fillText(l.t.toFixed(3), 372, y);
      c.textAlign = "center";
    });
    face.tex.needsUpdate = true;
  });

  const editing = status === "idle" || status === "finished";
  return (
    <group position={[o.x, 0, o.z]} rotation={[0, o.rot, 0]}>
      <group onPointerDown={(e) => startMove(e, o.id, o.x, o.z)} onPointerOver={() => (document.body.style.cursor = editing ? "grab" : "")} onPointerOut={() => (document.body.style.cursor = "")}>
        {/* stand */}
        <RoundedBox args={[0.13, 0.02, 0.08]} radius={0.008} position={[0, 0.01, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
        </RoundedBox>
        <group position={[0, 0.02 + R, 0]} rotation={[-0.22, 0, 0]}>
          {/* case */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[R, R, 0.026, 64]} />
            <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0135]}>
            <torusGeometry args={[R - 0.003, 0.004, 12, 64]} />
            <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.12} />
          </mesh>
          {/* face */}
          <mesh position={[0, 0, 0.0136]}>
            <circleGeometry args={[R - 0.006, 64]} />
            <meshBasicMaterial map={face.tex} toneMapped={false} />
          </mesh>
          {/* crown + buttons */}
          <mesh position={[0, R + 0.012, 0]} castShadow>
            <cylinderGeometry args={[0.009, 0.009, 0.022, 20]} />
            <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, R + 0.028, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.012, 0.003, 10, 24]} />
            <meshStandardMaterial color="#e2e8f0" metalness={1} roughness={0.2} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * R * 0.62, R * 0.8, 0]} rotation={[0, 0, -s * 0.65]}>
              <cylinderGeometry args={[0.006, 0.006, 0.018, 16]} />
              <meshStandardMaterial color={s < 0 ? "#fb7185" : "#2dd4bf"} metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </group>
      {selected && editing && <RotateRing radius={0.12} color={colors["--secondary-soft"] || "#a5b4fc"} onDown={(e) => startRotate(e, o.id, o.x, o.z, o.rot)} />}
    </group>
  );
}
