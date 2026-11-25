"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Keyboard, Settings2, SlidersHorizontal, X } from "lucide-react";
import { clock } from "@/lib/lab3d/clock";
import { useLab } from "@/lib/lab3d/store";
import { BALLS, GRAVITY, TRACKS, type TrackObj } from "@/lib/lab3d/types";
import { setLabSnapshot } from "@/lib/tutor/bridge";
import { useThemeColors } from "@/lib/useThemeColors";
import { Inspector, RunBar, RunLog, SettingsPanel, Tray } from "./LabUI";

const TableCanvas = dynamic(() => import("./TableCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-sm text-muted">Setting up the lab table…</div>,
});

/** Plain-text summary of the table for the tutor. */
function snapshot(): string {
  const st = useLab.getState();
  const tracks = st.objects.filter((o): o is TrackObj => o.type === "track");
  const parts = tracks.map((t) => {
    const b = st.objects.find((o) => o.type === "ball" && o.trackId === t.id);
    const run = b ? st.runs[b.id] : undefined;
    const res = run ? (run.sim.finishTime !== null ? `finished in ${run.sim.finishTime.toFixed(3)} s` : `did not reach B (${run.sim.status})`) : "";
    return `${TRACKS[t.shape].label} track (A→B ${t.W.toFixed(2)} m across, ${t.H.toFixed(2)} m drop)${b && b.type === "ball" ? ` with a ${BALLS[b.kind].label.toLowerCase()}` : " with no ball"}${res ? `, ${res}` : ""}`;
  });
  const g = GRAVITY[st.settings.gravity];
  const state =
    st.status === "paused"
      ? `Time is frozen at t = ${clock.t.toFixed(3)} s (the student is inspecting forces and energy).`
      : st.status === "finished"
        ? "The run has finished."
        : st.status === "running"
          ? "A run is in progress."
          : "No run yet (balls waiting at the start gates).";
  return `3D Lab Table. Gravity ${g.label} (${g.g} m/s²), friction μ = ${st.settings.mu.toFixed(2)}. ${parts.length ? parts.join("; ") : "The table has no tracks yet"}. ${state} Rolling balls keep part of their energy as spin (solid ball I = 2/5 mr², hollow 2/3 mr²); the bead slides without spinning.`;
}

const KEYS: [string, string][] = [
  ["Space", "Release · freeze · resume"],
  ["R", "Reset balls to the gates"],
  ["Q / E", "Turn selected part"],
  ["D", "Duplicate selected"],
  ["Del", "Delete selected"],
  ["F", "Follow camera"],
  ["Esc", "Cancel / deselect"],
  ["Drag", "Orbit · right-drag pans · wheel zooms"],
];

export function LabTable() {
  const { colors } = useThemeColors();
  const selectedId = useLab((s) => s.selectedId);
  const logCount = useLab((s) => s.log.length);
  const [showSettings, setShowSettings] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    try {
      setHint(localStorage.getItem("br-table-hint") !== "1");
    } catch {
      /* ignore */
    }
  }, []);
  const dismissHint = () => {
    setHint(false);
    try {
      localStorage.setItem("br-table-hint", "1");
    } catch {
      /* ignore */
    }
  };

  // keep the tutor informed about the table
  useEffect(() => {
    setLabSnapshot(snapshot());
    const unsub = useLab.subscribe(() => setLabSnapshot(snapshot()));
    return () => {
      unsub();
      setLabSnapshot("");
    };
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (el?.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const st = useLab.getState();
      const sel = st.objects.find((o) => o.id === st.selectedId);
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (st.status === "running") st.pause();
          else if (st.status === "paused") st.resume();
          else st.release();
          break;
        case "Escape":
          if (st.placing) st.setPlacing(null);
          else st.select(null);
          break;
        case "Delete":
        case "Backspace":
          if (sel) st.remove(sel.id);
          break;
        case "d":
        case "D":
          if (sel) st.duplicate(sel.id);
          break;
        case "q":
        case "Q":
        case "e":
        case "E":
          if (sel && "rot" in sel) st.update(sel.id, { rot: sel.rot + (e.key.toLowerCase() === "q" ? 1 : -1) * (Math.PI / 12) });
          break;
        case "r":
        case "R":
          st.reset();
          break;
        case "f":
        case "F":
          st.setCamera(st.settings.camera === "follow" ? "free" : "follow");
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[520px] w-full overflow-hidden bg-bg">
      {colors && <TableCanvas colors={colors} />}

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="glass pointer-events-auto rounded-2xl px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-soft">Step 3 · Race Lab</p>
          <h1 className="font-display text-base font-bold leading-tight text-fg sm:text-lg">3D Lab Table</h1>
          <Link href="/lab/classic" className="text-[11px] text-muted underline-offset-2 hover:text-fg hover:underline">
            Classic measuring lab →
          </Link>
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <button type="button" className="glass grid h-10 w-10 place-items-center rounded-xl text-fg-2 hover:text-fg" onClick={() => setShowKeys((v) => !v)} aria-label="Keyboard shortcuts" aria-expanded={showKeys}>
            <Keyboard className="h-4.5 w-4.5" />
          </button>
          <button type="button" className="glass inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-fg-2 hover:text-fg" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
            <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Lab settings</span>
          </button>
        </div>
      </div>

      {/* left: parts tray */}
      <div className="pointer-events-none absolute left-3 right-3 top-[5.6rem] z-10 md:bottom-24 md:right-auto">
        <Tray />
      </div>

      {/* right: settings + inspector */}
      <div className="pointer-events-none absolute bottom-40 right-3 top-[9.5rem] z-10 flex w-[calc(100%-1.5rem)] flex-col items-end gap-2 overflow-y-auto md:bottom-24 md:top-16 md:w-72">
        {showKeys && (
          <div className="glass pointer-events-auto w-full rounded-2xl p-3 md:w-72">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-fg">Controls</h2>
              <button type="button" onClick={() => setShowKeys(false)} className="rounded-lg p-1 text-muted hover:text-fg" aria-label="Close controls">
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {KEYS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded border border-line bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-fg">{k}</kbd>
                  </dt>
                  <dd className="text-fg-2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {selectedId && <Inspector />}
      </div>

      {/* bottom: run bar + log */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-col items-start gap-2 pr-16 md:items-center md:pr-20">
        {showLog && <RunLog onClose={() => setShowLog(false)} />}
        <RunBar onLog={() => setShowLog((v) => !v)} logCount={logCount} />
      </div>

      {hint && (
        <div className="glass absolute left-1/2 top-3 z-20 hidden max-w-md -translate-x-1/2 rounded-2xl p-3 text-sm text-fg-2 shadow-xl lg:block">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-soft" />
            <p>
              <strong className="text-fg">Welcome to the lab table.</strong> Pick a part from the tray and click the table to place it. Drag parts to move them, use the ring to turn them, and drop a ball near a track&apos;s <strong>A</strong>. Press{" "}
              <kbd className="rounded border border-line px-1 font-mono text-[11px]">Space</kbd> to release, and again to freeze time.
            </p>
            <button type="button" onClick={dismissHint} className="rounded-lg p-1 text-muted hover:text-fg" aria-label="Dismiss tip">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
