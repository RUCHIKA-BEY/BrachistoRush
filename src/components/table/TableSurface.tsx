"use client";

import { useMemo } from "react";
import { TABLE } from "@/lib/lab3d/types";
import type { ThemeColors } from "@/lib/useThemeColors";
import { fontStack, matTexture } from "./textures";

/** The lab table: cutting-mat top with a grid and ruler, solid edge, legs and a floor for shadows. */
export function TableSurface({ colors }: { colors: ThemeColors }) {
  const dark = colors.dark;
  const mat = useMemo(
    () =>
      matTexture(
        dark ? "#0c1a2b" : "#e6edf3",
        dark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.10)",
        dark ? "rgba(45,212,191,0.28)" : "rgba(13,148,136,0.35)",
        dark ? "rgba(203,213,225,0.7)" : "rgba(15,23,42,0.65)",
        fontStack(colors["--font-grotesk"]),
      ),
    [dark, colors],
  );
  const edge = dark ? "#1e293b" : "#94a3b8";
  const leg = dark ? "#0f172a" : "#64748b";
  const lx = TABLE.width / 2 - 0.12;
  const lz = TABLE.depth / 2 - 0.12;
  return (
    <group>
      <mesh position={[0, -TABLE.thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[TABLE.width + 0.06, TABLE.thickness, TABLE.depth + 0.06]} />
        <meshStandardMaterial color={edge} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0006, 0]} receiveShadow>
        <planeGeometry args={[TABLE.width, TABLE.depth]} />
        <meshStandardMaterial map={mat} roughness={0.85} metalness={0} />
      </mesh>
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -TABLE.thickness - TABLE.legHeight / 2, z]} castShadow>
          <boxGeometry args={[0.07, TABLE.legHeight, 0.07]} />
          <meshStandardMaterial color={leg} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TABLE.thickness - TABLE.legHeight, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={dark ? "#030a18" : "#cbd5e1"} roughness={1} />
      </mesh>
    </group>
  );
}
