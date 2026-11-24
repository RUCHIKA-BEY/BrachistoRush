"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { RacerId } from "@/lib/physics/types";
import { GRAVITY, RACERS, RACER_ORDER } from "@/lib/racers";
import type { DisplayOptions } from "./RaceCanvas2D";
import { ShapeIcon } from "./shapes";
import { LIMITS, type RaceApi } from "./useRace";

function Group({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-2.5 flex w-full items-baseline justify-between text-[11px] font-semibold uppercase tracking-widest text-muted">
        {title}
        {hint && <span className="normal-case tracking-normal text-[11px] font-normal">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 py-1 text-sm text-fg-2 ${disabled ? "opacity-50" : ""}`}>
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${checked ? "border-primary/60 bg-primary/70" : "border-line bg-surface-soft"}`}
      >
        <span className={`absolute left-0 top-0.5 h-[18px] w-[18px] rounded-full bg-fg shadow transition-transform ${checked ? "translate-x-[22px] !bg-on-primary" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

interface Props {
  api: RaceApi;
  show: DisplayOptions;
  setShow: (s: DisplayOptions) => void;
  drawMode: boolean;
  setDrawMode: (v: boolean) => void;
}

export function Controls({ api, show, setShow, drawMode, setDrawMode }: Props) {
  const { settings } = api;
  const running = api.phase === "running";
  const lengths = Object.fromEntries(api.geoms.map((g) => [g.id, g.length])) as Partial<Record<RacerId, number>>;

  return (
    <div className="space-y-4">
      <Group title="Racers" hint="colour + shape + name">
        <ul className="space-y-1">
          {RACER_ORDER.map((id) => {
            const meta = RACERS[id];
            const isCustom = id === "custom";
            const disabled = running || (isCustom && !api.customPts);
            return (
              <li key={id}>
                <label className={`group flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-soft ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-[var(--primary)]"
                    checked={settings.enabled[id] && !(isCustom && !api.customPts)}
                    disabled={disabled}
                    onChange={(e) => api.setEnabled(id, e.target.checked)}
                  />
                  <ShapeIcon shape={meta.shape} color={`var(${meta.cssVar})`} />
                  <span className="text-sm font-medium text-fg">{meta.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-muted">{lengths[id] ? `${lengths[id]!.toFixed(2)} m` : ""}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex gap-2">
          <button className={`btn flex-1 !py-2 !text-xs ${drawMode ? "btn-primary" : "btn-secondary"}`} onClick={() => setDrawMode(!drawMode)} disabled={running} aria-pressed={drawMode}>
            <Pencil className="h-3.5 w-3.5" /> {drawMode ? "Drawing… (click to cancel)" : api.customPts ? "Redraw my path" : "Draw my own path"}
          </button>
          {api.customPts && (
            <button
              className="btn btn-ghost !px-3 !py-2"
              disabled={running}
              onClick={() => {
                api.setCustomPts(null);
                api.setEnabled("custom", false);
              }}
              aria-label="Delete my path"
              title="Delete my path"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </Group>

      <Group title="Finish point B" hint="or drag B on the track">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["W", "Across Δx", LIMITS.minW, LIMITS.maxW],
              ["H", "Drop Δh", LIMITS.minH, LIMITS.maxH],
            ] as const
          ).map(([k, label, min, max]) => (
            <label key={k} className="text-xs text-fg-2">
              <span className="flex justify-between">
                {label} <span className="font-mono text-fg">{settings[k].toFixed(2)} m</span>
              </span>
              <input type="range" className="range mt-2" min={min} max={max} step={0.05} value={settings[k]} disabled={running} onChange={(e) => api.update({ [k]: parseFloat(e.target.value) })} />
            </label>
          ))}
        </div>
      </Group>

      <Group title="Environment">
        <label className="block text-xs text-fg-2">
          <span className="flex justify-between">
            Friction μ <span className="font-mono text-fg">{settings.mu.toFixed(2)}</span>
          </span>
          <input type="range" className="range mt-2" min={0} max={0.5} step={0.01} value={settings.mu} disabled={running} onChange={(e) => api.update({ mu: parseFloat(e.target.value) })} />
          <span className="mt-1 flex justify-between text-[10px] text-muted">
            <span>ice 0</span>
            <span>wood 0.3</span>
            <span>rubber 0.5</span>
          </span>
        </label>
        <div className="mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Gravity">
          {GRAVITY.map((p) => (
            <button
              key={p.key}
              role="radio"
              aria-checked={settings.gKey === p.key}
              disabled={running}
              onClick={() => api.update({ gKey: p.key })}
              className={`rounded-xl border px-1 py-2 text-center text-[11px] transition-colors ${
                settings.gKey === p.key ? "border-secondary/60 bg-secondary/15 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"
              }`}
            >
              <span className="block text-base leading-none" aria-hidden="true">
                {p.emoji}
              </span>
              <span className="mt-1 block font-semibold">{p.label}</span>
              <span className="block font-mono text-[10px] text-muted">{p.g} m/s²</span>
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Toggle checked={settings.noise} onChange={(v) => api.update({ noise: v })} disabled={running} label="Real-world wobble (random bumps & release delay)" />
        </div>
      </Group>

      <Group title="Overlays">
        <Toggle checked={show.vectors} onChange={(v) => setShow({ ...show, vectors: v })} label="Velocity vectors" />
        <Toggle checked={show.trails} onChange={(v) => setShow({ ...show, trails: v })} label="Motion trails" />
        <Toggle checked={show.ghost} onChange={(v) => setShow({ ...show, ghost: v })} label="Ghost of previous run" />
        <Toggle checked={show.labels} onChange={(v) => setShow({ ...show, labels: v })} label="Path names & lengths" />
      </Group>
    </div>
  );
}
