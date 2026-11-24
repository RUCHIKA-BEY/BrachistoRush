"use client";

import { useEffect, useRef } from "react";
import { maxSpeed } from "@/lib/physics/simulate";
import type { RacerId } from "@/lib/physics/types";
import { RACERS } from "@/lib/racers";
import { alpha, useThemeColors, type ThemeColors } from "@/lib/useThemeColors";
import type { RaceApi } from "./useRace";

/** Live speed-vs-time graph for every racer, drawn up to the current race time. */
export function SpeedChart({ api, focus }: { api: RaceApi; focus: RacerId }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorsRef } = useThemeColors();
  const propsRef = useRef({ api, focus });
  propsRef.current = { api, focus };

  useEffect(() => {
    let raf = 0;
    const render = () => {
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
      const { api, focus } = propsRef.current;
      const race = api.phase !== "idle" ? api.race : null;
      const FM = `${c["--font-jetbrains"] || "ui-monospace"}, ui-monospace, monospace`;
      const L = 40;
      const R = 12;
      const T = 18;
      const B = 26;
      const pw = w - L - R;
      const ph = h - T - B;

      const tMax = race ? Math.max(0.5, race.endTime) : 1.5;
      const vMax = race ? Math.max(1, ...race.sims.map((s) => maxSpeed(s))) * 1.1 : 6;
      const niceStep = (range: number) => {
        const raw = range / 4;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / mag;
        return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
      };

      // axes + grid
      ctx.font = `10px ${FM}`;
      ctx.fillStyle = c["--muted"];
      ctx.strokeStyle = c["--grid-strong"];
      ctx.lineWidth = 1;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const vs = niceStep(vMax);
      for (let v = 0; v <= vMax + 1e-9; v += vs) {
        const y = T + ph - (v / vMax) * ph;
        ctx.beginPath();
        ctx.moveTo(L, Math.round(y) + 0.5);
        ctx.lineTo(L + pw, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.fillText(v.toFixed(vs < 1 ? 1 : 0), L - 6, y);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const ts = niceStep(tMax);
      for (let t = 0; t <= tMax + 1e-9; t += ts) {
        const x = L + (t / tMax) * pw;
        ctx.fillText(t.toFixed(ts < 1 ? 1 : 0), x, T + ph + 6);
      }
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("time (s) →", L + pw, T - 3);
      ctx.textAlign = "left";
      ctx.save();
      ctx.translate(10, T + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("speed (m/s)", 0, 0);
      ctx.restore();

      if (!race) {
        ctx.fillStyle = c["--muted"];
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `12px ${c["--font-inter"] || "ui-sans-serif"}, sans-serif`;
        ctx.fillText("Start a race to draw live speed curves", L + pw / 2, T + ph / 2);
        ctx.textAlign = "left";
        return;
      }

      const t = api.clockRef.current.t;
      const order = [...race.sims].sort((a, b) => (a.id === focus ? 1 : 0) - (b.id === focus ? 1 : 0));
      for (const s of order) {
        const delay = race.delays[s.id] ?? 0;
        const col = c[RACERS[s.id].cssVar as keyof ThemeColors] as string;
        ctx.strokeStyle = s.id === focus || s.id === "cycloid" ? col : alpha(col, 0.75);
        ctx.lineWidth = s.id === focus ? 3 : s.id === "cycloid" ? 2.5 : 1.75;
        ctx.beginPath();
        const end = Math.min(t, race.endTime);
        let started = false;
        for (let tt = 0; tt <= end; tt += 1 / 120) {
          const local = tt - delay;
          let v = 0;
          if (local > 0) {
            const idx = Math.min(s.samples - 1, Math.floor(local / s.recordDt));
            v = Math.abs(s.v[idx]);
          }
          const x = L + (tt / tMax) * pw;
          const y = T + ph - (v / vMax) * ph;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
          if (s.finishTime !== null && local >= s.finishTime) break;
        }
        ctx.stroke();
      }
      // playhead
      const px = L + (Math.min(t, tMax) / tMax) * pw;
      ctx.strokeStyle = alpha(c["--text"], 0.4);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(px, T);
      ctx.lineTo(px, T + ph);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="relative h-56 w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Graph of speed against time for each racer" />
    </div>
  );
}
