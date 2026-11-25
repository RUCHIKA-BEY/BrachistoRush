"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clock } from "@/lib/lab3d/clock";
import { inspectAt, type Inspect } from "@/lib/lab3d/physics";
import { focusBallId, useLab } from "@/lib/lab3d/store";
import { frameOf, trackPath } from "@/lib/lab3d/tracks";
import { BALLS, TRACKS, type BallObj, type TrackObj } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { fontStack, pillTexture } from "./textures";
import { STRIP } from "./trackGeometry";

const HEAD = 0.026;
const SCALE_V = 0.07; // metres of arrow per m/s
const SCALE_F = 0.1; // arrow length of the ball's weight

/** Unlit, always-on-top material so arrows stay readable through boards. */
function overlayMat(color: string, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity, toneMapped: false });
}

function Arrow({ color, label, font, set }: { color: string; label: string; font: string; set: (g: THREE.Group | null) => void }) {
  const mat = useMemo(() => overlayMat(color), [color]);
  const tag = useMemo(() => pillTexture(label, color, "rgba(2,6,23,0.85)", font), [label, color, font]);
  return (
    <group ref={set} visible={false} renderOrder={20}>
      <mesh material={mat} position={[0, 0.5, 0]} renderOrder={20}>
        <cylinderGeometry args={[0.0035, 0.0035, 1, 8]} />
      </mesh>
      <mesh material={mat} renderOrder={20}>
        <coneGeometry args={[0.011, HEAD, 14]} />
      </mesh>
      <sprite scale={[0.024 * tag.aspect, 0.024, 1]} renderOrder={21}>
        <spriteMaterial map={tag.tex} depthTest={false} transparent toneMapped={false} />
      </sprite>
    </group>
  );
}

/** Point a unit arrow (built along +y) from (ox, oy) in direction (dx, dy) with the given length. */
function aim(g: THREE.Group | null, ox: number, oy: number, dx: number, dy: number, len: number) {
  if (!g) return;
  if (!(len > 0.006)) {
    g.visible = false;
    return;
  }
  g.visible = true;
  g.position.set(ox, oy, 0);
  g.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2);
  const [shaft, head, tag] = g.children;
  const body = Math.max(0.001, len - HEAD);
  shaft.scale.set(1, body, 1);
  shaft.position.y = body / 2;
  head.position.y = body + HEAD / 2;
  tag.position.y = len + 0.02;
  tag.rotation.set(0, 0, 0);
}

function drawCard(ctx: CanvasRenderingContext2D, d: Inspect, title: string, accent: string, font: string, mu: number) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(2,6,23,0.88)";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(3, 3, W - 6, H - 6, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `700 30px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillText(title, 26, 22);
  const rows: [string, string, string?][] = [
    ["time", `${d.t.toFixed(3)} s`],
    ["speed v", `${d.v.toFixed(2)} m/s`, "#fbbf24"],
    ["height h", `${d.h.toFixed(3)} m`, "#38bdf8"],
    ["PE = mgh", `${d.PE.toFixed(3)} J`, "#38bdf8"],
    ["KE (move + spin)", `${d.KE.toFixed(3)} J`, "#fbbf24"],
    ...(mu > 0 ? ([["friction", `${d.friction.toFixed(3)} N`, "#fb7185"]] as [string, string, string][]) : []),
    ["position s", `${d.s.toFixed(2)} / ${d.length.toFixed(2)} m  (${Math.round((d.s / d.length) * 100)}%)`],
  ];
  let y = 70;
  for (const [k, v, c] of rows) {
    ctx.font = `500 25px ${font}`;
    ctx.fillStyle = "rgba(203,213,225,0.8)";
    ctx.fillText(k, 26, y);
    ctx.font = `700 26px ${font}`;
    ctx.fillStyle = c ?? "#f8fafc";
    ctx.textAlign = "right";
    ctx.fillText(v, W - 26, y);
    ctx.textAlign = "left";
    y += 36;
  }
}

/** Freeze-time view: velocity / force arrows, height line, energy bars and a data card, all attached to the ball. */
export function InspectOverlay({ ball, track, colors, selected }: { ball: BallObj; track: TrackObj; colors: ThemeColors; selected: boolean }) {
  const font = fontStack(colors["--font-grotesk"]);
  const accent = colors[TRACKS[track.shape].cssVar as keyof ThemeColors] as string;
  const path = trackPath(track);
  const fr = frameOf(path, track.W);
  const r = BALLS[ball.kind].radius;

  const root = useRef<THREE.Group>(null);
  const arrows = useRef<(THREE.Group | null)[]>([]);
  const hLine = useRef<THREE.Mesh>(null);
  const board = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const lastKey = useRef("");

  const card = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 600;
    cv.height = 360;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { cv, ctx: cv.getContext("2d")!, tex };
  }, []);
  const mini = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 300;
    cv.height = 72;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { ctx: cv.getContext("2d")!, tex };
  }, []);
  const miniSprite = useRef<THREE.Sprite>(null);
  const barMats = useMemo(() => [overlayMat(colors["--c-pe"]), overlayMat(colors["--c-ke"]), overlayMat(colors["--c-friction"]), overlayMat("#0f172a", 0.75)], [colors]);
  const barTags = useMemo(() => pillTexture("PE · KE · heat", "#e2e8f0", "rgba(2,6,23,0.85)", font), [font]);
  const lineMat = useMemo(() => overlayMat(colors["--c-pe"], 0.7), [colors]);

  const title = `${BALLS[ball.kind].short} ball · ${TRACKS[track.shape].label}`.replace("Bead ball", "Bead");

  useFrame(() => {
    const st = useLab.getState();
    const run = st.runs[ball.id];
    const frozen = st.status === "paused" || (st.status === "finished" && clock.t < st.duration - 1e-4);
    const live = st.settings.liveForces && st.status === "running";
    const g = root.current;
    if (!g) return;
    if (!run || run.trackId !== track.id || !(frozen || live)) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const d = inspectAt(run, clock.t);
    const off = r + STRIP.lift;
    const cx = d.p.x + d.p.nx * off;
    const cy = d.p.y + d.p.ny * off;
    const k = SCALE_F / d.weight;

    aim(arrows.current[0], cx, cy, d.p.tx, d.p.ty, Math.min(0.4, d.v * SCALE_V));
    aim(arrows.current[1], cx, cy, 0, -1, SCALE_F);
    aim(arrows.current[2], cx, cy, d.p.nx * d.nSign, d.p.ny * d.nSign, Math.min(0.3, d.N * k));
    aim(arrows.current[3], cx, cy, -d.p.tx, -d.p.ty, Math.min(0.3, d.friction * k));

    // vertical line from the ball down to the track's lowest level (the zero of PE)
    const base = fr.ly(path.maxDepth);
    if (hLine.current) {
      const hh = Math.max(0.0005, cy - base);
      hLine.current.scale.set(1, hh, 1);
      hLine.current.position.set(cx, base + hh / 2, 0);
    }

    // card + energy bars only for the focused ball while time is frozen; other balls get a speed tag
    const focus = focusBallId(st) === ball.id;
    if (board.current) {
      board.current.visible = frozen && focus;
      board.current.position.set(cx, cy + 0.17, 0);
    }
    if (miniSprite.current) {
      miniSprite.current.visible = frozen && !focus;
      miniSprite.current.position.set(cx, cy + 0.07, 0);
    }
    if (frozen && !focus) {
      const key = `m${d.v.toFixed(2)}`;
      if (key !== lastKey.current) {
        lastKey.current = key;
        const c = mini.ctx;
        c.clearRect(0, 0, 300, 72);
        c.fillStyle = "rgba(2,6,23,0.85)";
        c.strokeStyle = accent;
        c.lineWidth = 4;
        c.beginPath();
        c.roundRect(3, 3, 294, 66, 33);
        c.fill();
        c.stroke();
        c.fillStyle = "#fbbf24";
        c.font = `700 36px ${font}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(`v = ${d.v.toFixed(2)} m/s`, 150, 38);
        mini.tex.needsUpdate = true;
      }
    }
    if (frozen && focus) {
      const fr3 = [d.PE / d.E0, d.KE / d.E0, d.heat / d.E0];
      fr3.forEach((f, i) => {
        const m = bars.current[i];
        if (!m) return;
        const h = Math.max(0.0008, 0.11 * Math.min(1, f));
        m.scale.set(0.022, h, 1);
        m.position.y = -0.06 + h / 2;
      });
      const key = `${d.t.toFixed(4)}|${st.settings.mu}`;
      if (key !== lastKey.current) {
        lastKey.current = key;
        drawCard(card.ctx, d, title, accent, font, st.settings.mu);
        card.tex.needsUpdate = true;
      }
    }
  });

  const arrowSpec: [string, string][] = [
    [colors["--c-velocity"], "v"],
    ["#e2e8f0", "mg"],
    [colors["--secondary-soft"] || "#a5b4fc", "N"],
    [colors["--c-friction"], "f"],
  ];

  return (
    <group ref={root} visible={false}>
      {arrowSpec.map(([c, l], i) => (
        <Arrow key={l} color={c} label={l} font={font} set={(g) => void (arrows.current[i] = g)} />
      ))}
      <sprite ref={miniSprite} scale={[0.125, 0.03, 1]} renderOrder={22} visible={false}>
        <spriteMaterial map={mini.tex} depthTest={false} transparent toneMapped={false} />
      </sprite>
      <mesh ref={hLine} material={lineMat} renderOrder={19}>
        <cylinderGeometry args={[0.0018, 0.0018, 1, 6]} />
      </mesh>
      <group ref={board}>
        <Billboard>
          {/* energy bars, left */}
          <mesh position={[-0.12, -0.005, -0.001]} material={barMats[3]} renderOrder={18}>
            <planeGeometry args={[0.11, 0.15]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} ref={(m) => void (bars.current[i] = m)} position={[-0.152 + i * 0.032, -0.06, 0]} material={barMats[i]} renderOrder={21}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          ))}
          <sprite position={[-0.12, -0.072, 0]} scale={[0.017 * barTags.aspect, 0.017, 1]} renderOrder={22}>
            <spriteMaterial map={barTags.tex} depthTest={false} transparent toneMapped={false} />
          </sprite>
          {/* data card, right */}
          <mesh position={[0.07, 0, 0]} renderOrder={22}>
            <planeGeometry args={[0.24, 0.144]} />
            <meshBasicMaterial map={card.tex} transparent depthTest={false} depthWrite={false} toneMapped={false} opacity={selected ? 1 : 0.92} />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}
