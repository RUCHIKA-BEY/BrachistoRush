import type { RacerId } from "./physics/types";

export type Shape = "circle" | "square" | "triangle" | "diamond" | "star" | "hexagon";

export interface RacerMeta {
  id: RacerId;
  name: string;
  short: string;
  cssVar: string;
  twText: string;
  twBg: string;
  shape: Shape;
  symbol: string;
  description: string;
}

export const RACERS: Record<RacerId, RacerMeta> = {
  cycloid: { id: "cycloid", name: "Cycloid", short: "Cycloid", cssVar: "--c-cycloid", twText: "text-cycloid", twBg: "bg-cycloid", shape: "circle", symbol: "●", description: "The brachistochrone: drops steeply first, then glides." },
  straight: { id: "straight", name: "Straight line", short: "Straight", cssVar: "--c-straight", twText: "text-straight", twBg: "bg-straight", shape: "square", symbol: "■", description: "The shortest distance from A to B." },
  arc: { id: "arc", name: "Circular arc", short: "Arc", cssVar: "--c-arc", twText: "text-arc", twBg: "bg-arc", shape: "triangle", symbol: "▲", description: "Part of a circle — Galileo's guess (1638)." },
  parabola: { id: "parabola", name: "Parabola", short: "Parabola", cssVar: "--c-parabola", twText: "text-parabola", twBg: "bg-parabola", shape: "diamond", symbol: "◆", description: "A sideways parabola that also starts vertically." },
  frictionOpt: { id: "frictionOpt", name: "Friction-tuned curve", short: "Tuned", cssVar: "--c-friction", twText: "text-friction", twBg: "bg-friction", shape: "hexagon", symbol: "⬢", description: "A cycloid-family curve re-tuned by the computer for the current friction." },
  custom: { id: "custom", name: "Your path", short: "Yours", cssVar: "--c-custom", twText: "text-custom", twBg: "bg-custom", shape: "star", symbol: "★", description: "The curve you drew yourself." },
};

export const RACER_ORDER: RacerId[] = ["cycloid", "straight", "arc", "parabola", "frictionOpt", "custom"];

export interface GravityPreset {
  key: string;
  label: string;
  g: number;
  emoji: string;
}

export const GRAVITY: GravityPreset[] = [
  { key: "earth", label: "Earth", g: 9.81, emoji: "🌍" },
  { key: "moon", label: "Moon", g: 1.62, emoji: "🌙" },
  { key: "mars", label: "Mars", g: 3.71, emoji: "🔴" },
  { key: "jupiter", label: "Jupiter", g: 24.79, emoji: "🪐" },
];
