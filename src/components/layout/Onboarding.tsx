"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Contrast, Keyboard, Moon, X } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { useApp } from "./AppProviders";

function RaceTeaser() {
  // two balls: straight (slower) vs cycloid (faster) — looping SVG animation
  const cyc = "M20 20 C 22 90, 70 120, 130 120 S 200 105, 220 95";
  return (
    <svg viewBox="0 0 240 140" className="h-40 w-full" role="img" aria-label="Animation: a ball on a curved path beats a ball on a straight ramp">
      <path d="M20 20 L 220 95" stroke="var(--c-straight)" strokeWidth="3" strokeDasharray="5 5" fill="none" />
      <path d={cyc} stroke="var(--c-cycloid)" strokeWidth="5" fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px var(--c-cycloid))" }} />
      <rect x="212" y="84" width="16" height="24" rx="3" fill="none" stroke="var(--c-finish)" strokeDasharray="3 3" />
      <circle r="7" fill="var(--c-cycloid)">
        <animateMotion dur="2.4s" repeatCount="indefinite" path={cyc} keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="spline" keySplines="0.3 0 0.6 1;0 0 1 1" />
      </circle>
      <rect width="12" height="12" x="-6" y="-6" fill="var(--c-straight)">
        <animateMotion dur="2.4s" repeatCount="indefinite" path="M20 20 L 220 95" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="spline" keySplines="0.5 0 0.9 1;0 0 1 1" />
      </rect>
      <text x="22" y="14" fontSize="10" fill="var(--muted)">A</text>
      <text x="222" y="122" fontSize="10" fill="var(--muted)">B</text>
    </svg>
  );
}

const FLOW = ["Predict", "Race", "Measure", "Explain", "Vary"];

export function Onboarding() {
  const { tourOpen, closeTour } = useApp();
  const [step, setStep] = useState(0);
  const router = useRouter();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tourOpen) return;
    setStep(0);
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => primaryRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour();
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [tourOpen, closeTour]);

  const slides = [
    {
      title: "Welcome to BrachistoRush!",
      body: "Two balls start at A and race to B. One takes the straight ramp, the other a curved path. Which one wins? The answer surprises almost everyone.",
      visual: <RaceTeaser />,
    },
    {
      title: "Your learning path",
      body: "Seven short steps take you from “what is a cycloid?” to designing your own racing curves. Your progress ring fills up as you explore.",
      visual: (
        <ol className="grid grid-cols-7 gap-1.5 py-6">
          {SECTIONS.map((s, i) => (
            <motion.li
              key={s.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${s.slug === "lab" ? "bg-primary text-on-primary glow-teal" : "bg-surface-soft text-fg-2 ring-1 ring-line"}`}>{s.step}</span>
              <span className="text-[10px] leading-tight text-muted">{s.short}</span>
            </motion.li>
          ))}
        </ol>
      ),
    },
    {
      title: "Think like a scientist",
      body: "In the Race Lab you first predict the winner, then race, measure the times, explain what happened — and change one thing at a time.",
      visual: (
        <div className="flex flex-wrap items-center justify-center gap-1.5 py-8">
          {FLOW.map((f, i) => (
            <motion.span key={f} className="flex items-center gap-1.5" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 * i }}>
              <span className={`chip ${i === 0 ? "border-primary/40 bg-primary/15 text-primary-soft" : ""}`}>
                {i + 1}. {f}
              </span>
              {i < FLOW.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />}
            </motion.span>
          ))}
        </div>
      ),
    },
    {
      title: "Make it yours",
      body: "Switch light/dark for bright classrooms, turn on high-contrast mode, and use Tab + arrow keys to control everything without a mouse.",
      visual: (
        <div className="grid grid-cols-3 gap-3 py-6 text-center text-xs text-fg-2">
          <div className="rounded-2xl border border-line bg-surface-soft p-4">
            <Moon className="mx-auto mb-2 h-6 w-6 text-secondary-soft" aria-hidden="true" /> Light / dark
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-4">
            <Contrast className="mx-auto mb-2 h-6 w-6 text-secondary-soft" aria-hidden="true" /> High contrast
          </div>
          <div className="rounded-2xl border border-line bg-surface-soft p-4">
            <Keyboard className="mx-auto mb-2 h-6 w-6 text-secondary-soft" aria-hidden="true" /> Keyboard ready
          </div>
        </div>
      ),
    },
  ];
  const last = step === slides.length - 1;
  const s = slides[step];

  return (
    <AnimatePresence>
      {tourOpen && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeTour}>
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            className="card relative w-full max-w-lg overflow-hidden"
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="atmosphere pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
            <div className="relative p-6 sm:p-7">
              <button className="btn btn-ghost absolute right-4 top-4 h-9 w-9 !p-0" onClick={closeTour} aria-label="Close tour">
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-soft">
                Tour · {step + 1} / {slides.length}
              </p>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                  <div className="mt-2">{s.visual}</div>
                  <h2 id="tour-title" className="font-display text-2xl font-bold text-fg">
                    {s.title}
                  </h2>
                  <p className="mt-2 text-fg-2">{s.body}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex gap-1.5" aria-hidden="true">
                  {slides.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-line-strong"}`} />
                  ))}
                </div>
                <div className="ml-auto flex gap-2">
                  {step > 0 ? (
                    <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  ) : (
                    <button className="btn btn-ghost" onClick={closeTour}>
                      Skip
                    </button>
                  )}
                  <button
                    ref={primaryRef}
                    className="btn btn-primary"
                    onClick={() => {
                      if (last) {
                        closeTour();
                        router.push("/lab");
                      } else setStep(step + 1);
                    }}
                  >
                    {last ? "Start racing" : "Next"} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
