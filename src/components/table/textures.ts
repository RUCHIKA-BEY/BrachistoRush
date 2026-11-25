import * as THREE from "three";
import { TABLE } from "@/lib/lab3d/types";

/** Font stack from the page's CSS variables (falls back to system fonts inside canvases). */
export function fontStack(colorsFont?: string) {
  return colorsFont ? `${colorsFont}, ui-sans-serif, system-ui, sans-serif` : "ui-sans-serif, system-ui, sans-serif";
}

/** A pill label drawn to a canvas texture (cheap, no extra React roots). */
export function pillTexture(text: string, fg: string, bg: string, font: string) {
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d")!;
  ctx.font = `700 44px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width) + 48;
  cv.width = w;
  cv.height = 72;
  ctx.font = `700 44px ${font}`;
  ctx.fillStyle = bg;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, 66, 33);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / 72 };
}

/** The table's cutting-mat surface: 5 cm grid, 50 cm major lines, metre labels. */
export function matTexture(base: string, minor: string, major: string, label: string, font: string) {
  const ppm = 600; // pixels per metre
  const cv = document.createElement("canvas");
  cv.width = Math.round(TABLE.width * ppm);
  cv.height = Math.round(TABLE.depth * ppm);
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, cv.width, cv.height);
  const line = (step: number, color: string, w: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let x = 0; x <= cv.width + 1; x += step * ppm) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cv.height);
    }
    for (let y = 0; y <= cv.height + 1; y += step * ppm) {
      ctx.moveTo(0, y);
      ctx.lineTo(cv.width, y);
    }
    ctx.stroke();
  };
  line(0.05, minor, 1.5);
  line(0.5, major, 3);
  // ruler ticks along the front edge
  ctx.fillStyle = label;
  ctx.font = `600 26px ${font}`;
  ctx.textAlign = "center";
  for (let cm = 0; cm <= TABLE.width * 100; cm += 1) {
    const x = (cm / 100) * ppm;
    const len = cm % 10 === 0 ? 34 : cm % 5 === 0 ? 22 : 12;
    ctx.fillRect(x - 1, cv.height - len, 2, len);
    if (cm % 50 === 0 && cm > 0 && cm < TABLE.width * 100) ctx.fillText(`${(cm / 100).toFixed(1)} m`, x, cv.height - 46);
  }
  ctx.font = `700 34px ${font}`;
  ctx.textAlign = "left";
  ctx.globalAlpha = 0.55;
  ctx.fillText("BRACHISTORUSH LAB", 30, 54);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Subtle markings so a rolling ball's spin is visible. */
export function ballTexture(base: string, mark: string) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 128;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = mark;
  ctx.fillRect(0, 58, 256, 12); // equator band
  for (const [x, y] of [
    [64, 28],
    [192, 28],
    [128, 100],
    [0, 100],
    [256, 100],
  ])
    ctx.beginPath(), ctx.arc(x, y, 9, 0, Math.PI * 2), ctx.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
