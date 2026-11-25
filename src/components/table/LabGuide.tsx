"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Mic, Volume2, VolumeX, X } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { useLab } from "@/lib/lab3d/store";
import { BALLS, GRAVITY, TRACKS, type TrackObj, type TrackShape } from "@/lib/lab3d/types";
import { askTutor } from "@/lib/tutor/bridge";
import { canListen, canSpeak, listenOnce, speak, stopSpeaking } from "@/lib/voice";
import { CycloMark } from "@/components/chat/CycloMark";

type StepId = "hello" | "tracks" | "predict" | "release" | "freeze" | "inspect" | "result" | "explore";
const ORDER: StepId[] = ["hello", "tracks", "predict", "release", "freeze", "inspect", "result", "explore"];

interface GuideState {
  open: boolean;
  step: StepId;
  muted: boolean;
  seen: boolean;
  guess: TrackShape | null;
  /** what the last finished race taught, saved when it finished (a reset must not erase it) */
  result: { title: string; say: string } | null;
  setResult: (r: { title: string; say: string } | null) => void;
  setOpen: (o: boolean) => void;
  go: (s: StepId) => void;
  setMuted: (m: boolean) => void;
  setGuess: (g: TrackShape | null) => void;
}

export const useGuide = create<GuideState>()(
  persist(
    (set) => ({
      open: true,
      step: "hello",
      muted: false,
      seen: false,
      guess: null,
      result: null,
      setResult: (result) => set({ result }),
      setOpen: (open) => set(open ? { open, step: "hello", guess: null } : { open, seen: true }),
      go: (step) => set({ step }),
      setMuted: (muted) => set({ muted }),
      setGuess: (guess) => set({ guess }),
    }),
    { name: "br-lab-guide", partialize: (s) => ({ muted: s.muted, seen: s.seen, open: s.open }) },
  ),
);

const name = (s: TrackShape) => TRACKS[s].label.toLowerCase();

/** Who won the last race, from the recorded runs. */
function raceResult() {
  const st = useLab.getState();
  const rows = Object.values(st.runs)
    .map((r) => {
      const t = st.objects.find((o): o is TrackObj => o.id === r.trackId && o.type === "track");
      return t ? { shape: t.shape, time: r.sim.finishTime } : null;
    })
    .filter((x): x is { shape: TrackShape; time: number | null } => !!x)
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  return rows;
}

function resultText(guess: TrackShape | null): { title: string; say: string } {
  const rows = raceResult();
  const win = rows[0];
  if (!win || win.time === null) return { title: "Race over", say: "Hmm, no ball reached B that time. Try less friction and race again." };
  const second = rows[1];
  const gap = second?.time ? ` The ${name(second.shape)} took ${second.time.toFixed(2)} seconds.` : "";
  const judged = guess ? (guess === win.shape ? " You guessed right. Great thinking!" : ` You guessed the ${name(guess)}. Surprises are how scientists learn!`) : "";
  const why =
    win.shape === "cycloid"
      ? " The cycloid is longer, but it drops steeply at the start, so its ball gets fast early and stays fast for most of the trip."
      : " The winning track drops steeply early, so its ball gets fast sooner.";
  return { title: `The ${name(win.shape)} won!`, say: `The ${name(win.shape)} won in ${win.time.toFixed(2)} seconds!${gap}${judged}${why}` };
}

function stepText(step: StepId, guess: TrackShape | null, result: { title: string; say: string } | null): { title: string; say: string; target?: string } {
  const st = useLab.getState();
  switch (step) {
    case "hello":
      return {
        title: "Welcome to the race table!",
        say: "Hi, I'm Cyclo! Every track here starts at the same height, called A, and ends at the same spot, called B. Let's find out which slide gets a ball from A to B the fastest. Press Next when you're ready.",
      };
    case "tracks":
      return {
        title: "Step 1 · Choose your tracks",
        say: "Tap the track cards on the left to add or remove tracks. A ball is put on each one for you. Try adding the circular arc, then press Next.",
        target: "tray-tracks",
      };
    case "predict":
      return {
        title: "Step 2 · Make a guess",
        say: "Scientists always guess first. Which ball do you think will reach B first? Tap your guess below.",
        target: "guide-predict",
      };
    case "release":
      return {
        title: "Step 3 · Let them go!",
        say: `You guessed the ${guess ? name(guess) : "fastest"} track. Now press the big Release button to open all the gates at the same time.`,
        target: "release",
      };
    case "freeze":
      return {
        title: "Step 4 · Freeze time",
        say: "Watch them race! Quick, press Freeze while the balls are still moving.",
        target: "release",
      };
    case "inspect":
      return {
        title: "Time is frozen",
        say: "Look at the ball. The yellow arrow shows how fast it is going. In the bars, blue is height energy and yellow is moving energy. As the ball goes down, blue turns into yellow. Press Resume to finish the race.",
        target: "release",
      };
    case "result":
      return result ?? resultText(guess);
    case "explore":
      return {
        title: "Step 5 · Be a scientist",
        say: `Now change one thing and race again. Try the Moon instead of ${GRAVITY[st.settings.gravity].label}, a ${BALLS.bead.label.toLowerCase()}, or a deeper finish. Does the same track still win? You can tap the microphone and ask me anything.`,
        target: "tray-ball",
      };
  }
}

/** A friendly, spoken, step-by-step guide that follows what the student actually does. */
export function LabGuide() {
  const { open, step, muted, guess, result, go, setOpen, setMuted, setGuess, setResult } = useGuide();
  const status = useLab((s) => s.status);
  const mode = useLab((s) => s.mode);
  const shapes = useLab(useShallow((s) => s.objects.filter((o): o is TrackObj => o.type === "track").map((t) => t.shape)));
  const shapeKey = shapes.join(",");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const text = useMemo(() => stepText(step, guess, result), [step, guess, result, status, shapeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const spokenFor = useRef("");

  // follow the experiment: advance when the student does the thing we asked
  useEffect(() => {
    if (!open) return;
    if (status === "running" && step !== "freeze" && step !== "inspect") go("freeze");
    else if (status === "paused" && step === "freeze") go("inspect");
    else if (status === "finished" && (step === "freeze" || step === "inspect" || step === "release")) {
      setResult(resultText(guess));
      go("result");
    }
  }, [status, step, open, go, guess, setResult]);

  // speak each new step
  useEffect(() => {
    if (!open || muted) return;
    const key = `${step}|${text.say}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    speak(text.say);
  }, [open, muted, step, text.say]);
  useEffect(() => () => stopSpeaking(), []);

  // glow on the control the student should use next
  useEffect(() => {
    document.querySelectorAll(".guide-glow").forEach((el) => el.classList.remove("guide-glow"));
    if (!open || !text.target) return;
    document.querySelectorAll(`[data-guide="${text.target}"]`).forEach((el) => el.classList.add("guide-glow"));
    return () => document.querySelectorAll(".guide-glow").forEach((el) => el.classList.remove("guide-glow"));
  }, [open, text.target, step]);

  const idx = ORDER.indexOf(step);
  const canNext = step === "hello" || step === "tracks" || step === "result" || step === "explore" || (step === "predict" && !!guess);
  const next = () => {
    if (step === "explore") {
      stopSpeaking();
      setOpen(false);
      return;
    }
    if (step === "result") return go("explore");
    if (step === "predict") return go("release");
    go(ORDER[idx + 1]);
  };
  const back = () => {
    if (idx > 0) go(ORDER[Math.max(0, idx - 1)]);
  };

  const ask = async () => {
    setMicError("");
    try {
      const q = await listenOnce(setListening);
      if (q.trim()) askTutor(q, { speakAnswer: true });
      else setMicError("I didn't hear anything. Tap the mic and try again.");
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "Voice input isn't available.");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-fg shadow-lg hover:border-primary"
      >
        <CycloMark className="h-6 w-6" /> Guide me
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="glass pointer-events-auto w-full max-w-md rounded-2xl p-3 shadow-[0_18px_40px_-16px_rgba(2,6,23,0.9)] ring-1 ring-primary/30"
        role="region"
        aria-label="Lab guide"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <CycloMark className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm font-bold text-fg">{text.title}</p>
              <div className="flex shrink-0 items-center">
                {canSpeak() && (
                  <button
                    type="button"
                    onClick={() => {
                      if (muted) {
                        setMuted(false);
                        speak(text.say);
                      } else {
                        setMuted(true);
                        stopSpeaking();
                      }
                    }}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface-soft hover:text-fg"
                    aria-label={muted ? "Turn voice on" : "Turn voice off"}
                    title={muted ? "Voice off" : "Voice on"}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-soft hover:text-fg"
                  aria-label="Close the guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* phones show a short version; the voice always reads the whole step */}
            <p className="mt-1 text-sm leading-relaxed text-fg-2 max-sm:line-clamp-3 max-sm:text-xs">{text.say}</p>

            {step === "predict" && (
              <div className="mt-2 flex flex-wrap gap-1.5" data-guide="guide-predict">
                {shapes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setGuess(s)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${guess === s ? "border-primary bg-primary/20 text-fg" : "border-line text-fg-2 hover:bg-surface-soft"}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${TRACKS[s].cssVar})` }} />
                    {TRACKS[s].label}
                  </button>
                ))}
              </div>
            )}
            {mode === "build" && step === "tracks" && <p className="mt-1 text-xs text-muted">Tip: switch to Race mode (top left) for the easiest setup.</p>}

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={back} disabled={idx === 0} className="btn btn-ghost !px-2 !py-1 !text-xs" aria-label="Previous step">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] tabular-nums text-muted">
                  {idx + 1}/{ORDER.length}
                </span>
                {canListen() && (
                  <button
                    type="button"
                    onClick={ask}
                    className={`btn !px-2.5 !py-1 !text-xs ${listening ? "btn-primary animate-pulse" : "btn-ghost"}`}
                    aria-label="Ask Cyclo a question with your voice"
                  >
                    <Mic className="h-3.5 w-3.5" /> {listening ? "Listening…" : "Ask"}
                  </button>
                )}
              </div>
              {canNext && (
                <button type="button" onClick={next} className="btn btn-primary !px-3.5 !py-1.5 !text-xs">
                  {step === "explore" ? "Finish" : step === "result" ? "What next?" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {micError && <p className="mt-1 text-[11px] text-friction">{micError}</p>}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
