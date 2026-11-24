"use client";

import { Download, Trash2 } from "lucide-react";
import type { RacerId } from "@/lib/physics/types";
import { GRAVITY, RACERS, RACER_ORDER } from "@/lib/racers";
import { ShapeIcon } from "./shapes";
import type { Trial } from "./useRace";

function stats(xs: number[]) {
  if (!xs.length) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)) : 0;
  return { mean, sd };
}

function toCsv(trials: Trial[], cols: RacerId[]) {
  const head = ["trial", "dx_m", "dh_m", "mu", "planet", "wobble", ...cols.map((c) => `${c}_s`), "winner", "prediction", "stopwatch_s"];
  const rows = trials.map((t) => [
    t.n,
    t.W.toFixed(2),
    t.H.toFixed(2),
    t.mu.toFixed(2),
    t.planet,
    t.noise ? "yes" : "no",
    ...cols.map((c) => (t.times[c] === undefined ? "" : t.times[c] === null ? "DNF" : t.times[c]!.toFixed(4))),
    t.winner ?? "",
    t.prediction ?? "",
    t.stopwatch === null ? "" : t.stopwatch.toFixed(3),
  ]);
  return [head, ...rows].map((r) => r.join(",")).join("\n");
}

export function TrialLog({ trials, onClear }: { trials: Trial[]; onClear: () => void }) {
  const cols = RACER_ORDER.filter((id) => trials.some((t) => t.times[id] !== undefined));
  const cycWins = trials.filter((t) => t.winner === "cycloid").length;
  const correct = trials.filter((t) => t.prediction && t.prediction === t.winner).length;
  const predicted = trials.filter((t) => t.prediction).length;

  const download = () => {
    const blob = new Blob([toCsv(trials, cols)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brachistorush-trials.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card p-5" aria-labelledby="trials-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="trials-title" className="font-display text-lg font-semibold text-fg">
          Lab notebook
        </h2>
        <span className="chip">{trials.length} trials</span>
        {trials.length > 0 && (
          <>
            <span className="chip border-primary/30 bg-primary/10 text-primary-soft">cycloid won {cycWins}/{trials.length}</span>
            {predicted > 0 && <span className="chip">predictions right {correct}/{predicted}</span>}
            <div className="ml-auto flex gap-2">
              <button className="btn btn-secondary !py-2 !text-xs" onClick={download}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button className="btn btn-ghost !py-2 !text-xs" onClick={onClear}>
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </>
        )}
      </div>
      {trials.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Every race you finish is recorded here automatically — with the settings, each path&apos;s time and the winner. Run several to see how consistent the result is.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <caption className="sr-only">All recorded trials</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Setup</th>
                {cols.map((c) => (
                  <th key={c} className="pb-2 text-right font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <ShapeIcon shape={RACERS[c].shape} color={`var(${RACERS[c].cssVar})`} size={11} /> {RACERS[c].short}
                    </span>
                  </th>
                ))}
                <th className="pb-2 text-right font-semibold">Winner</th>
              </tr>
            </thead>
            <tbody>
              {[...trials].reverse().map((t) => (
                <tr key={t.n} className="border-t border-line">
                  <td className="py-1.5 font-mono text-xs text-muted">{t.n}</td>
                  <td className="py-1.5 text-xs text-fg-2">
                    {t.W.toFixed(2)}×{t.H.toFixed(2)} m · μ {t.mu.toFixed(2)} · {GRAVITY.find((g) => g.key === t.planet)?.label}
                    {t.noise && " · wobble"}
                  </td>
                  {cols.map((c) => {
                    const v = t.times[c];
                    return (
                      <td key={c} className={`py-1.5 text-right font-mono text-xs tabular-nums ${t.winner === c ? "font-bold text-primary-soft" : "text-fg"}`}>
                        {v === undefined ? "" : v === null ? <span className="text-friction">DNF</span> : v.toFixed(3)}
                      </td>
                    );
                  })}
                  <td className="py-1.5 text-right text-xs text-fg">{t.winner ? RACERS[t.winner].short : "—"}</td>
                </tr>
              ))}
            </tbody>
            {trials.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-line-strong">
                  <td />
                  <td className="py-2 text-xs font-semibold text-fg-2">mean ± σ</td>
                  {cols.map((c) => {
                    const s = stats(trials.map((t) => t.times[c]).filter((x): x is number => typeof x === "number"));
                    return (
                      <td key={c} className="py-2 text-right font-mono text-xs tabular-nums text-fg">
                        {s ? `${s.mean.toFixed(3)} ± ${s.sd.toFixed(3)}` : "—"}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
          <p className="mt-2 text-[11px] text-muted">Tip: σ is the spread. Without wobble the digital race is perfectly repeatable (σ = 0 for identical setups) — something a stopwatch can never give you.</p>
        </div>
      )}
    </section>
  );
}
