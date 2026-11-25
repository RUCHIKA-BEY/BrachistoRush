"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clock } from "./clock";
import { runBall, type BallRun } from "./physics";
import { frameOf, toLocal, toWorld, trackPath } from "./tracks";
import { BALLS, GRAVITY, TABLE, TRACKS, type BallKind, type BallObj, type CameraMode, type GravityId, type PlaceItem, type TableObj, type TrackObj, type TrackShape } from "./types";

export type LabMode = "race" | "build";
export const RACE_ORDER: TrackShape[] = ["cycloid", "straight", "arc", "parabola", "custom"];
export const LANE_GAP = 0.34;

export type RunStatus = "idle" | "running" | "paused" | "finished";

export interface RunRecord {
  id: string;
  at: number;
  ball: BallKind;
  shape: TrackObj["shape"];
  W: number;
  H: number;
  g: GravityId;
  mu: number;
  time: number | null;
  vmax: number;
  outcome: "finished" | "stalled" | "timeout";
}

export interface Settings {
  gravity: GravityId;
  mu: number;
  clearBoards: boolean;
  liveForces: boolean;
  snap: boolean;
  speed: number;
  camera: CameraMode;
  /** race mode: shared finish point and ball type */
  raceW: number;
  raceH: number;
  raceBall: BallKind;
  /** drops to "low" (no post effects, lower resolution) when the frame rate falls */
  quality: "high" | "low";
}

interface LabState {
  mode: LabMode;
  objects: TableObj[];
  selectedId: string | null;
  placing: PlaceItem | null;
  dragging: boolean;
  status: RunStatus;
  runs: Record<string, BallRun>; // by ball id, for the current release
  duration: number;
  settings: Settings;
  log: RunRecord[];
  /** bumps when the camera should re-apply its current preset */
  cameraNonce: number;

  select: (id: string | null) => void;
  setPlacing: (p: PlaceItem | null) => void;
  setDragging: (d: boolean) => void;
  place: (p: PlaceItem, x: number, z: number) => string;
  update: <T extends TableObj>(id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  dropBall: (id: string, x: number, z: number) => void;
  lineUp: () => void;
  clearTable: () => void;
  resetTable: () => void;
  set: (patch: Partial<Settings>) => void;
  setCamera: (c: CameraMode) => void;

  release: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  finish: () => void;
  clearLog: () => void;

  setMode: (m: LabMode) => void;
  layoutRace: () => void;
  toggleRaceTrack: (shape: TrackShape) => void;
  setRace: (patch: Partial<Pick<Settings, "raceW" | "raceH" | "raceBall">>) => void;
  /** put a ball (an existing one, or a new one of `kind`) into a track's start gate */
  putBallOn: (trackId: string, ballId: string | null, kind?: BallKind) => void;
}

let counter = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

function defaultObjects(): TableObj[] {
  return [
    { id: "t-cyc", type: "track", shape: "cycloid", x: -0.1, z: -0.22, rot: 0, W: 1.2, H: 0.55 },
    { id: "t-str", type: "track", shape: "straight", x: -0.1, z: 0.22, rot: 0, W: 1.2, H: 0.55 },
    { id: "b-1", type: "ball", kind: "steel", x: 0, z: 0, trackId: "t-cyc" },
    { id: "b-2", type: "ball", kind: "steel", x: 0, z: 0, trackId: "t-str" },
    { id: "sw-1", type: "stopwatch", x: 0.95, z: 0.62, rot: -0.5 },
  ];
}

const clampToTable = (x: number, z: number) => ({
  x: Math.max(-TABLE.width / 2 + 0.05, Math.min(TABLE.width / 2 - 0.05, x)),
  z: Math.max(-TABLE.depth / 2 + 0.05, Math.min(TABLE.depth / 2 - 0.05, z)),
});

/** World position of a track's start gate (point A) on the table plane. */
export function trackStartWorld(t: TrackObj) {
  const path = trackPath(t);
  const fr = frameOf(path, t.W);
  return toWorld(t, fr.lx(0), 0);
}

/** Which track would a ball dropped at (x, z) snap into? */
export function snapTrackFor(objects: TableObj[], x: number, z: number, exceptBall?: string): TrackObj | null {
  let best: TrackObj | null = null;
  let bestD = Infinity;
  for (const o of objects) {
    if (o.type !== "track") continue;
    const a = trackStartWorld(o);
    const dA = Math.hypot(a.x - x, a.z - z);
    const loc = toLocal(o, x, z);
    const onBoard = Math.abs(loc.z) < 0.12 && loc.x > -o.W / 2 - 0.15 && loc.x < o.W / 2 + 0.05;
    const d = onBoard ? Math.min(dA, Math.abs(loc.z)) : dA;
    if ((dA < 0.3 || onBoard) && d < bestD) {
      bestD = d;
      best = o;
    }
  }
  void exceptBall;
  return best;
}

/** localStorage writes are batched: dragging a part would otherwise write on every pointer move. */
const batchedStorage = (() => {
  const pending = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    for (const [k, v] of pending) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* storage full or blocked */
      }
    }
    pending.clear();
  };
  if (typeof window !== "undefined") window.addEventListener("pagehide", flush);
  return {
    getItem: (k: string) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k: string, v: string) => {
      pending.set(k, v);
      clearTimeout(timer);
      timer = setTimeout(flush, 500);
    },
    removeItem: (k: string) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
})();

const DEFAULT_SETTINGS: Settings = {
  gravity: "earth",
  mu: 0,
  clearBoards: true, // see-through boards so every lane's ball stays visible
  liveForces: false,
  snap: true,
  speed: 1,
  camera: "free",
  raceW: 1.2,
  raceH: 0.55,
  raceBall: "steel",
  quality: "high",
};

export const useLab = create<LabState>()(
  persist(
    (set, get) => {
      /** Any edit after a finished run puts the table back to its start state. */
      const editable = () => {
        const s = get().status;
        if (s === "running" || s === "paused") return false;
        if (s === "finished") get().reset();
        return true;
      };

      return {
        mode: "race",
        objects: defaultObjects(),
        selectedId: null,
        placing: null,
        dragging: false,
        status: "idle",
        runs: {},
        duration: 0,
        settings: DEFAULT_SETTINGS,
        log: [],
        cameraNonce: 0,

        select: (id) => set({ selectedId: id }),
        setPlacing: (p) => {
          if (p && !editable()) return;
          set({ placing: p, selectedId: p ? null : get().selectedId });
        },
        setDragging: (d) => set({ dragging: d }),

        place: (p, x, z) => {
          editable();
          const c = clampToTable(x, z);
          const id = uid(p.type[0]);
          let obj: TableObj;
          if (p.type === "track") {
            obj = { id, type: "track", shape: p.shape, x: c.x, z: c.z, rot: 0, W: 1.2, H: 0.55, ...(p.shape === "custom" ? { handles: [[0.12, 0.75], [0.55, 1.05]] as [number, number][] } : {}) };
          } else if (p.type === "ball") {
            obj = { id, type: "ball", kind: p.kind, x: c.x, z: c.z, trackId: null };
          } else {
            obj = { id, type: "stopwatch", x: c.x, z: c.z, rot: 0 };
          }
          set({ objects: [...get().objects, obj], selectedId: id });
          if (obj.type === "ball") get().dropBall(id, c.x, c.z);
          return id;
        },

        update: (id, patch) => {
          if (!editable()) return;
          set({ objects: get().objects.map((o) => (o.id === id ? ({ ...o, ...patch } as TableObj) : o)) });
        },

        remove: (id) => {
          if (!editable()) return;
          set({
            objects: get()
              .objects.filter((o) => o.id !== id)
              .map((o) => (o.type === "ball" && o.trackId === id ? { ...o, trackId: null, ...trackStartLoose(get().objects, id) } : o)),
            selectedId: get().selectedId === id ? null : get().selectedId,
          });
        },

        duplicate: (id) => {
          if (!editable()) return;
          const o = get().objects.find((q) => q.id === id);
          if (!o) return;
          const nid = uid(o.type[0]);
          const shift = o.type === "track" ? toWorld({ x: o.x, z: o.z, rot: o.rot }, 0, 0.36) : { x: o.x + 0.12, z: o.z + 0.12 };
          const copy = { ...o, id: nid, ...clampToTable(shift.x, shift.z), ...(o.type === "ball" ? { trackId: null } : {}) } as TableObj;
          set({ objects: [...get().objects, copy], selectedId: nid });
          if (copy.type === "ball") get().dropBall(nid, copy.x, copy.z);
        },

        dropBall: (id, x, z) => {
          const objs = get().objects;
          const ball = objs.find((o) => o.id === id);
          if (!ball || ball.type !== "ball") return;
          const c = clampToTable(x, z);
          const track = snapTrackFor(objs, c.x, c.z, id);
          set({
            objects: objs.map((o) => {
              if (o.id === id) return { ...o, ...c, trackId: track ? track.id : null } as BallObj;
              // one ball per gate: the previous occupant rolls off to the side of the start
              if (track && o.type === "ball" && o.trackId === track.id) {
                const a = trackStartWorld(track);
                const side = toWorld({ x: a.x, z: a.z, rot: track.rot }, -0.1, 0.12);
                return { ...o, trackId: null, ...clampToTable(side.x, side.z) };
              }
              return o;
            }),
          });
        },

        lineUp: () => {
          if (!editable()) return;
          const objs = get().objects;
          const tracks = objs.filter((o): o is TrackObj => o.type === "track");
          if (!tracks.length) return;
          const ref = tracks[0];
          const gap = 0.3;
          set({
            objects: objs.map((o) => {
              if (o.type !== "track") return o;
              const i = tracks.indexOf(o);
              return { ...o, x: 0, z: (i - (tracks.length - 1) / 2) * gap, rot: 0, W: ref.W, H: ref.H };
            }),
          });
          get().setCamera("side");
        },

        clearTable: () => {
          if (!editable()) return;
          set({ objects: [], selectedId: null });
        },
        resetTable: () => {
          get().reset();
          set({ objects: defaultObjects(), selectedId: null });
        },

        set: (patch) => {
          const physics = "gravity" in patch || "mu" in patch;
          if (physics && !editable()) return;
          set({ settings: { ...get().settings, ...patch } });
        },
        setCamera: (c) => set({ settings: { ...get().settings, camera: c }, cameraNonce: get().cameraNonce + 1 }),

        release: () => {
          const { objects, settings, status } = get();
          if (status !== "idle") get().reset();
          const g = GRAVITY[settings.gravity].g;
          const runs: Record<string, BallRun> = {};
          let duration = 0;
          for (const o of objects) {
            if (o.type !== "ball" || !o.trackId) continue;
            const t = objects.find((q): q is TrackObj => q.id === o.trackId && q.type === "track");
            if (!t) continue;
            const r = runBall(o.id, t.id, o.kind, trackPath(t), t.W, g, settings.mu);
            runs[o.id] = r;
            duration = Math.max(duration, r.end);
          }
          if (!Object.keys(runs).length) return;
          clock.t = 0;
          clock.running = true;
          set({ runs, duration, status: "running", placing: null });
        },
        pause: () => {
          if (get().status !== "running") return;
          clock.running = false;
          set({ status: "paused" });
        },
        resume: () => {
          if (get().status !== "paused") return;
          if (clock.t >= get().duration) return get().finish();
          clock.running = true;
          set({ status: "running" });
        },
        reset: () => {
          clock.running = false;
          clock.t = 0;
          set({ status: "idle", runs: {}, duration: 0 });
        },
        finish: () => {
          const { runs, objects, settings, status } = get();
          clock.running = false;
          clock.t = get().duration;
          if (status === "finished") return;
          const records: RunRecord[] = [];
          for (const r of Object.values(runs)) {
            const t = objects.find((q): q is TrackObj => q.id === r.trackId && q.type === "track");
            if (!t) continue;
            let vmax = 0;
            for (let i = 0; i < r.sim.samples; i++) vmax = Math.max(vmax, Math.abs(r.sim.v[i]));
            records.push({
              id: uid("r"),
              at: Date.now(),
              ball: r.kind,
              shape: t.shape,
              W: t.W,
              H: t.H,
              g: settings.gravity,
              mu: settings.mu,
              time: r.sim.finishTime,
              vmax,
              outcome: r.sim.status,
            });
          }
          set({ status: "finished", log: [...records, ...get().log].slice(0, 200) });
        },
        clearLog: () => set({ log: [] }),

        setMode: (m) => {
          if (get().status !== "idle") get().reset();
          set({ mode: m, selectedId: null, placing: null });
          if (m === "race") get().layoutRace();
          get().setCamera("free");
        },

        layoutRace: () => {
          const { objects, settings } = get();
          // one lane per track shape, in a fixed order, all sharing the same A and B
          const seen = new Set<TrackShape>();
          const tracks = objects
            .filter((o): o is TrackObj => o.type === "track")
            .filter((t) => {
              if (seen.has(t.shape)) return false;
              seen.add(t.shape);
              return true;
            })
            .sort((a, b) => RACE_ORDER.indexOf(a.shape) - RACE_ORDER.indexOf(b.shape));
          const n = tracks.length;
          const laid: TableObj[] = tracks.map((t, i) => ({ ...t, x: 0, z: (i - (n - 1) / 2) * LANE_GAP, rot: 0, W: settings.raceW, H: settings.raceH }));
          // exactly one ball of the chosen kind in every start gate
          for (const t of tracks) {
            const old = objects.find((o): o is BallObj => o.type === "ball" && o.trackId === t.id);
            laid.push({ id: old?.id ?? uid("b"), type: "ball", kind: settings.raceBall, x: 0, z: 0, trackId: t.id });
          }
          const sw = objects.find((o) => o.type === "stopwatch");
          laid.push({ id: sw?.id ?? uid("s"), type: "stopwatch", x: settings.raceW / 2 + 0.05, z: ((n - 1) / 2) * LANE_GAP + 0.32, rot: -0.35 });
          set({ objects: laid });
        },

        toggleRaceTrack: (shape) => {
          if (!editable()) return;
          const { objects } = get();
          const existing = objects.find((o): o is TrackObj => o.type === "track" && o.shape === shape);
          if (existing) {
            if (objects.filter((o) => o.type === "track").length <= 1) return; // keep at least one lane
            set({ objects: objects.filter((o) => o.id !== existing.id && !(o.type === "ball" && o.trackId === existing.id)) });
          } else {
            const t: TrackObj = {
              id: uid("t"),
              type: "track",
              shape,
              x: 0,
              z: 0,
              rot: 0,
              W: 1.2,
              H: 0.55,
              ...(shape === "custom" ? { handles: [[0.12, 0.75], [0.55, 1.05]] as [number, number][] } : {}),
            };
            set({ objects: [...objects, t] });
          }
          get().layoutRace();
        },

        setRace: (patch) => {
          if (!editable()) return;
          set({ settings: { ...get().settings, ...patch } });
          get().layoutRace();
        },

        putBallOn: (trackId, ballId, kind) => {
          editable();
          const objs = get().objects;
          const track = objs.find((o): o is TrackObj => o.id === trackId && o.type === "track");
          if (!track) return;
          let id = ballId;
          let list = objs;
          if (!id) {
            id = uid("b");
            list = [...objs, { id, type: "ball", kind: kind ?? "steel", x: track.x, z: track.z, trackId: null }];
          }
          const a = trackStartWorld(track);
          set({
            objects: list.map((o) => {
              if (o.id === id) return { ...(o as BallObj), trackId, x: a.x, z: a.z };
              if (o.type === "ball" && o.trackId === trackId) {
                // the previous occupant moves onto the table beside the start
                const side = toWorld({ x: a.x, z: a.z, rot: track.rot }, -0.1, 0.14);
                return { ...o, trackId: null, ...clampToTable(side.x, side.z) };
              }
              return o;
            }),
            selectedId: id,
          });
        },
      };
    },
    {
      name: "br-lab-table",
      version: 2,
      storage: createJSONStorage(() => batchedStorage),
      partialize: (s) => ({ mode: s.mode, objects: s.objects, settings: { ...s.settings, camera: "free" as CameraMode, speed: 1 }, log: s.log }),
      // v1 saves had no race mode: returning students start in the simpler race mode
      migrate: (persisted, version) => (version < 2 ? { ...(persisted as object), mode: "race" as LabMode } : persisted) as LabState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LabState>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.mode === "race") state.layoutRace();
      },
    },
  ),
);

/** Where a ball goes when its track is deleted: just beside the old start gate. */
function trackStartLoose(objects: TableObj[], trackId: string) {
  const t = objects.find((o): o is TrackObj => o.id === trackId && o.type === "track");
  if (!t) return {};
  const a = trackStartWorld(t);
  return clampToTable(a.x - 0.12, a.z);
}

/** The ball the camera and the full data card focus on: the selected ball, else the cycloid's, else any ball on a track. */
export function focusBallId(st: { objects: TableObj[]; selectedId: string | null }): string | null {
  const sel = st.objects.find((o) => o.id === st.selectedId);
  if (sel?.type === "ball" && sel.trackId) return sel.id;
  const balls = st.objects.filter((o): o is BallObj => o.type === "ball" && !!o.trackId);
  const onCycloid = balls.find((b) => st.objects.some((t) => t.id === b.trackId && t.type === "track" && t.shape === "cycloid"));
  return (onCycloid ?? balls[0])?.id ?? null;
}

export function ballLabel(kind: BallKind) {
  return BALLS[kind].label;
}
export function trackLabel(t: TrackObj) {
  return TRACKS[t.shape].label;
}

// handy for debugging in the browser console during development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __lab: typeof useLab }).__lab = useLab;
