"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Camera,
  Clapperboard,
  Copy,
  Eye,
  Focus,
  History,
  Layers,
  Magnet,
  MessageCircleQuestion,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Rows3,
  Scan,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { clock } from "@/lib/lab3d/clock";
import { RACE_ORDER, useLab } from "@/lib/lab3d/store";
import { DEFAULT_HANDLES, trackPath } from "@/lib/lab3d/tracks";
import { BALLS, GRAVITY, TRACKS, type BallKind, type CameraMode, type GravityId, type PlaceItem, type TableObj, type TrackShape } from "@/lib/lab3d/types";
import { askTutor } from "@/lib/tutor/bridge";

const panel = "glass rounded-2xl shadow-[0_18px_40px_-20px_rgba(2,6,23,0.8)]";

function Toggle({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon?: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm text-fg-2">
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? "border-primary/60 bg-primary/70" : "border-line bg-surface-soft"}`}
      >
        <span className={`absolute left-0 top-0.5 h-[18px] w-[18px] rounded-full bg-fg shadow transition-transform ${checked ? "translate-x-[22px] !bg-on-primary" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

/** Small drawing of a track's shape for the tray. */
function ShapeIcon({ shape }: { shape: TrackShape }) {
  const d = useMemo(() => {
    const p = trackPath({ shape, W: 1.2, H: 0.55, handles: shape === "custom" ? DEFAULT_HANDLES : undefined });
    const sx = 40 / 1.2;
    const sy = 22 / Math.max(0.55, p.maxDepth);
    let s = "";
    for (let i = 0; i < p.n; i += 25) s += `${s ? "L" : "M"}${(4 + p.x[i] * sx).toFixed(1)} ${(4 + p.y[i] * sy).toFixed(1)}`;
    return s + `L${(4 + p.x[p.n - 1] * sx).toFixed(1)} ${(4 + p.y[p.n - 1] * sy).toFixed(1)}`;
  }, [shape]);
  return (
    <svg viewBox="0 0 48 30" className="h-6 w-10 shrink-0" aria-hidden="true">
      <path d={d} fill="none" stroke={`var(${TRACKS[shape].cssVar})`} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function BallIcon({ kind }: { kind: BallKind }) {
  const fill = kind === "steel" ? "url(#steelGrad)" : kind === "hollow" ? "#f8fafc" : "#f59e0b";
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
      <defs>
        <radialGradient id="steelGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#64748b" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r={kind === "bead" ? 7 : 9} fill={fill} stroke="rgba(148,163,184,0.6)" />
      {kind === "hollow" && <path d="M3.5 12h17" stroke="#fb923c" strokeWidth="2" />}
    </svg>
  );
}

/** Parts bin: click (or drag) an item onto the table. */
export function Tray() {
  const placing = useLab((s) => s.placing);
  const status = useLab((s) => s.status);
  const setPlacing = useLab((s) => s.setPlacing);
  const locked = status === "running" || status === "paused";
  const isOn = (p: PlaceItem) => JSON.stringify(placing) === JSON.stringify(p);
  const item = (p: PlaceItem, icon: React.ReactNode, label: string, title: string) => (
    <button
      key={label}
      type="button"
      disabled={locked}
      title={title}
      aria-pressed={isOn(p)}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setPlacing(isOn(p) ? null : p);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setPlacing(isOn(p) ? null : p);
        }
      }}
      className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors disabled:opacity-40 md:w-full ${
        isOn(p) ? "border-primary bg-primary/15 text-fg" : "border-transparent text-fg-2 hover:border-line hover:bg-surface-soft"
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
  return (
    <div className={`${panel} pointer-events-auto flex gap-1 overflow-x-auto p-2 md:max-h-full md:w-44 md:flex-col md:overflow-y-auto`} aria-label="Parts tray">
      <p className="hidden px-1.5 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted md:block">Tracks</p>
      {(Object.keys(TRACKS) as TrackShape[]).map((s) => item({ type: "track", shape: s }, <ShapeIcon shape={s} />, TRACKS[s].label, TRACKS[s].blurb))}
      <p className="hidden px-1.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted md:block">Objects</p>
      {(Object.keys(BALLS) as BallKind[]).map((k) => item({ type: "ball", kind: k }, <BallIcon kind={k} />, BALLS[k].label, BALLS[k].note))}
      <p className="hidden px-1.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted md:block">Instruments</p>
      {item(
        { type: "stopwatch" },
        <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
          <circle cx="12" cy="13.5" r="8" fill="#0b1220" stroke="#cbd5e1" strokeWidth="1.8" />
          <path d="M12 13.5V9M10 3h4" stroke="#5eead4" strokeWidth="1.8" strokeLinecap="round" />
        </svg>,
        "Stopwatch",
        "A desk stopwatch that shows the run clock and finish times",
      )}
      {placing && <p className="hidden px-1.5 pt-2 text-[11px] leading-snug text-muted md:block">Click the table to place it. Shift-click places several. Esc cancels.</p>}
    </div>
  );
}

function Slider({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block py-1 text-sm text-fg-2">
      <span className="flex justify-between">
        {label}
        <span className="font-mono text-xs text-fg">
          {value.toFixed(2)} {unit}
        </span>
      </span>
      <input type="range" className="range mt-1.5" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

/** Properties of the selected part. */
export function Inspector() {
  const sel = useLab((s) => s.objects.find((o) => o.id === s.selectedId) ?? null);
  const objects = useLab((s) => s.objects);
  const status = useLab((s) => s.status);
  const { update, remove, duplicate, select, place, setCamera } = useLab.getState();
  if (!sel) return null;
  const locked = status === "running" || status === "paused";
  const head = (title: string, dot?: string) => (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold text-fg">
        {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${dot})` }} />}
        {title}
      </h2>
      <button type="button" onClick={() => select(null)} className="rounded-lg p-1 text-muted hover:bg-surface-soft hover:text-fg" aria-label="Close inspector">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
  const actions = (o: TableObj) => (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {"rot" in o && (
        <>
          <button type="button" disabled={locked} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => update(o.id, { rot: o.rot + Math.PI / 12 })} title="Turn left 15° (Q)">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button type="button" disabled={locked} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => update(o.id, { rot: o.rot - Math.PI / 12 })} title="Turn right 15° (E)">
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      <button type="button" disabled={locked} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={() => duplicate(o.id)} title="Duplicate (D)">
        <Copy className="h-3.5 w-3.5" /> Copy
      </button>
      <button type="button" disabled={locked} className="btn btn-ghost !px-2.5 !py-1.5 !text-xs hover:!text-friction" onClick={() => remove(o.id)} title="Delete (Del)">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );

  let body: React.ReactNode;
  if (sel.type === "track") {
    const ball = objects.find((o) => o.type === "ball" && o.trackId === sel.id);
    body = (
      <>
        {head(`${TRACKS[sel.shape].label} track`, TRACKS[sel.shape].cssVar)}
        <p className="mt-1 text-xs text-muted">{TRACKS[sel.shape].blurb}</p>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {(Object.keys(TRACKS) as TrackShape[]).map((s) => (
            <button
              key={s}
              type="button"
              disabled={locked}
              title={TRACKS[s].label}
              onClick={() => update(sel.id, { shape: s, ...(s === "custom" && !sel.handles ? { handles: DEFAULT_HANDLES } : {}) })}
              className={`grid place-items-center rounded-lg border py-1 ${sel.shape === s ? "border-primary bg-primary/10" : "border-line hover:bg-surface-soft"}`}
            >
              <ShapeIcon shape={s} />
            </button>
          ))}
        </div>
        <fieldset disabled={locked} className="mt-2">
          <Slider label="Length A→B" value={sel.W} min={0.5} max={1.8} step={0.05} unit="m" onChange={(v) => update(sel.id, { W: v })} />
          <Slider label="Drop A→B" value={sel.H} min={0.2} max={1} step={0.05} unit="m" onChange={(v) => update(sel.id, { H: v })} />
        </fieldset>
        {sel.shape === "custom" && (
          <p className="mt-1 rounded-lg bg-custom/10 px-2 py-1.5 text-xs text-fg-2">
            Drag the two glowing handles on the board to reshape your curve.{" "}
            <button type="button" className="font-semibold text-custom underline" disabled={locked} onClick={() => update(sel.id, { handles: DEFAULT_HANDLES })}>
              Reset curve
            </button>
          </p>
        )}
        {!ball && (
          <button type="button" disabled={locked} className="btn btn-secondary mt-3 w-full !py-2 !text-xs" onClick={() => place({ type: "ball", kind: "steel" }, sel.x, sel.z)}>
            Put a steel ball at A
          </button>
        )}
        {actions(sel)}
      </>
    );
  } else if (sel.type === "ball") {
    const track = objects.find((o) => o.id === sel.trackId && o.type === "track");
    body = (
      <>
        {head(BALLS[sel.kind].label)}
        <div className="mt-2 grid grid-cols-3 gap-1">
          {(Object.keys(BALLS) as BallKind[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={locked}
              onClick={() => update(sel.id, { kind: k })}
              className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold ${sel.kind === k ? "border-primary bg-primary/10 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
            >
              <BallIcon kind={k} />
              {BALLS[k].short}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{BALLS[sel.kind].note}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-muted">Mass</dt>
          <dd className="text-right font-mono text-fg">{(BALLS[sel.kind].mass * 1000).toFixed(0)} g</dd>
          <dt className="text-muted">Diameter</dt>
          <dd className="text-right font-mono text-fg">{(BALLS[sel.kind].radius * 200).toFixed(1)} cm</dd>
          <dt className="text-muted">Sits on</dt>
          <dd className="text-right text-fg">{track && track.type === "track" ? `${TRACKS[track.shape].label} (gate A)` : "the table"}</dd>
        </dl>
        {!track && <p className="mt-2 rounded-lg bg-primary/10 px-2 py-1.5 text-xs text-fg-2">Drag this ball near a track&apos;s start (A) and it clicks into the start gate.</p>}
        <button type="button" className="btn btn-ghost mt-3 w-full !py-1.5 !text-xs" onClick={() => setCamera("follow")}>
          <Video className="h-3.5 w-3.5" /> Follow this ball
        </button>
        {actions(sel)}
      </>
    );
  } else {
    body = (
      <>
        {head("Stopwatch")}
        <p className="mt-1 text-xs text-muted">It starts when the gates open, freezes when you freeze time, and lists each finisher. Place it where your camera can see it.</p>
        {actions(sel)}
      </>
    );
  }
  return <div className={`${panel} pointer-events-auto w-full p-3 md:w-72`}>{body}</div>;
}

/** Physics + display settings and table tools. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useLab((s) => s.settings);
  const status = useLab((s) => s.status);
  const mode = useLab((s) => s.mode);
  const { set, lineUp, resetTable, clearTable } = useLab.getState();
  const locked = status === "running" || status === "paused";
  return (
    <div className={`${panel} pointer-events-auto w-full p-3 md:w-72`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-fg">Lab settings</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-soft hover:text-fg" aria-label="Close settings">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold text-fg-2">Gravity</p>
      <div className="mt-1 grid grid-cols-4 gap-1">
        {(Object.keys(GRAVITY) as GravityId[]).map((g) => (
          <button
            key={g}
            type="button"
            disabled={locked}
            onClick={() => set({ gravity: g })}
            className={`rounded-lg border py-1 text-[11px] font-semibold ${settings.gravity === g ? "border-primary bg-primary/10 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
          >
            {GRAVITY[g].label}
          </button>
        ))}
      </div>
      <fieldset disabled={locked}>
        <Slider label="Friction μ" value={settings.mu} min={0} max={0.4} step={0.01} unit="" onChange={(v) => set({ mu: v })} />
      </fieldset>
      <div className="mt-1 border-t border-line pt-1">
        <Toggle checked={settings.clearBoards} onChange={(v) => set({ clearBoards: v })} label="See-through boards" icon={<Layers className="h-4 w-4" />} />
        <Toggle checked={settings.liveForces} onChange={(v) => set({ liveForces: v })} label="Show arrows while running" icon={<Eye className="h-4 w-4" />} />
        {mode === "build" && <Toggle checked={settings.snap} onChange={(v) => set({ snap: v })} label="Snap to 5 cm / 15°" icon={<Magnet className="h-4 w-4" />} />}
        <Toggle checked={settings.quality === "high"} onChange={(v) => set({ quality: v ? "high" : "low" })} label="Glow effects (turn off if slow)" icon={<Sparkles className="h-4 w-4" />} />
      </div>
      {mode === "build" && (
      <div className="mt-2 grid grid-cols-1 gap-1.5 border-t border-line pt-3">
        <button type="button" disabled={locked} className="btn btn-secondary !py-2 !text-xs" onClick={lineUp}>
          <Rows3 className="h-3.5 w-3.5" /> Line up tracks for a fair race
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" disabled={locked} className="btn btn-ghost !py-1.5 !text-xs" onClick={resetTable}>
            Starter setup
          </button>
          <button type="button" disabled={locked} className="btn btn-ghost !py-1.5 !text-xs" onClick={clearTable}>
            Clear table
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

const CAMS: { id: CameraMode; label: string; icon: React.ReactNode }[] = [
  { id: "free", label: "Free", icon: <Orbit className="h-3.5 w-3.5" /> },
  { id: "follow", label: "Follow", icon: <Video className="h-3.5 w-3.5" /> },
  { id: "side", label: "Side", icon: <Camera className="h-3.5 w-3.5" /> },
  { id: "top", label: "Top", icon: <Scan className="h-3.5 w-3.5" /> },
  { id: "closeup", label: "Close", icon: <Focus className="h-3.5 w-3.5" /> },
  { id: "cinematic", label: "Cinema", icon: <Clapperboard className="h-3.5 w-3.5" /> },
];

/** Release / freeze / reset, slow motion, timeline and camera modes. */
export function RunBar({ onLog, logCount }: { onLog: () => void; logCount: number }) {
  const status = useLab((s) => s.status);
  const duration = useLab((s) => s.duration);
  const speed = useLab((s) => s.settings.speed);
  const camera = useLab((s) => s.settings.camera);
  const hasBall = useLab((s) => s.objects.some((o) => o.type === "ball" && o.trackId && s.objects.some((t) => t.id === o.trackId)));
  const { release, pause, resume, reset, set, setCamera } = useLab.getState();
  const timeEl = useRef<HTMLSpanElement>(null);
  const scrub = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const st = useLab.getState();
      const t = st.status === "idle" ? 0 : Math.min(clock.t, st.duration);
      if (timeEl.current) timeEl.current.textContent = t.toFixed(3);
      if (scrub.current && !scrubbing.current) scrub.current.value = String(st.duration ? t / st.duration : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const main =
    status === "running"
      ? { label: "Freeze", icon: <Pause className="h-4 w-4" />, act: pause }
      : status === "paused"
        ? { label: "Resume", icon: <Play className="h-4 w-4" />, act: resume }
        : { label: status === "finished" ? "Race again" : "Release", icon: <Play className="h-4 w-4" />, act: release };

  return (
    <div className={`${panel} pointer-events-auto flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2`}>
      <div className="flex items-center gap-1.5">
        <button type="button" data-guide="release" className="btn btn-primary !px-5 !py-2.5 !text-base" onClick={main.act} disabled={!hasBall && status === "idle"} title="Space">
          {main.icon} {main.label}
        </button>
        <button type="button" className="btn btn-ghost !px-2.5 !py-2" onClick={reset} disabled={status === "idle"} title="Reset balls to the gates (R)" aria-label="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
        <span className="ml-1 min-w-[5.5rem] font-mono text-lg font-bold tabular-nums text-fg" aria-live="off">
          <span ref={timeEl}>0.000</span>
          <span className="ml-1 text-xs font-medium text-muted">s</span>
        </span>
      </div>

      <div className={`items-center gap-1 ${status === "idle" ? "hidden sm:flex" : "flex"}`} role="group" aria-label="Slow motion">
        {[1, 0.5, 0.25, 0.1].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set({ speed: s })}
            className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${speed === s ? "border-secondary bg-secondary/20 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
          >
            {s}×
          </button>
        ))}
      </div>

      <label className={`min-w-[8rem] flex-1 items-center gap-2 text-[11px] text-muted ${status === "idle" ? "hidden sm:flex" : "flex"}`} title="Scrub through the run (freezes time)">
        Timeline
        <input
          ref={scrub}
          type="range"
          className="range"
          min={0}
          max={1}
          step={0.0005}
          defaultValue={0}
          disabled={status === "idle"}
          onPointerDown={() => {
            scrubbing.current = true;
            if (useLab.getState().status === "running") pause();
          }}
          onPointerUp={() => (scrubbing.current = false)}
          onChange={(e) => {
            if (useLab.getState().status === "running") pause();
            clock.t = +e.target.value * duration;
          }}
          aria-label="Run timeline"
        />
      </label>

      <div className="flex max-w-full items-center gap-1 overflow-x-auto" role="group" aria-label="Camera">
        {CAMS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCamera(c.id)}
            title={`${c.label} camera`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${camera === c.id ? "border-primary bg-primary/15 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
          >
            {c.icon}
            <span className="hidden xl:inline">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" className="btn btn-ghost !px-2.5 !py-1.5 !text-xs" onClick={onLog} title="Run log">
          <History className="h-3.5 w-3.5" /> {logCount}
        </button>
        {(status === "paused" || status === "finished") && (
          <button type="button" className="btn btn-secondary !px-2.5 !py-1.5 !text-xs" onClick={() => askTutor("Explain what is happening in my 3D lab experiment right now.")}>
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Ask Cyclo
          </button>
        )}
      </div>
    </div>
  );
}

/** Every run, recorded automatically. */
export function RunLog({ onClose }: { onClose: () => void }) {
  const log = useLab((s) => s.log);
  const clearLog = useLab((s) => s.clearLog);
  const best = new Map<string, number>();
  for (const r of log) {
    const key = `${r.W}|${r.H}|${r.g}|${r.mu}`;
    if (r.time !== null) best.set(key, Math.min(best.get(key) ?? Infinity, r.time));
  }
  return (
    <div className={`${panel} pointer-events-auto flex max-h-[min(60vh,28rem)] w-full flex-col p-3 md:w-[30rem]`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-fg">Run log</h2>
        <div className="flex items-center gap-1">
          {log.length > 0 && (
            <button type="button" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-soft hover:text-fg" onClick={clearLog}>
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-soft hover:text-fg" aria-label="Close run log">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {log.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Every run is recorded here automatically. Release a ball to start.</p>
      ) : (
        <div className="mt-2 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface text-left text-muted">
              <tr>
                <th className="py-1 font-semibold">Object</th>
                <th className="font-semibold">Track</th>
                <th className="font-semibold">A→B</th>
                <th className="font-semibold">g, μ</th>
                <th className="text-right font-semibold">Time</th>
                <th className="text-right font-semibold">Top speed</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => {
                const isBest = r.time !== null && best.get(`${r.W}|${r.H}|${r.g}|${r.mu}`) === r.time;
                return (
                  <tr key={r.id} className="border-t border-line text-fg-2">
                    <td className="py-1">{BALLS[r.ball].short}</td>
                    <td>
                      <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: `var(${TRACKS[r.shape].cssVar})` }} />
                      {TRACKS[r.shape].label}
                    </td>
                    <td className="font-mono">
                      {r.W.toFixed(2)}×{r.H.toFixed(2)}
                    </td>
                    <td>
                      {GRAVITY[r.g].label}, {r.mu.toFixed(2)}
                    </td>
                    <td className={`text-right font-mono ${isBest ? "font-bold text-primary-soft" : ""}`}>{r.time !== null ? `${r.time.toFixed(3)} s` : r.outcome}</td>
                    <td className="text-right font-mono">{r.vmax.toFixed(2)} m/s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">Bold = fastest run for that size, gravity and friction. Side-by-side replays are coming next.</p>
        </div>
      )}
    </div>
  );
}



/** Race mode: tap tracks in or out, pick the ball, the finish point and the planet. No dragging needed. */
export function RaceTray() {
  const tracks = useLab((s) => s.objects.filter((o) => o.type === "track").length);
  const has = useLab((s) => RACE_ORDER.filter((sh) => s.objects.some((o) => o.type === "track" && o.shape === sh)).join(","));
  const settings = useLab((s) => s.settings);
  const status = useLab((s) => s.status);
  const { toggleRaceTrack, setRace, set } = useLab.getState();
  const locked = status === "running" || status === "paused";
  const on = has.split(",");
  return (
    <div className={`${panel} pointer-events-auto flex max-h-full flex-col gap-3 overflow-y-auto p-2.5 md:w-56`} aria-label="Race setup">
      <section data-guide="tray-tracks" className="rounded-xl p-0.5">
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">1 · Tracks to race</p>
        <div className="flex gap-1.5 overflow-x-auto md:grid md:grid-cols-1 md:overflow-visible">
          {RACE_ORDER.map((sh) => {
            const active = on.includes(sh);
            return (
              <button
                key={sh}
                type="button"
                disabled={locked || (active && tracks <= 1)}
                onClick={() => toggleRaceTrack(sh)}
                aria-pressed={active}
                title={TRACKS[sh].blurb}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-50 ${
                  active ? "border-primary/60 bg-primary/12 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"
                }`}
              >
                <ShapeIcon shape={sh} />
                <span className="flex-1 whitespace-nowrap">{TRACKS[sh].label}</span>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-primary bg-primary text-on-primary" : "border-line"}`} aria-hidden="true">
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section data-guide="tray-ball" className="rounded-xl p-0.5">
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">2 · Ball</p>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(BALLS) as BallKind[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={locked}
              onClick={() => setRace({ raceBall: k })}
              title={BALLS[k].note}
              className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-[11px] font-semibold disabled:opacity-50 ${settings.raceBall === k ? "border-primary bg-primary/12 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
            >
              <BallIcon kind={k} />
              {BALLS[k].short}
            </button>
          ))}
        </div>
      </section>

      <section className="hidden rounded-xl p-0.5 md:block">
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">3 · Finish point B</p>
        <fieldset disabled={locked} className="px-1">
          <Slider label="How far" value={settings.raceW} min={0.6} max={1.6} step={0.05} unit="m" onChange={(v) => setRace({ raceW: v })} />
          <Slider label="How deep" value={settings.raceH} min={0.3} max={0.9} step={0.05} unit="m" onChange={(v) => setRace({ raceH: v })} />
        </fieldset>
      </section>

      <section className="hidden rounded-xl p-0.5 md:block">
        <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">4 · Where?</p>
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(GRAVITY) as GravityId[]).map((g) => (
            <button
              key={g}
              type="button"
              disabled={locked}
              onClick={() => set({ gravity: g })}
              className={`rounded-lg border py-1 text-[10px] font-semibold disabled:opacity-50 ${settings.gravity === g ? "border-primary bg-primary/12 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
            >
              {GRAVITY[g].label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Race mode (simple, for everyone) or free build (move, turn and shape parts yourself). */
export function ModeSwitch() {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-soft p-0.5 text-[11px] font-bold" role="group" aria-label="Lab mode">
      {(
        [
          ["race", "Race"],
          ["build", "Free build"],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          className={`rounded-full px-2.5 py-1 transition-colors ${mode === m ? "bg-primary text-on-primary" : "text-fg-2 hover:text-fg"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
