"use client";

import { useEffect, useRef, useState } from "react";
import { FlipVertical2, Pause, Play, RotateCcw } from "lucide-react";
import { alpha, useThemeColors } from "@/lib/useThemeColors";

/** A wheel rolls along the ground; a point on its rim draws a cycloid. Flip it to get the brachistochrone. */
export function CycloidGenerator() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorsRef } = useThemeColors();
  const [playing, setPlaying] = useState(true);
  const [flip, setFlip] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [readout, setReadout] = useState({ theta: 0, x: 0, y: 0 });
  const state = useRef({ theta: 0, playing: true, flip: false, speed: 1 });
  state.current.playing = playing;
  state.current.flip = flip;
  state.current.speed = speed;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const TOTAL = 4 * Math.PI; // two arches
      if (s.playing) {
        s.theta += dt * 1.6 * s.speed;
        if (s.theta > TOTAL + 1.2) s.theta = 0;
      }
      const th = Math.min(s.theta, TOTAL);
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
      ctx.fillStyle = c["--bg"];
      ctx.fillRect(0, 0, w, h);
      const FM = `${c["--font-jetbrains"] || "ui-monospace"}, monospace`;

      // fit two arches (width 4πr) with margins
      const r = Math.min((w - 40) / (4 * Math.PI), (h - 60) / 2.6);
      const x0 = (w - 4 * Math.PI * r) / 2;
      const groundY = s.flip ? 30 : h - 30;
      const sgn = s.flip ? 1 : -1; // flip mirrors vertically
      const P = (x: number, y: number) => ({ px: x0 + x * r, py: groundY + sgn * y * r });

      // ground
      ctx.strokeStyle = c["--grid-strong"];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, groundY);
      ctx.lineTo(w - 10, groundY);
      ctx.stroke();

      // full ghost cycloid
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = alpha(c["--c-cycloid"], 0.3);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let t = 0; t <= TOTAL; t += 0.03) {
        const { px, py } = P(t - Math.sin(t), 1 - Math.cos(t));
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // traced cycloid
      ctx.save();
      if (!c.highContrast) {
        ctx.shadowColor = c["--c-cycloid"];
        ctx.shadowBlur = 14;
      }
      ctx.strokeStyle = c["--c-cycloid"];
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let t = 0; t <= th; t += 0.02) {
        const { px, py } = P(t - Math.sin(t), 1 - Math.cos(t));
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // wheel
      const center = P(th, 1);
      ctx.strokeStyle = c["--secondary"];
      ctx.fillStyle = alpha(c["--secondary"], 0.1);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(center.px, center.py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // spokes rotate with the wheel
      ctx.strokeStyle = alpha(c["--secondary-soft"], 0.45);
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        const a = th + (k * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(center.px, center.py);
        ctx.lineTo(center.px - Math.sin(a) * r, center.py + sgn * -Math.cos(a) * r);
        ctx.stroke();
      }
      // radius to the tracing point
      const pt = P(th - Math.sin(th), 1 - Math.cos(th));
      ctx.strokeStyle = c["--secondary-soft"];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.px, center.py);
      ctx.lineTo(pt.px, pt.py);
      ctx.stroke();
      ctx.fillStyle = c["--secondary-soft"];
      ctx.beginPath();
      ctx.arc(center.px, center.py, 3, 0, Math.PI * 2);
      ctx.fill();
      // tracing point
      ctx.save();
      if (!c.highContrast) {
        ctx.shadowColor = c["--c-cycloid"];
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = c["--c-cycloid"];
      ctx.beginPath();
      ctx.arc(pt.px, pt.py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // labels
      ctx.font = `600 11px ${FM}`;
      ctx.fillStyle = c["--muted"];
      ctx.textBaseline = s.flip ? "bottom" : "top";
      ctx.fillText(s.flip ? "ceiling — wheel rolls underneath" : "ground — wheel rolls along it", 14, groundY + (s.flip ? -6 : 6));
      ctx.fillStyle = c["--secondary-soft"];
      ctx.textBaseline = "middle";
      ctx.fillText("r", (center.px + pt.px) / 2 + 6, (center.py + pt.py) / 2);

      if (now - lastHud > 80) {
        lastHud = now;
        setReadout({ theta: th, x: th - Math.sin(th), y: 1 - Math.cos(th) });
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [colorsRef]);

  return (
    <div className="card overflow-hidden">
      <div ref={wrapRef} className="relative aspect-[16/8] w-full sm:aspect-[16/7]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Animation: a wheel rolls along a line and a point on its rim traces a cycloid curve" />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
        <button className="btn btn-primary !px-4" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Roll"}
        </button>
        <button
          className="btn btn-ghost !px-3"
          onClick={() => {
            state.current.theta = 0;
            setPlaying(true);
          }}
          aria-label="Restart"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button className={`btn ${flip ? "btn-secondary" : "btn-ghost"}`} onClick={() => setFlip((f) => !f)} aria-pressed={flip}>
          <FlipVertical2 className="h-4 w-4" /> Flip upside down
        </button>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          speed
          <input type="range" className="range w-24" min={0.25} max={3} step={0.25} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
        </label>
        <div className="ml-auto font-mono text-xs text-fg-2" aria-live="off">
          θ = {readout.theta.toFixed(2)} rad · x = r({readout.x.toFixed(2)}) · y = r({readout.y.toFixed(2)})
        </div>
      </div>
    </div>
  );
}
