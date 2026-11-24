"use client";

import { useEffect, useRef, useState } from "react";

const VARS = [
  "--bg",
  "--surface",
  "--surface-soft",
  "--text",
  "--text-2",
  "--muted",
  "--border",
  "--primary",
  "--primary-soft",
  "--secondary",
  "--secondary-soft",
  "--c-cycloid",
  "--c-straight",
  "--c-arc",
  "--c-parabola",
  "--c-custom",
  "--c-friction",
  "--c-velocity",
  "--c-ke",
  "--c-pe",
  "--c-trail",
  "--c-finish",
  "--grid",
  "--grid-strong",
  "--font-inter",
  "--font-grotesk",
  "--font-jetbrains",
] as const;

export type ThemeColors = Record<(typeof VARS)[number], string> & { highContrast: boolean; dark: boolean };

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string | boolean> = {};
  for (const v of VARS) out[v] = cs.getPropertyValue(v).trim();
  out.highContrast = document.documentElement.dataset.contrast === "high";
  out.dark = document.documentElement.dataset.theme !== "light";
  return out as ThemeColors;
}

/** Theme tokens for canvas / WebGL drawing. Returns a ref (for rAF loops) and state (for React). */
export function useThemeColors() {
  const ref = useRef<ThemeColors | null>(null);
  const [colors, setColors] = useState<ThemeColors | null>(null);
  useEffect(() => {
    const update = () => {
      // wait one frame so attribute changes have applied
      requestAnimationFrame(() => {
        const c = read();
        ref.current = c;
        setColors(c);
      });
    };
    update();
    window.addEventListener("br:theme", update);
    return () => window.removeEventListener("br:theme", update);
  }, []);
  return { colorsRef: ref, colors };
}

/** Add alpha to a #rrggbb colour. */
export function alpha(hex: string, a: number): string {
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) return hex;
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
