"use client";

import { useEffect, useRef } from "react";
import type { PathGeometry, RacerId, Vec2 } from "@/lib/physics/types";
import { RACERS } from "@/lib/racers";
import { alpha, useThemeColors, type ThemeColors } from "@/lib/useThemeColors";
import { drawShape } from "./shapes";
import { clampEnd, racerStateAt, type RaceApi } from "./useRace";

export interface DisplayOptions {
  vectors: boolean;
  trails: boolean;
  ghost: boolean;
  labels: boolean;
}

interface Props {
  api: RaceApi;
  show: DisplayOptions;
  drawMode: boolean;
  onDrawn: (pts: Vec2[]) => void;
  focus: RacerId;
}

interface View {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const LABEL_FRACTION: Record<RacerId, number> = { cycloid: 0.55, straight: 0.3, arc: 0.72, parabola: 0.4, frictionOpt: 0.82, custom: 0.47 };

function targetView(geoms: PathGeometry[], W: number, H: number): View {
  let maxX = Math.max(W * 1.3 + 0.3, 1.6);
  let maxY = Math.max(H * 1.25 + 0.2, 1.0);
  for (const g of geoms) {
    for (let i = 0; i < g.n; i += 10) {
      maxX = Math.max(maxX, g.x[i] + 0.25);
      maxY = Math.max(maxY, g.y[i] + 0.2);
    }
  }
  return { minX: -0.3, minY: -0.3, maxX, maxY };
}

export function RaceCanvas2D({ api, show, drawMode, onDrawn, focus }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorsRef } = useThemeColors();
  const propsRef = useRef({ api, show, drawMode, onDrawn, focus });
  propsRef.current = { api, show, drawMode, onDrawn, focus };

  const viewRef = useRef<View | null>(null);
  const draggingRef = useRef(false);
  const hoverBRef = useRef(false);
  const strokeRef = useRef<Vec2[] | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const finishedRef = useRef<{ raceId: number; done: Set<RacerId> }>({ raceId: -1, done: new Set() });
  const sizeRef = useRef({ w: 800, h: 450, dpr: 1 });

  // ── canvas sizing ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ── mapping helpers ──
  const mapping = () => {
    const { w, h } = sizeRef.current;
    const v = viewRef.current ?? { minX: -0.3, minY: -0.3, maxX: 2.9, maxY: 1.6 };
    const pad = 18;
    const scale = Math.min((w - pad * 2) / (v.maxX - v.minX), (h - pad * 2) / (v.maxY - v.minY));
    const ox = (w - (v.maxX - v.minX) * scale) / 2 - v.minX * scale;
    const oy = (h - (v.maxY - v.minY) * scale) / 2 - v.minY * scale;
    return { scale, ox, oy };
  };
  const toWorld = (sx: number, sy: number) => {
    const m = mapping();
    return { x: (sx - m.ox) / m.scale, y: (sy - m.oy) / m.scale };
  };

  // ── render loop ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const wallDt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const c = colorsRef.current;
      if (!canvas || !c) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { api, show, drawMode, focus } = propsRef.current;
      const { w, h, dpr } = sizeRef.current;
      const showingRace = api.phase !== "idle" && api.race;
      const race = showingRace ? api.race : null;
      const geoms = race ? race.geoms : api.geoms;
      const W = race ? race.settings.W : api.settings.W;
      const H = race ? race.settings.H : api.settings.H;
      const t = api.clockRef.current.t;

      // smooth camera fit (frozen while dragging)
      const target = targetView(geoms, W, H);
      if (!viewRef.current) viewRef.current = target;
      else if (!draggingRef.current) {
        const v = viewRef.current;
        const k = 1 - Math.pow(0.001, wallDt);
        v.minX += (target.minX - v.minX) * k;
        v.minY += (target.minY - v.minY) * k;
        v.maxX += (target.maxX - v.maxX) * k;
        v.maxY += (target.maxY - v.maxY) * k;
      }
      const { scale, ox, oy } = mapping();
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const FM = `${c["--font-jetbrains"] || "ui-monospace"}, ui-monospace, monospace`;
      const FS = `${c["--font-inter"] || "ui-sans-serif"}, ui-sans-serif, system-ui, sans-serif`;
      const FD = `${c["--font-grotesk"] || "ui-sans-serif"}, ui-sans-serif, sans-serif`;
      const color = (id: RacerId) => c[RACERS[id].cssVar as keyof ThemeColors] as string;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // background + atmosphere
      ctx.fillStyle = c["--bg"];
      ctx.fillRect(0, 0, w, h);
      if (!c.highContrast) {
        const g1 = ctx.createRadialGradient(w * 0.2, h * 0.15, 0, w * 0.2, h * 0.15, w * 0.55);
        g1.addColorStop(0, alpha(c["--primary"], c.dark ? 0.13 : 0.08));
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);
        const g2 = ctx.createRadialGradient(w * 0.82, h * 0.1, 0, w * 0.82, h * 0.1, w * 0.5);
        g2.addColorStop(0, alpha(c["--secondary"], c.dark ? 0.11 : 0.06));
        g2.addColorStop(1, "transparent");
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);
      }

      // grid
      const v = viewRef.current!;
      const step = scale > 160 ? 0.1 : scale > 70 ? 0.25 : 0.5;
      ctx.lineWidth = 1;
      ctx.font = `10px ${FM}`;
      ctx.textBaseline = "top";
      for (let gx = Math.ceil(v.minX / step) * step; gx <= v.maxX + 1e-9; gx += step) {
        const major = Math.abs(gx / 0.5 - Math.round(gx / 0.5)) < 1e-6;
        ctx.strokeStyle = major ? c["--grid-strong"] : c["--grid"];
        ctx.beginPath();
        ctx.moveTo(Math.round(X(gx)) + 0.5, 0);
        ctx.lineTo(Math.round(X(gx)) + 0.5, h);
        ctx.stroke();
        if (major && Math.abs(gx) > 1e-6) {
          ctx.fillStyle = c["--muted"];
          ctx.fillText(`${gx.toFixed(1)}m`, X(gx) + 3, 4);
        }
      }
      for (let gy = Math.ceil(v.minY / step) * step; gy <= v.maxY + 1e-9; gy += step) {
        const major = Math.abs(gy / 0.5 - Math.round(gy / 0.5)) < 1e-6;
        ctx.strokeStyle = major ? c["--grid-strong"] : c["--grid"];
        ctx.beginPath();
        ctx.moveTo(0, Math.round(Y(gy)) + 0.5);
        ctx.lineTo(w, Math.round(Y(gy)) + 0.5);
        ctx.stroke();
        if (major && Math.abs(gy) > 1e-6) {
          ctx.fillStyle = c["--muted"];
          ctx.fillText(`-${gy.toFixed(1)}m`, 4, Y(gy) + 3);
        }
      }

      // dimension guides
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = alpha(c["--muted"], 0.6);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(W), Y(0));
      ctx.lineTo(X(W), Y(H));
      ctx.stroke();
      ctx.restore();
      ctx.font = `600 11px ${FM}`;
      ctx.fillStyle = c["--text-2"];
      ctx.textBaseline = "bottom";
      ctx.textAlign = "center";
      ctx.fillText(`Δx ${W.toFixed(2)} m`, X(W / 2), Y(0) - 6);
      ctx.save();
      ctx.translate(X(W) + 14, Y(H / 2));
      ctx.rotate(Math.PI / 2);
      ctx.fillText(`Δh ${H.toFixed(2)} m`, 0, 0);
      ctx.restore();
      ctx.textAlign = "left";

      const strokePath = (g: PathGeometry) => {
        ctx.beginPath();
        ctx.moveTo(X(g.x[0]), Y(g.y[0]));
        for (let i = 4; i < g.n; i += 4) ctx.lineTo(X(g.x[i]), Y(g.y[i]));
        ctx.lineTo(X(g.x[g.n - 1]), Y(g.y[g.n - 1]));
        ctx.stroke();
      };

      // ghost paths + ghost balls
      const ghost = show.ghost && race && api.ghost ? api.ghost : null;
      if (ghost) {
        ctx.save();
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1.5;
        for (const g of ghost.geoms) {
          ctx.strokeStyle = alpha(color(g.id), 0.35);
          strokePath(g);
        }
        ctx.restore();
      }

      // paths (cycloid last so it sits on top)
      const ordered = [...geoms].sort((a, b) => (a.id === "cycloid" ? 1 : 0) - (b.id === "cycloid" ? 1 : 0));
      for (const g of ordered) {
        const isCyc = g.id === "cycloid";
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (isCyc && !c.highContrast) {
          ctx.shadowColor = color(g.id);
          ctx.shadowBlur = 16;
        }
        ctx.strokeStyle = isCyc || focus === g.id ? color(g.id) : alpha(color(g.id), 0.8);
        ctx.lineWidth = isCyc ? 5 : focus === g.id ? 4 : 2.5;
        strokePath(g);
        ctx.restore();
      }

      // path labels
      if (show.labels) {
        ctx.font = `600 11px ${FS}`;
        ctx.textBaseline = "middle";
        for (const g of geoms) {
          const i = Math.floor(LABEL_FRACTION[g.id] * (g.n - 1));
          const px = X(g.x[i]);
          const py = Y(g.y[i]);
          const meta = RACERS[g.id];
          const text = `${meta.short} · ${g.length.toFixed(2)} m`;
          const tw = ctx.measureText(text).width;
          // offset label to the outside of the curve (normal direction)
          const nx = -g.ty[i];
          const ny = g.tx[i];
          const bw = tw + 26;
          const lx = Math.min(w - bw - 4, Math.max(4, nx >= 0 ? px + nx * 16 : px + nx * 16 - bw));
          const ly = Math.min(h - 12, Math.max(12, py + ny * 18));
          ctx.fillStyle = alpha(c["--surface"], c.highContrast ? 1 : 0.88);
          ctx.strokeStyle = alpha(color(g.id), 0.55);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(lx, ly - 10, tw + 26, 20, 10);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = color(g.id);
          drawShape(ctx, meta.shape, lx + 10, ly, 4);
          ctx.fill();
          ctx.fillStyle = c["--text"];
          ctx.fillText(text, lx + 19, ly + 0.5);
        }
      }

      // start A
      ctx.fillStyle = c["--text"];
      ctx.beginPath();
      ctx.arc(X(0), Y(0), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 13px ${FD}`;
      ctx.textBaseline = "bottom";
      ctx.fillText("A", X(0) - 18, Y(0) - 4);

      // finish B: flag + handle
      const bx = X(W);
      const by = Y(H);
      ctx.strokeStyle = c["--c-finish"];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - 34);
      ctx.stroke();
      const cell = 5;
      for (let r = 0; r < 3; r++)
        for (let q = 0; q < 4; q++) {
          ctx.fillStyle = (r + q) % 2 === 0 ? c["--c-finish"] : c["--bg"];
          ctx.fillRect(bx + 1 + q * cell, by - 34 + r * cell, cell, cell);
        }
      const editable = api.phase !== "running" && !drawMode;
      if (editable) {
        const pulse = (now / 1000) % 1.6;
        if (!c.highContrast && !draggingRef.current) {
          ctx.strokeStyle = alpha(c["--secondary"], Math.max(0, 0.6 - pulse * 0.4));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, 10 + pulse * 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = alpha(c["--secondary"], hoverBRef.current || draggingRef.current ? 0.45 : 0.25);
        ctx.strokeStyle = c["--secondary-soft"];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = c["--text"];
      ctx.font = `700 13px ${FD}`;
      ctx.textBaseline = "top";
      ctx.fillText("B", bx + 14, by + 6);
      if (editable && api.phase === "idle" && !draggingRef.current) {
        ctx.font = `600 11px ${FS}`;
        ctx.fillStyle = c["--secondary-soft"];
        ctx.fillText("drag me", bx + 14, by + 22);
      }

      // ghost balls
      if (ghost) {
        ghost.sims.forEach((s, i) => {
          const st = racerStateAt(ghost, i, t);
          ctx.strokeStyle = alpha(color(s.id), 0.6);
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          drawShape(ctx, RACERS[s.id].shape, X(st.x), Y(st.y), 7);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // trails
      if (race && show.trails) {
        race.sims.forEach((s, i) => {
          const col = color(s.id);
          const n = s.id === "cycloid" ? 26 : 16;
          for (let k = n; k >= 1; k--) {
            const tt = t - k * 0.012;
            if (tt <= 0) continue;
            const st = racerStateAt(race, i, tt);
            ctx.fillStyle = alpha(col, (1 - k / n) * (s.id === "cycloid" ? 0.5 : 0.3));
            ctx.beginPath();
            ctx.arc(X(st.x), Y(st.y), (s.id === "cycloid" ? 6 : 4.5) * (1 - k / (n + 4)), 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // particles: sparks behind the cycloid + finish bursts
      const parts = particlesRef.current;
      if (race) {
        if (finishedRef.current.raceId !== race.id) finishedRef.current = { raceId: race.id, done: new Set() };
        race.sims.forEach((s, i) => {
          const st = racerStateAt(race, i, t);
          if (api.phase === "running" && s.id === "cycloid" && !st.done && st.v > 0.2 && !c.highContrast) {
            for (let q = 0; q < 2; q++) {
              parts.push({
                x: st.x,
                y: st.y,
                vx: -st.tx * st.v * 0.15 + (Math.random() - 0.5) * 0.4,
                vy: -st.ty * st.v * 0.15 + (Math.random() - 0.5) * 0.4,
                life: 0,
                max: 0.4 + Math.random() * 0.4,
                color: color("cycloid"),
                size: 1 + Math.random() * 2,
              });
            }
          }
          if (st.done && !finishedRef.current.done.has(s.id)) {
            finishedRef.current.done.add(s.id);
            const first = finishedRef.current.done.size === 1;
            if (!c.highContrast && api.phase !== "idle")
              for (let q = 0; q < (first ? 46 : 14); q++) {
                const a = Math.random() * Math.PI * 2;
                const sp = 0.3 + Math.random() * (first ? 1.4 : 0.6);
                parts.push({ x: st.x, y: st.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.6 + Math.random() * 0.7, color: color(s.id), size: 1.5 + Math.random() * 2.5 });
              }
          }
        });
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += wallDt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * wallDt;
        p.y += p.vy * wallDt;
        p.vy += 0.6 * wallDt;
        ctx.fillStyle = alpha(p.color, 1 - p.life / p.max);
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      if (parts.length > 600) parts.splice(0, parts.length - 600);

      // balls + vectors
      const balls = race
        ? race.sims.map((s, i) => ({ id: s.id, st: racerStateAt(race, i, t) }))
        : geoms.map((g) => ({ id: g.id, st: { x: g.x[0], y: g.y[0], tx: g.tx[0], ty: g.ty[0], s: 0, v: 0, done: false } }));
      const drawOrder = [...balls].sort((a, b) => (a.id === "cycloid" ? 1 : 0) - (b.id === "cycloid" ? 1 : 0));
      for (const { id, st } of drawOrder) {
        const meta = RACERS[id];
        const px = X(st.x);
        const py = Y(st.y);
        if (show.vectors && race && st.v > 0.05 && !st.done) {
          const len = st.v * 0.09 * scale;
          const ex = px + st.tx * len;
          const ey = py + st.ty * len;
          ctx.strokeStyle = c["--c-velocity"];
          ctx.fillStyle = c["--c-velocity"];
          ctx.lineWidth = id === focus ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          const ang = Math.atan2(ey - py, ex - px);
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(ang - 0.45) * 8, ey - Math.sin(ang - 0.45) * 8);
          ctx.lineTo(ex - Math.cos(ang + 0.45) * 8, ey - Math.sin(ang + 0.45) * 8);
          ctx.closePath();
          ctx.fill();
          if (id === focus) {
            ctx.font = `600 11px ${FM}`;
            ctx.textBaseline = "bottom";
            ctx.fillText(`${st.v.toFixed(2)} m/s`, ex + 6, ey - 4);
          }
        }
        ctx.save();
        if (id === "cycloid" && !c.highContrast) {
          ctx.shadowColor = color(id);
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = color(id);
        drawShape(ctx, meta.shape, px, py, id === "cycloid" ? 9 : 7.5);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = c["--bg"];
        ctx.lineWidth = 1.5;
        drawShape(ctx, meta.shape, px, py, id === "cycloid" ? 9 : 7.5);
        ctx.stroke();
      }

      // draw mode
      const stroke = strokeRef.current;
      if (drawMode) {
        ctx.fillStyle = alpha(c["--surface"], 0.9);
        const msg = stroke ? "Keep going towards B… lift to finish" : "✎ Draw your path from A towards B";
        ctx.font = `600 13px ${FS}`;
        const tw = ctx.measureText(msg).width;
        ctx.beginPath();
        ctx.roundRect(w / 2 - tw / 2 - 14, 12, tw + 28, 30, 15);
        ctx.fill();
        ctx.strokeStyle = c["--c-custom"];
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = c["--text"];
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(msg, w / 2, 27);
        ctx.textAlign = "left";
      }
      if (stroke && stroke.length > 1) {
        ctx.strokeStyle = c["--c-custom"];
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        for (const p of stroke) ctx.lineTo(X(p.x), Y(p.y));
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pointer interaction ──
  const local = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };
  const nearB = (sx: number, sy: number) => {
    const { api } = propsRef.current;
    const m = mapping();
    return Math.hypot(sx - (m.ox + api.settings.W * m.scale), sy - (m.oy + api.settings.H * m.scale)) < 26;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { sx, sy } = local(e);
    const { api, drawMode } = propsRef.current;
    if (drawMode) {
      strokeRef.current = [toWorld(sx, sy)];
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (api.phase !== "running" && nearB(sx, sy)) {
      draggingRef.current = true;
      canvasRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = local(e);
    const { api } = propsRef.current;
    if (strokeRef.current) {
      const p = toWorld(sx, sy);
      const q = strokeRef.current[strokeRef.current.length - 1];
      if (Math.hypot(p.x - q.x, p.y - q.y) > 0.015) strokeRef.current.push(p);
      return;
    }
    if (draggingRef.current) {
      const p = toWorld(sx, sy);
      const { W, H } = clampEnd(Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100);
      if (W !== api.settings.W || H !== api.settings.H) api.update({ W, H });
      return;
    }
    const near = api.phase !== "running" && !propsRef.current.drawMode && nearB(sx, sy);
    hoverBRef.current = near;
    if (canvasRef.current) canvasRef.current.style.cursor = propsRef.current.drawMode ? "crosshair" : near ? "grab" : "default";
  };
  const onPointerUp = () => {
    if (strokeRef.current) {
      const pts = strokeRef.current;
      strokeRef.current = null;
      if (pts.length > 3) propsRef.current.onDrawn(pts);
    }
    draggingRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { api } = propsRef.current;
    if (api.phase === "running") return;
    const d = e.shiftKey ? 0.2 : 0.05;
    let { W, H } = api.settings;
    if (e.key === "ArrowLeft") W -= d;
    else if (e.key === "ArrowRight") W += d;
    else if (e.key === "ArrowUp") H -= d;
    else if (e.key === "ArrowDown") H += d;
    else return;
    e.preventDefault();
    const c = clampEnd(Math.round(W * 100) / 100, Math.round(H * 100) / 100);
    api.update(c);
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full rounded-[inherit]"
        tabIndex={0}
        role="img"
        aria-label={`Race track. Start A at the top left, finish B ${api.settings.W.toFixed(2)} metres across and ${api.settings.H.toFixed(2)} metres down. Use arrow keys to move B (hold Shift for bigger steps).`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => (hoverBRef.current = false)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
