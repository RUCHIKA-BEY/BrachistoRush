"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Box, Pause, Play, RotateCcw, SlidersHorizontal, Square, Undo2 } from "lucide-react";
import type { RacerId } from "@/lib/physics/types";
import { useThemeColors } from "@/lib/useThemeColors";
import { Controls } from "./Controls";
import { Stepper, StagePanel } from "./Inquiry";
import { EnergyPanel, Standings } from "./Panels";
import { RaceCanvas2D, type DisplayOptions } from "./RaceCanvas2D";
import { SpeedChart } from "./SpeedChart";
import { TrialLog } from "./TrialLog";
import { DEFAULT_SETTINGS, useRace } from "./useRace";

const RaceView3D = dynamic(() => import("./RaceView3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading 3D track…</div>,
});

const SPEEDS = [1, 0.5, 0.25, 0.1];

export function RaceLab() {
  const api = useRace();
  const { colors } = useThemeColors();
  const [show, setShow] = useState<DisplayOptions>({ vectors: true, trails: true, ghost: true, labels: true });
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [drawMode, setDrawMode] = useState(false);
  const [focus, setFocus] = useState<RacerId>("cycloid");
  const [controlsOpen, setControlsOpen] = useState(false);

  const running = api.phase === "running";
  const canScrub = api.phase === "finished" || api.phase === "paused";

  // keep the energy focus on a racer that exists
  useEffect(() => {
    const ids = (api.race && api.phase !== "idle" ? api.race.sims.map((s) => s.id) : api.geoms.map((g) => g.id)) as RacerId[];
    if (ids.length && !ids.includes(focus)) setFocus(ids[0]);
  }, [api.geoms, api.race, api.phase, focus]);

  // space bar: start / pause / resume
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code !== "Space" || ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(tag)) return;
      e.preventDefault();
      if (api.phase === "running") api.pause();
      else if (api.phase === "paused") api.resume();
      else api.start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  const startDraw = () => {
    setView("2d");
    setDrawMode(true);
  };

  const primary = () => {
    if (running) api.pause();
    else if (api.phase === "paused") api.resume();
    else api.start();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <Stepper api={api} />

        {/* ── track ── */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
            <motion.button whileTap={{ scale: 0.95 }} className="btn btn-primary !px-5" onClick={primary} disabled={!api.geoms.length || drawMode}>
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? "Pause" : api.phase === "paused" ? "Resume" : api.phase === "finished" ? "Race again" : "Race!"}
            </motion.button>
            <button className="btn btn-ghost !px-3" onClick={api.reset} disabled={api.phase === "idle"} aria-label="Reset race to start" title="Reset">
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="flex items-center rounded-full border border-line p-0.5" role="radiogroup" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={api.speed === s}
                  onClick={() => api.setSpeed(s)}
                  className={`rounded-full px-2.5 py-1 font-mono text-xs transition-colors ${api.speed === s ? "bg-secondary/25 text-fg" : "text-muted hover:text-fg"}`}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                className="btn btn-ghost !px-3 !py-2 !text-xs"
                onClick={() => {
                  api.update({ ...DEFAULT_SETTINGS, enabled: api.settings.enabled });
                }}
                disabled={running}
                title="Back to the classic setup (2 m × 1 m, no friction, Earth)"
              >
                <Undo2 className="h-3.5 w-3.5" /> Classic setup
              </button>
              <div className="flex items-center rounded-full border border-line p-0.5" role="radiogroup" aria-label="View">
                {(["2d", "3d"] as const).map((v) => (
                  <button
                    key={v}
                    role="radio"
                    aria-checked={view === v}
                    onClick={() => {
                      setView(v);
                      if (v === "3d") setDrawMode(false);
                    }}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${view === v ? "bg-secondary/25 text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {v === "2d" ? <Square className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
            {view === "2d" ? (
              <RaceCanvas2D
                api={api}
                show={show}
                drawMode={drawMode}
                focus={focus}
                onDrawn={(pts) => {
                  api.setCustomPts(pts);
                  api.setEnabled("custom", true);
                  setDrawMode(false);
                  setFocus("custom");
                }}
              />
            ) : (
              colors && <RaceView3D api={api} colors={colors} focus={focus} />
            )}
            {!drawMode && <Standings api={api} />}
            {view === "3d" && <p className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-muted">drag to orbit · scroll to zoom</p>}
          </div>

          {!drawMode && <Standings api={api} inline />}

          {/* timeline */}
          <div className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            <span className="font-mono text-[11px] text-muted">0 s</span>
            <input
              type="range"
              className="range flex-1"
              min={0}
              max={api.race?.endTime ?? 1}
              step={0.001}
              value={api.phase === "idle" ? 0 : api.hudT}
              disabled={!canScrub}
              onChange={(e) => api.scrub(parseFloat(e.target.value))}
              aria-label="Race timeline — scrub to any moment after the race"
            />
            <span className="font-mono text-[11px] text-muted">{api.race && api.phase !== "idle" ? `${api.race.endTime.toFixed(2)} s` : "—"}</span>
          </div>
        </div>

        <StagePanel api={api} onDraw={startDraw} />

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-5" aria-labelledby="speed-title">
            <h2 id="speed-title" className="font-display text-base font-semibold text-fg">
              Speed vs time
            </h2>
            <p className="mb-2 text-xs text-muted">Steeper early climb = faster start.</p>
            <SpeedChart api={api} focus={focus} />
          </section>
          <section className="card p-5" aria-labelledby="energy-title">
            <h2 id="energy-title" className="mb-3 font-display text-base font-semibold text-fg">
              Energy bank
            </h2>
            <EnergyPanel api={api} focus={focus} setFocus={setFocus} />
          </section>
        </div>

        <TrialLog trials={api.trials} onClear={api.clearTrials} />
      </div>

      {/* ── controls ── */}
      <aside className="order-first lg:order-none lg:sticky lg:top-20 lg:self-start" aria-label="Experiment controls">
        <button className="btn btn-secondary mb-3 w-full lg:hidden" onClick={() => setControlsOpen((o) => !o)} aria-expanded={controlsOpen} aria-controls="lab-controls">
          <SlidersHorizontal className="h-4 w-4" /> {controlsOpen ? "Hide" : "Show"} experiment controls
        </button>
        <div id="lab-controls" className={`card p-5 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto ${controlsOpen ? "block" : "hidden"}`}>
          <Controls api={api} show={show} setShow={setShow} drawMode={drawMode} setDrawMode={(v) => (v ? startDraw() : setDrawMode(false))} />
        </div>
      </aside>
    </div>
  );
}
