"use client";

import { useEffect, useMemo, useRef } from "react";
import { cycloidPath, straightPath } from "@/lib/physics/curves";
import { simulate, stateAt } from "@/lib/physics/simulate";
import { alpha, useThemeColors } from "@/lib/useThemeColors";

/** Self-looping mini race on the home page: cycloid vs straight line, real physics, slowed down. */
export function HeroRace() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorsRef } = useThemeColors();
  const data = useMemo(() => {
    const W = 2;
    const H = 1;
    const cyc = cycloidPath(W, H);
    const str = straightPath(W, H);
    return { W, H, cyc, str, sc: simulate(cyc, { g: 9.81, mu: 0 }), ss: simulate(str, { g: 9.81, mu: 0 }) };
  }, []);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, p: Math.random() * 6 }));
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      const c = colorsRef.current;
      if (!canvas || !wrap || !c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const FM = `${c["--font-jetbrains"] || "ui-monospace"}, monospace`;
      const FS = `${c["--font-inter"] || "ui-sans-serif"}, sans-serif`;

      // twinkling particles
      if (!c.highContrast) {
        for (const s of stars) {
          const a = 0.25 + 0.25 * Math.sin(now / 900 + s.p);
          ctx.fillStyle = alpha(c["--primary-soft"], a * (c.dark ? 1 : 0.5));
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const { W, H, cyc, str, sc, ss } = data;
      const pad = 34;
      const scale = Math.min((w - pad * 2) / W, (h - pad * 2 - 30) / H);
      const ox = (w - W * scale) / 2;
      const oy = pad + 10;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;

      const SLOW = 0.45;
      const cycle = (ss.finishTime! / SLOW) + 1.6;
      const wall = ((now - t0) / 1000) % cycle;
      const t = Math.max(0, wall - 0.5) * SLOW;

      const line = (g: typeof cyc, color: string, width: number, glow: boolean) => {
        ctx.save();
        if (glow && !c.highContrast) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < g.n; i += 5) {
          if (i === 0) ctx.moveTo(X(g.x[i]), Y(g.y[i]));
          else ctx.lineTo(X(g.x[i]), Y(g.y[i]));
        }
        ctx.lineTo(X(g.x[g.n - 1]), Y(g.y[g.n - 1]));
        ctx.stroke();
        ctx.restore();
      };
      line(str, c["--c-straight"], 3, false);
      line(cyc, c["--c-cycloid"], 5, true);

      const ball = (g: typeof cyc, sim: typeof sc, color: string, square: boolean) => {
        // trail
        for (let k = 14; k >= 1; k--) {
          const tt = t - k * 0.015;
          if (tt <= 0) continue;
          const q = stateAt(g, sim, tt);
          ctx.fillStyle = alpha(color, (1 - k / 14) * 0.45);
          ctx.beginPath();
          ctx.arc(X(q.x), Y(q.y), 6 * (1 - k / 18), 0, Math.PI * 2);
          ctx.fill();
        }
        const s = stateAt(g, sim, t);
        ctx.save();
        if (!square && !c.highContrast) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        if (square) ctx.rect(X(s.x) - 7, Y(s.y) - 7, 14, 14);
        else ctx.arc(X(s.x), Y(s.y), 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return s;
      };
      ball(str, ss, c["--c-straight"], true);
      ball(cyc, sc, c["--c-cycloid"], false);

      // labels + times
      ctx.font = `600 12px ${FS}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = c["--c-straight"];
      ctx.fillText("■ straight line", X(W * 0.42) + 8, Y(H * 0.42) - 16);
      ctx.fillStyle = c["--c-cycloid"];
      ctx.fillText("● cycloid", X(0.32) + 12, Y(0.78));

      ctx.font = `600 12px ${FM}`;
      const ct = Math.min(t, sc.finishTime!);
      const st = Math.min(t, ss.finishTime!);
      ctx.fillStyle = c["--text-2"];
      ctx.textAlign = "right";
      ctx.fillText(`● ${ct.toFixed(2)} s   ■ ${st.toFixed(2)} s`, w - 16, h - 18);
      ctx.textAlign = "left";
      if (t >= sc.finishTime!) {
        ctx.fillStyle = c["--primary-soft"];
        ctx.font = `700 13px ${FS}`;
        ctx.fillText("cycloid wins!", 16, h - 18);
      }

      // A / B
      ctx.fillStyle = c["--text"];
      ctx.font = `700 13px ${FS}`;
      ctx.fillText("A", X(0) - 18, Y(0));
      ctx.fillText("B", X(W) + 10, Y(H));
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [colorsRef, data]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Live race: a ball on a curved cycloid path beats a ball on a straight ramp from A to B" />
    </div>
  );
}
