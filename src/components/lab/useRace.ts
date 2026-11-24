"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arcPath, customPath, cycloidPath, cycloidTheoryTime, parabolaPath, straightPath, straightTheoryTime } from "@/lib/physics/curves";
import { simulate, stateAt } from "@/lib/physics/simulate";
import { frictionTunedPath } from "@/lib/physics/tune";
import type { PathGeometry, RacerId, RacerState, SimResult, Vec2 } from "@/lib/physics/types";
import { GRAVITY, RACER_ORDER } from "@/lib/racers";

export type Phase = "idle" | "running" | "paused" | "finished";
export type Stage = "predict" | "race" | "measure" | "explain" | "vary";

export interface Settings {
  W: number;
  H: number;
  mu: number;
  gKey: string;
  enabled: Record<RacerId, boolean>;
  noise: boolean;
}

export interface Race {
  id: number;
  settings: Settings;
  g: number;
  geoms: PathGeometry[];
  sims: SimResult[];
  delays: Partial<Record<RacerId, number>>;
  endTime: number;
}

export interface Trial {
  n: number;
  W: number;
  H: number;
  mu: number;
  planet: string;
  noise: boolean;
  times: Partial<Record<RacerId, number | null>>;
  winner: RacerId | null;
  prediction: RacerId | null;
  stopwatch: number | null;
}

export interface Clock {
  t: number;
  speed: number;
  playing: boolean;
}

export const LIMITS = { minW: 0.4, maxW: 4, minH: 0.25, maxH: 2 };

export const DEFAULT_SETTINGS: Settings = {
  W: 2,
  H: 1,
  mu: 0,
  gKey: "earth",
  enabled: { cycloid: true, straight: true, arc: true, parabola: true, frictionOpt: false, custom: false },
  noise: false,
};

export function clampEnd(W: number, H: number) {
  return {
    W: Math.min(LIMITS.maxW, Math.max(LIMITS.minW, W)),
    H: Math.min(LIMITS.maxH, Math.max(LIMITS.minH, H)),
  };
}

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function gValue(key: string) {
  return GRAVITY.find((p) => p.key === key)?.g ?? 9.81;
}

/** Finish time including any release delay. */
export function effectiveFinish(race: Race, id: RacerId): number | null {
  const sim = race.sims.find((s) => s.id === id);
  if (!sim || sim.finishTime === null) return null;
  return sim.finishTime + (race.delays[id] ?? 0);
}

export function racerStateAt(race: Race, i: number, t: number): RacerState {
  const sim = race.sims[i];
  const delay = race.delays[sim.id] ?? 0;
  return stateAt(race.geoms[i], sim, Math.max(0, t - delay));
}

export function standings(race: Race) {
  return race.sims
    .map((s) => ({ id: s.id, time: effectiveFinish(race, s.id), status: s.status }))
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
}

export function theoryTimes(race: Race) {
  const { W, H, mu, noise } = race.settings;
  if (mu > 0 || noise) return null;
  return { cycloid: cycloidTheoryTime(W, H, race.g), straight: straightTheoryTime(W, H, race.g) };
}

export function useRace() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [customPts, setCustomPts] = useState<Vec2[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>("predict");
  const [prediction, setPrediction] = useState<RacerId | null>(null);
  const [race, setRace] = useState<Race | null>(null);
  const [ghost, setGhost] = useState<Race | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [hudT, setHudT] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [stopwatch, setStopwatch] = useState<number | null>(null);

  const clockRef = useRef<Clock>({ t: 0, speed: 1, playing: false });
  const raceRef = useRef<Race | null>(null);
  const wallStartRef = useRef<number>(0);
  const predictionRef = useRef<RacerId | null>(null);
  const stopwatchRef = useRef<number | null>(null);
  const raceCounter = useRef(0);
  predictionRef.current = prediction;
  stopwatchRef.current = stopwatch;

  const g = gValue(settings.gKey);

  // ── geometry for the current settings (live while dragging B) ──
  const geoms = useMemo(() => {
    const { W, H, mu, enabled } = settings;
    const out: PathGeometry[] = [];
    for (const id of RACER_ORDER) {
      if (!enabled[id]) continue;
      if (id === "cycloid") out.push(cycloidPath(W, H));
      else if (id === "straight") out.push(straightPath(W, H));
      else if (id === "arc") out.push(arcPath(W, H));
      else if (id === "parabola") out.push(parabolaPath(W, H));
      else if (id === "frictionOpt") out.push(frictionTunedPath(W, H, mu, g));
      else if (id === "custom" && customPts) {
        const p = customPath(customPts, W, H);
        if (p) out.push(p);
      }
    }
    return out;
  }, [settings, customPts, g]);

  const reset = useCallback(() => {
    clockRef.current.t = 0;
    clockRef.current.playing = false;
    setHudT(0);
    setPhase("idle");
    setStopwatch(null);
  }, []);

  /** Any change of an experimental variable resets the track. */
  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      if (phase !== "idle") reset();
      if (stage !== "predict" && stage !== "race") setStage("predict");
    },
    [phase, reset, stage],
  );

  const setEnabled = useCallback(
    (id: RacerId, on: boolean) => {
      setSettings((s) => ({ ...s, enabled: { ...s.enabled, [id]: on } }));
      if (phase !== "idle") reset();
    },
    [phase, reset],
  );

  const setSpeed = useCallback((v: number) => {
    clockRef.current.speed = v;
    setSpeedState(v);
  }, []);

  const start = useCallback(() => {
    if (!geoms.length) return;
    const muFor = () => (settings.noise ? Math.max(0, settings.mu + Math.abs(gauss()) * 0.008 + settings.mu * 0.06 * gauss()) : settings.mu);
    const sims = geoms.map((p) => simulate(p, { g, mu: muFor() }));
    const delays: Partial<Record<RacerId, number>> = {};
    if (settings.noise) for (const p of geoms) delays[p.id] = Math.abs(gauss()) * 0.012;
    const finished = sims.map((s) => (s.finishTime === null ? null : s.finishTime + (delays[s.id] ?? 0))).filter((x): x is number => x !== null);
    const lastFinish = finished.length ? Math.max(...finished) : 0;
    const anyDnf = finished.length < sims.length;
    const endTime = finished.length ? lastFinish + (anyDnf ? 0.8 : 0.35) : Math.min(5, Math.max(...sims.map((s) => s.samples * s.recordDt)));
    const next: Race = { id: ++raceCounter.current, settings, g, geoms, sims, delays, endTime };
    setGhost(raceRef.current);
    raceRef.current = next;
    setRace(next);
    clockRef.current.t = 0;
    clockRef.current.playing = true;
    wallStartRef.current = performance.now();
    setStopwatch(null);
    setPhase("running");
    setStage("race");
  }, [geoms, settings, g]);

  const pause = useCallback(() => {
    clockRef.current.playing = false;
    setPhase("paused");
  }, []);
  const resume = useCallback(() => {
    clockRef.current.playing = true;
    setPhase("running");
  }, []);

  const scrub = useCallback((t: number) => {
    clockRef.current.t = t;
    setHudT(t);
  }, []);

  /** Human stopwatch: the student taps when they think the cycloid ball crossed B. */
  const tapStopwatch = useCallback(() => {
    if (stopwatchRef.current !== null) return;
    const wall = (performance.now() - wallStartRef.current) / 1000;
    setStopwatch(wall * clockRef.current.speed);
  }, []);

  const finish = useCallback(() => {
    const r = raceRef.current;
    if (!r) return;
    setPhase("finished");
    setStage("measure");
    const st = standings(r);
    const times: Partial<Record<RacerId, number | null>> = {};
    for (const s of st) times[s.id] = s.time;
    const winner = st[0]?.time !== null && st[0]?.time !== undefined ? st[0].id : null;
    const planet = r.settings.gKey;
    setTrials((tr) => [
      ...tr,
      {
        n: tr.length + 1,
        W: r.settings.W,
        H: r.settings.H,
        mu: r.settings.mu,
        planet,
        noise: r.settings.noise,
        times,
        winner,
        prediction: predictionRef.current,
        stopwatch: stopwatchRef.current,
      },
    ]);
  }, []);

  // ── master clock ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = clockRef.current;
      const r = raceRef.current;
      if (c.playing && r) {
        c.t += dt * c.speed;
        if (c.t >= r.endTime) {
          c.t = r.endTime;
          c.playing = false;
          setHudT(c.t);
          finish();
        } else if (now - lastHud > 50) {
          lastHud = now;
          setHudT(c.t);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  const clearTrials = useCallback(() => setTrials([]), []);

  return {
    settings,
    update,
    setEnabled,
    customPts,
    setCustomPts,
    geoms,
    g,
    phase,
    stage,
    setStage,
    prediction,
    setPrediction,
    race,
    ghost,
    trials,
    clearTrials,
    hudT,
    speed,
    setSpeed,
    clockRef,
    start,
    pause,
    resume,
    reset,
    scrub,
    stopwatch,
    tapStopwatch,
  };
}

export type RaceApi = ReturnType<typeof useRace>;
