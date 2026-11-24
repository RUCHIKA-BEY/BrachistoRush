"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, FlaskConical, Hand, Lightbulb, Moon, Pencil, Ruler, Shuffle, Sparkles, Target, Timer, Trophy, Waves, X } from "lucide-react";
import type { ReactNode } from "react";
import { maxSpeed } from "@/lib/physics/simulate";
import type { RacerId } from "@/lib/physics/types";
import { RACERS } from "@/lib/racers";
import { fmt, raceSummary } from "./Panels";
import { ShapeIcon } from "./shapes";
import { racerStateAt, theoryTimes, type RaceApi, type Settings, type Stage } from "./useRace";

const STAGES: { id: Stage; label: string; icon: ReactNode }[] = [
  { id: "predict", label: "Predict", icon: <Target className="h-4 w-4" /> },
  { id: "race", label: "Race", icon: <Timer className="h-4 w-4" /> },
  { id: "measure", label: "Measure", icon: <Ruler className="h-4 w-4" /> },
  { id: "explain", label: "Explain", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "vary", label: "Vary", icon: <FlaskConical className="h-4 w-4" /> },
];

export function Stepper({ api }: { api: RaceApi }) {
  const cur = STAGES.findIndex((s) => s.id === api.stage);
  const hasResult = api.phase === "finished";
  return (
    <nav aria-label="Inquiry steps" className="no-scrollbar overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {STAGES.map((s, i) => {
          const active = i === cur;
          const done = i < cur;
          const reachable = s.id === "predict" || s.id === "race" || hasResult;
          return (
            <li key={s.id} className="flex items-center gap-1 sm:gap-2">
              <button
                disabled={!reachable}
                onClick={() => api.setStage(s.id)}
                aria-current={active ? "step" : undefined}
                className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? "text-on-primary" : done ? "text-primary-soft hover:bg-surface-soft" : "text-muted hover:bg-surface-soft hover:text-fg"
                }`}
              >
                {active && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full bg-primary glow-teal" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative">{done ? <Check className="h-4 w-4" /> : s.icon}</span>
                <span className="relative">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.label}
                </span>
              </button>
              {i < STAGES.length - 1 && <span className={`h-px w-3 sm:w-6 ${i < cur ? "bg-primary" : "bg-line-strong"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Panel({ k, title, icon, children }: { k: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      key={k}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="card p-5"
      aria-labelledby={`panel-${k}`}
    >
      <h2 id={`panel-${k}`} className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary-soft">{icon}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

const EXPERIMENTS: { title: string; text: string; icon: ReactNode; patch?: Partial<Settings>; draw?: boolean; enable?: RacerId }[] = [
  { title: "Stretch it out", text: "Put B far away and low (3.5 m × 0.6 m). Watch the cycloid dip below B!", icon: <Waves className="h-4 w-4" />, patch: { W: 3.5, H: 0.6 } },
  { title: "Make it steep", text: "B almost straight below A (0.8 m × 1.6 m). Does the advantage shrink?", icon: <ArrowRight className="h-4 w-4 rotate-90" />, patch: { W: 0.8, H: 1.6 } },
  { title: "Add friction", text: "Set μ = 0.2 and add the friction-tuned curve. Is the cycloid still the best?", icon: <Sparkles className="h-4 w-4" />, patch: { mu: 0.2 }, enable: "frictionOpt" },
  { title: "Race on the Moon", text: "Weaker gravity: everyone is slower — but does the winner change?", icon: <Moon className="h-4 w-4" />, patch: { gKey: "moon" } },
  { title: "Draw a challenger", text: "Sketch your own path and try to beat the cycloid.", icon: <Pencil className="h-4 w-4" />, draw: true },
  { title: "Wobbly real track", text: "Turn on real-world wobble and run 5 trials. Is the win consistent?", icon: <Shuffle className="h-4 w-4" />, patch: { noise: true } },
];

export function StagePanel({ api, onDraw }: { api: RaceApi; onDraw: () => void }) {
  const ids = api.geoms.map((g) => g.id);
  const summary = api.phase === "finished" ? raceSummary(api) : null;
  const race = api.race;

  let content: ReactNode = null;

  if (api.stage === "predict") {
    content = (
      <Panel k="predict" title="Predict: which ball reaches B first?" icon={<Target className="h-4 w-4" />}>
        <p className="text-sm text-fg-2">Scientists guess before they test. Pick one — there&apos;s no penalty for being wrong!</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ids.map((id) => {
            const g = api.geoms.find((x) => x.id === id)!;
            const sel = api.prediction === id;
            return (
              <button
                key={id}
                onClick={() => api.setPrediction(id)}
                aria-pressed={sel}
                className={`relative rounded-2xl border p-3 text-left transition-all ${sel ? "border-primary bg-primary/10 glow-teal" : "border-line bg-surface-soft hover:border-line-strong"}`}
              >
                <span className="flex items-center gap-2">
                  <ShapeIcon shape={RACERS[id].shape} color={`var(${RACERS[id].cssVar})`} size={16} />
                  <span className="font-semibold text-fg">{RACERS[id].name}</span>
                </span>
                <span className="mt-1 block text-xs text-muted">length {g.length.toFixed(2)} m</span>
                {sel && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-primary-soft" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={api.start} disabled={!api.prediction || !ids.length}>
            Lock in &amp; race <ArrowRight className="h-4 w-4" />
          </button>
          <button className="btn btn-ghost" onClick={api.start} disabled={!ids.length}>
            Skip and race
          </button>
          {api.prediction && (
            <span className="text-xs text-muted">
              Your bet: <strong className="text-fg">{RACERS[api.prediction].name}</strong> — the{" "}
              {[...api.geoms].sort((a, b) => a.length - b.length)[0]?.id === api.prediction ? "shortest" : "not the shortest"} path.
            </span>
          )}
        </div>
      </Panel>
    );
  } else if (api.stage === "race") {
    const cycOn = race?.sims.some((s) => s.id === "cycloid");
    content = (
      <Panel k="race" title="Race! Can you time it by hand?" icon={<Timer className="h-4 w-4" />}>
        <p className="text-sm text-fg-2">
          In the physical model, timing with a stopwatch is tricky. Try it: tap the button the moment the <strong className="text-cycloid">● cycloid</strong> ball reaches B. We&apos;ll compare your time with the exact one.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {api.phase === "running" && cycOn ? (
            <button className="btn btn-secondary !px-6 !py-3 !text-base" onClick={api.tapStopwatch} disabled={api.stopwatch !== null}>
              <Hand className="h-5 w-5" /> {api.stopwatch !== null ? `Tapped at ${api.stopwatch.toFixed(2)} s` : "Tap: it's at B!"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={api.start} disabled={!ids.length}>
              Start race <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <span className="text-xs text-muted">Tip: use slow motion (0.25×) to study the start.</span>
        </div>
      </Panel>
    );
  } else if (api.stage === "measure" && summary && race) {
    const theory = theoryTimes(race);
    const fastest = summary.st[0]?.time ?? null;
    const sw = api.trials[api.trials.length - 1]?.stopwatch ?? null;
    const predOk = api.prediction ? api.prediction === summary.winner : null;
    content = (
      <Panel k="measure" title="Measure: what really happened?" icon={<Ruler className="h-4 w-4" />}>
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-sm">
              <caption className="sr-only">Race results</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-2 font-semibold">Path</th>
                  <th className="pb-2 text-right font-semibold">Time</th>
                  <th className="pb-2 text-right font-semibold">Behind</th>
                  <th className="pb-2 text-right font-semibold">Length</th>
                  <th className="pb-2 text-right font-semibold">Top speed</th>
                </tr>
              </thead>
              <tbody>
                {summary.st.map((r, i) => {
                  const gi = race.geoms.findIndex((g) => g.id === r.id);
                  const sim = race.sims[gi];
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="w-4 font-mono text-xs text-muted">{r.time !== null ? i + 1 : "–"}</span>
                          <ShapeIcon shape={RACERS[r.id].shape} color={`var(${RACERS[r.id].cssVar})`} />
                          <span className="font-medium text-fg">{RACERS[r.id].name}</span>
                          {i === 0 && r.time !== null && <Trophy className="h-4 w-4 text-primary-soft" aria-label="winner" />}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-fg">{r.time !== null ? fmt(r.time) : <span className="text-friction">{r.status === "stalled" ? "stuck" : "didn't reach B"}</span>}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-muted">{r.time !== null && fastest !== null && i > 0 ? `+${(r.time - fastest).toFixed(3)} s` : ""}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-fg-2">{race.geoms[gi].length.toFixed(2)} m</td>
                      <td className="py-2 text-right font-mono tabular-nums text-fg-2">{maxSpeed(sim).toFixed(2)} m/s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid content-start gap-2 text-sm sm:grid-cols-2 xl:w-60 xl:grid-cols-1">
            {predOk !== null && (
              <div className={`rounded-2xl border p-3 ${predOk ? "border-primary/40 bg-primary/10" : "border-secondary/40 bg-secondary/10"}`}>
                <p className="flex items-center gap-1.5 font-semibold text-fg">{predOk ? <Check className="h-4 w-4 text-primary-soft" /> : <X className="h-4 w-4 text-secondary-soft" />} Your prediction</p>
                <p className="mt-0.5 text-xs text-fg-2">
                  {predOk ? "Spot on! Can you explain why?" : `You picked ${RACERS[api.prediction!].name}. Surprised? Most people are — that's the fun part.`}
                </p>
              </div>
            )}
            {sw !== null && summary.cyc !== null && (
              <div className="rounded-2xl border border-line bg-surface-soft p-3">
                <p className="font-semibold text-fg">Your stopwatch</p>
                <p className="mt-0.5 font-mono text-xs text-fg-2">
                  you {sw.toFixed(2)} s · exact {summary.cyc.toFixed(3)} s
                </p>
                <p className="mt-0.5 text-xs text-muted">Off by {Math.abs(sw - summary.cyc).toFixed(2)} s — reaction time matters!</p>
              </div>
            )}
            {theory && summary.cyc !== null && (
              <div className="rounded-2xl border border-line bg-surface-soft p-3">
                <p className="font-semibold text-fg">Theory check ✓</p>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-fg-2">
                  cycloid θ·√(r/g) = {theory.cycloid.toFixed(3)} s<br />
                  {summary.str !== null && <>straight √(2L²/gh) = {theory.straight.toFixed(3)} s</>}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => api.setStage("explain")}>
            Explain it <ArrowRight className="h-4 w-4" />
          </button>
          <button className="btn btn-ghost" onClick={api.start}>
            Run another trial
          </button>
          <span className="self-center text-xs text-muted">Scrub the timeline above to read off speeds at any moment.</span>
        </div>
      </Panel>
    );
  } else if (api.stage === "explain" && summary && race) {
    content = <Explain api={api} />;
  } else if (api.stage === "vary") {
    content = (
      <Panel k="vary" title="Vary one thing — then predict again" icon={<FlaskConical className="h-4 w-4" />}>
        <p className="text-sm text-fg-2">Good experiments change just one variable. Pick an experiment; the lab sets it up for you.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIMENTS.map((e) => (
            <button
              key={e.title}
              className="group rounded-2xl border border-line bg-surface-soft p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-secondary/50"
              onClick={() => {
                if (e.patch) api.update(e.patch);
                if (e.enable) api.setEnabled(e.enable, true);
                api.setPrediction(null);
                api.setStage("predict");
                if (e.draw) onDraw();
              }}
            >
              <span className="flex items-center gap-2 font-semibold text-fg">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary/15 text-secondary-soft">{e.icon}</span>
                {e.title}
              </span>
              <span className="mt-1.5 block text-xs text-fg-2">{e.text}</span>
            </button>
          ))}
        </div>
      </Panel>
    );
  } else {
    content = (
      <Panel k="empty" title="Run a race first" icon={<Timer className="h-4 w-4" />}>
        <button className="btn btn-primary" onClick={api.start}>
          Start race <ArrowRight className="h-4 w-4" />
        </button>
      </Panel>
    );
  }

  return <AnimatePresence mode="wait">{content}</AnimatePresence>;
}

function Explain({ api }: { api: RaceApi }) {
  const race = api.race!;
  const sum = raceSummary(api)!;
  const iC = race.sims.findIndex((s) => s.id === "cycloid");
  const iS = race.sims.findIndex((s) => s.id === "straight");
  const haveBoth = iC >= 0 && iS >= 0 && sum.cyc !== null && sum.str !== null;
  const g = race.geoms;

  let snapshot: ReactNode = null;
  if (haveBoth) {
    const tq = Math.min(sum.cyc!, sum.str!) * 0.3;
    const c = racerStateAt(race, iC, tq);
    const s = racerStateAt(race, iS, tq);
    const lenPct = ((g[iC].length / g[iS].length - 1) * 100).toFixed(0);
    const timePct = ((1 - sum.cyc! / sum.str!) * 100).toFixed(0);
    const cycWon = sum.cyc! < sum.str!;
    snapshot = (
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">1 · The steep start</p>
          <p className="mt-2 text-sm text-fg-2">
            At <span className="font-mono text-fg">{tq.toFixed(2)} s</span> the cycloid ball was already doing <span className="font-mono font-semibold text-cycloid">{c.v.toFixed(2)} m/s</span>, the straight-line ball only{" "}
            <span className="font-mono font-semibold text-straight">{s.v.toFixed(2)} m/s</span>.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">2 · Height → speed</p>
          <p className="mt-2 text-sm text-fg-2">
            Dropping fast turns potential energy into kinetic energy early (<span className="text-pe">PE</span> → <span className="text-ke">KE</span>). The ball then spends the rest of the trip moving fast.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">3 · Longer but faster</p>
          <p className="mt-2 text-sm text-fg-2">
            The cycloid is <span className="font-mono font-semibold text-fg">{lenPct}%</span> longer, yet it {cycWon ? "finished" : "was"}{" "}
            <span className="font-mono font-semibold text-fg">{Math.abs(Number(timePct))}%</span> {cycWon ? "sooner" : "slower"}. Distance isn&apos;t everything — average speed matters!
          </p>
        </div>
      </div>
    );
  }

  const muNote = race.settings.mu > 0;
  return (
    <Panel k="explain" title="Explain: why did that happen?" icon={<Lightbulb className="h-4 w-4" />}>
      {snapshot ?? <p className="text-sm text-fg-2">Turn on the cycloid and the straight line to get a side-by-side explanation built from your own race data.</p>}
      <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-sm text-fg-2">
        <p className="font-semibold text-fg">The big idea</p>
        <p className="mt-1">
          The cycloid finds the perfect balance: steep enough at the start to build speed quickly, but not so deep that the extra distance wastes time. No other curve balances it better. Johann Bernoulli posed this puzzle in 1696; he, Newton, Leibniz and others solved it in 1697.
          {muNote && " With friction, the balance shifts slightly: compare the cycloid with the friction-tuned curve!"}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => api.setStage("vary")}>
          Now vary one thing <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Panel>
  );
}
