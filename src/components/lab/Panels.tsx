"use client";

import { motion } from "motion/react";
import { Medal, Timer } from "lucide-react";
import type { RacerId } from "@/lib/physics/types";
import { RACERS } from "@/lib/racers";
import { ShapeIcon } from "./shapes";
import { effectiveFinish, racerStateAt, standings, type RaceApi } from "./useRace";

export function fmt(t: number | null | undefined, digits = 3) {
  return t === null || t === undefined ? "—" : `${t.toFixed(digits)} s`;
}

/** Live leaderboard overlay on the race canvas. */
export function Standings({ api, inline = false }: { api: RaceApi; inline?: boolean }) {
  const race = api.phase !== "idle" ? api.race : null;
  const t = api.hudT;
  const rows = race
    ? standings(race).map((r) => {
        const i = race.sims.findIndex((s) => s.id === r.id);
        const st = racerStateAt(race, i, t);
        const done = r.time !== null && t >= r.time;
        return { id: r.id, time: r.time, done, v: st.v, status: r.status };
      })
    : api.geoms.map((g) => ({ id: g.id, time: null as number | null, done: false, v: 0, status: "finished" as const }));
  const finishedOrder = rows.filter((r) => r.done).map((r) => r.id);
  const live = race ? [...rows].sort((a, b) => {
    const ia = finishedOrder.indexOf(a.id);
    const ib = finishedOrder.indexOf(b.id);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0;
  }) : rows;

  return (
    <div className={inline ? "border-t border-line p-3 text-xs sm:hidden" : "pointer-events-none absolute right-3 top-3 hidden w-[min(230px,44%)] rounded-2xl border border-line bg-surface/90 p-2.5 text-xs shadow-xl hc:bg-surface sm:right-4 sm:top-4 sm:block"}>
      <div className="mb-1.5 flex items-center gap-1.5 px-1 font-mono text-[11px] text-muted">
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="tabular-nums text-fg" aria-live="off">
          {t.toFixed(3)} s
        </span>
        {api.speed !== 1 && <span className="ml-auto rounded bg-secondary/20 px-1.5 text-secondary-soft">{api.speed}×</span>}
      </div>
      <ul className={inline ? "grid grid-cols-2 gap-x-2 gap-y-0.5" : "space-y-0.5"}>
        {live.map((r) => {
          const place = finishedOrder.indexOf(r.id);
          const dnf = race && t >= race.endTime && r.time === null;
          return (
            <motion.li layout key={r.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1" style={place === 0 ? { background: "color-mix(in srgb, var(--primary) 14%, transparent)" } : undefined}>
              <span className="w-4 text-center font-mono text-[10px] text-muted">{place >= 0 ? place + 1 : ""}</span>
              <ShapeIcon shape={RACERS[r.id].shape} color={`var(${RACERS[r.id].cssVar})`} size={12} />
              <span className="truncate font-medium text-fg-2">{RACERS[r.id].short}</span>
              {place === 0 && <Medal className="h-3.5 w-3.5 text-primary-soft" aria-label="winner" />}
              <span className="ml-auto font-mono tabular-nums text-fg">
                {dnf ? <span className="text-friction">DNF</span> : r.done ? r.time!.toFixed(3) : race ? `${r.v.toFixed(1)} m/s` : "ready"}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/** Potential / kinetic / friction-loss energy bars for one racer (m = 1 kg). */
export function EnergyPanel({ api, focus, setFocus }: { api: RaceApi; focus: RacerId; setFocus: (id: RacerId) => void }) {
  const race = api.phase !== "idle" ? api.race : null;
  const ids = (race ? race.sims.map((s) => s.id) : api.geoms.map((g) => g.id)) as RacerId[];
  const idx = race ? race.sims.findIndex((s) => s.id === focus) : -1;
  const geom = race ? race.geoms[idx] : api.geoms.find((g) => g.id === focus);
  const g = race ? race.g : api.g;
  let pe = 1;
  let ke = 0;
  let loss = 0;
  let E0 = 1;
  let height = 0;
  let speed = 0;
  let dist = 0;
  if (geom) {
    const ref = geom.maxDepth; // lowest point of this track is "zero height"
    E0 = g * ref;
    let y = 0;
    let v = 0;
    if (race && idx >= 0) {
      const st = racerStateAt(race, idx, api.hudT);
      y = st.y;
      v = st.v;
      dist = st.s;
    }
    height = ref - y;
    speed = v;
    pe = g * height;
    ke = 0.5 * v * v;
    loss = Math.max(0, E0 - pe - ke);
  }
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / (E0 || 1)) * 100))}%`;
  const Bar = ({ label, value, color, note }: { label: string; value: number; color: string; note: string }) => (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-fg-2">{label}</span>
        <span className="font-mono tabular-nums text-fg">{value.toFixed(2)} J</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-line bg-surface-soft" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={E0} aria-valuenow={value}>
        <div className="h-full rounded-full transition-[width] duration-100" style={{ width: pct(value), background: color }} />
      </div>
      <p className="mt-0.5 text-[11px] text-muted">{note}</p>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Choose racer for energy readout">
        {ids.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={focus === id}
            onClick={() => setFocus(id)}
            className={`chip cursor-pointer transition-colors ${focus === id ? "!border-primary/50 !bg-primary/15 !text-fg" : "hover:!text-fg"}`}
          >
            <ShapeIcon shape={RACERS[id].shape} color={`var(${RACERS[id].cssVar})`} size={11} /> {RACERS[id].short}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <Bar label="Potential energy" value={pe} color="var(--c-pe)" note="mgh — stored by height" />
        <Bar label="Kinetic energy" value={ke} color="var(--c-ke)" note="½mv² — energy of motion" />
        <Bar label="Lost to friction" value={loss} color="var(--c-friction)" note={api.settings.mu > 0 || race?.settings.mu ? "turned into heat" : "zero — no friction set"} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["height", `${height.toFixed(2)} m`],
          ["speed", `${speed.toFixed(2)} m/s`],
          ["travelled", `${dist.toFixed(2)}/${geom ? geom.length.toFixed(2) : "–"} m`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface-soft px-2 py-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted">{k}</dt>
            <dd className="font-mono text-xs tabular-nums text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-muted">Mass m = 1 kg, heights measured from the lowest point of this track.</p>
    </div>
  );
}

export function raceSummary(api: RaceApi) {
  const race = api.race;
  if (!race) return null;
  const st = standings(race);
  const winner = st[0]?.time !== null ? st[0].id : null;
  const cyc = effectiveFinish(race, "cycloid");
  const str = effectiveFinish(race, "straight");
  return { st, winner, cyc, str };
}
