"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Shuffle, Volume2 } from "lucide-react";
import { canSpeak, speak, stopSpeaking } from "@/lib/voice";
import { FLASHCARDS, type CardArt } from "./flashcardDeck";

/* ---------- small illustrations, drawn with the theme colours ---------- */

function Art({ art }: { art: CardArt }) {
  const common = { fill: "none", strokeWidth: 3.5, strokeLinecap: "round" as const };
  const cyc = "M20 20 C 24 70, 60 92, 110 92 S 170 80, 180 70";
  switch (art) {
    case "word":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <text x="100" y="45" textAnchor="middle" className="fill-[var(--primary-soft)] font-display" fontSize="22" fontWeight="700">
            brachistos
          </text>
          <text x="100" y="64" textAnchor="middle" className="fill-[var(--muted)]" fontSize="12">
            shortest
          </text>
          <text x="100" y="90" textAnchor="middle" className="fill-[var(--secondary-soft)] font-display" fontSize="22" fontWeight="700">
            chronos
          </text>
          <text x="100" y="106" textAnchor="middle" className="fill-[var(--muted)]" fontSize="12">
            time
          </text>
        </svg>
      );
    case "paths":
    case "ramp":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M20 20 L180 70" stroke="var(--c-straight)" {...common} />
          <path d={cyc} stroke="var(--c-cycloid)" {...common} />
          <circle cx="20" cy="20" r="6" fill="var(--text)" />
          <circle cx="180" cy="70" r="6" fill="var(--c-finish)" stroke="var(--text)" />
          <text x="10" y="14" fontSize="11" className="fill-[var(--muted)]">A</text>
          <text x="186" y="66" fontSize="11" className="fill-[var(--muted)]">B</text>
        </svg>
      );
    case "drop":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M40 10 V100" stroke="var(--border-strong)" strokeDasharray="4 5" strokeWidth="2" />
          {[18, 45, 80].map((y, i) => (
            <g key={y}>
              <circle cx="40" cy={y} r="7" fill="var(--c-cycloid)" />
              <path d={`M52 ${y} H${70 + i * 45}`} stroke="var(--c-velocity)" {...common} />
              <path d={`M${64 + i * 45} ${y - 6} L${72 + i * 45} ${y} L${64 + i * 45} ${y + 6}`} stroke="var(--c-velocity)" {...common} />
            </g>
          ))}
          <text x="150" y="104" fontSize="11" className="fill-[var(--muted)]">faster ↓</text>
        </svg>
      );
    case "sprinter":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M15 95 C 30 30, 60 22, 185 20" stroke="var(--c-cycloid)" {...common} />
          <path d="M15 95 C 90 92, 150 70, 185 25" stroke="var(--c-straight)" {...common} />
          <text x="60" y="18" fontSize="11" className="fill-[var(--c-cycloid)]">fast start</text>
          <text x="105" y="100" fontSize="11" className="fill-[var(--c-straight)]">slow start</text>
          <text x="2" y="12" fontSize="10" className="fill-[var(--muted)]">speed</text>
        </svg>
      );
    case "balance":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M20 15 V95 H180" stroke="var(--c-arc)" {...common} strokeDasharray="7 6" />
          <path d={cyc} stroke="var(--c-cycloid)" {...common} />
          <path d="M20 15 L180 70" stroke="var(--c-straight)" {...common} strokeOpacity="0.6" />
          <text x="120" y="108" fontSize="10" className="fill-[var(--muted)]">too long</text>
        </svg>
      );
    case "wheel":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M10 95 H190" stroke="var(--border-strong)" strokeWidth="2" />
          <path d="M20 95 C 25 40, 60 40, 70 70 S 95 95, 100 95 C 105 40, 140 40, 150 70 S 175 95, 180 95" stroke="var(--c-cycloid)" {...common} strokeOpacity="0.5" />
          <circle cx="100" cy="70" r="25" stroke="var(--secondary-soft)" {...common} />
          <circle cx="100" cy="95" r="6" fill="var(--primary)" />
        </svg>
      );
    case "same-speed":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M20 15 L170 80" stroke="var(--c-straight)" {...common} />
          <path d="M20 15 C 24 70, 70 85, 170 80" stroke="var(--c-cycloid)" {...common} />
          <path d="M176 80 H196 M190 74 L196 80 L190 86" stroke="var(--c-velocity)" {...common} />
          <text x="120" y="104" fontSize="11" className="fill-[var(--muted)]">same speed at B</text>
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <text x="100" y="62" textAnchor="middle" className="fill-[var(--primary-soft)] font-display" fontSize="44" fontWeight="700">
            1696
          </text>
          <text x="100" y="90" textAnchor="middle" fontSize="12" className="fill-[var(--muted)]">
            a challenge to the world
          </text>
        </svg>
      );
    case "light":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          {[25, 45, 65, 85].map((y, i) => (
            <rect key={y} x="0" y={y - 20} width="200" height="20" fill="var(--secondary)" opacity={0.06 + i * 0.05} />
          ))}
          <path d="M30 8 L44 25 L64 45 L92 65 L140 86" stroke="var(--c-velocity)" {...common} />
        </svg>
      );
    case "rolling":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d={cyc} stroke="var(--c-cycloid)" {...common} strokeOpacity="0.5" />
          <circle cx="60" cy="74" r="12" fill="var(--surface-soft)" stroke="var(--text-2)" strokeWidth="2" />
          <path d="M52 66 A 11 11 0 0 1 70 70" stroke="var(--c-velocity)" {...common} strokeWidth="2.5" />
          <circle cx="130" cy="86" r="7" fill="#f59e0b" />
          <text x="40" y="106" fontSize="10" className="fill-[var(--muted)]">spins</text>
          <text x="118" y="106" fontSize="10" className="fill-[var(--muted)]">slides</text>
        </svg>
      );
    case "bowl":
      return (
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M15 15 C 20 85, 70 98, 100 98 C 130 98, 180 85, 185 15" stroke="var(--c-cycloid)" {...common} />
          <circle cx="28" cy="48" r="7" fill="var(--c-straight)" />
          <circle cx="62" cy="86" r="7" fill="var(--c-arc)" />
          <circle cx="100" cy="91" r="4" fill="var(--c-finish)" stroke="var(--text)" />
        </svg>
      );
  }
}

const STORE = "br-flashcards-known";

/** A deck of flip cards: tap to flip, arrows/swipe to move, mark cards you know. */
export function Flashcards() {
  const [order, setOrder] = useState(() => FLASHCARDS.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [dir, setDir] = useState(1);
  const touch = useRef<number | null>(null);
  const [voice, setVoice] = useState(false); // known only in the browser, so set after hydration
  const card = FLASHCARDS[order[pos]];

  useEffect(() => {
    setVoice(canSpeak());
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setKnown(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    return () => stopSpeaking();
  }, []);
  const saveKnown = (k: Set<string>) => {
    setKnown(k);
    try {
      localStorage.setItem(STORE, JSON.stringify([...k]));
    } catch {
      /* ignore */
    }
  };

  const go = useCallback(
    (d: number) => {
      stopSpeaking();
      setDir(d);
      setFlipped(false);
      setPos((p) => (p + d + order.length) % order.length);
    },
    [order.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const mark = (ok: boolean) => {
    const k = new Set(known);
    if (ok) k.add(card.id);
    else k.delete(card.id);
    saveKnown(k);
    go(1);
  };

  const readAloud = () => speak(flipped ? `${card.a} ${card.key ?? ""}` : card.q);

  return (
    <div className="mx-auto max-w-2xl">
      {/* progress */}
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          Card {pos + 1} of {order.length}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(known.size / FLASHCARDS.length) * 100}%` }} />
        </div>
        <span>
          {known.size}/{FLASHCARDS.length} learned
        </span>
      </div>

      <div
        className="relative h-[22rem] [perspective:1400px] sm:h-[24rem]"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={card.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0"
          >
            <motion.button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.3, 0.7, 0.2, 1] }}
              className="relative h-full w-full rounded-3xl text-left [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label={flipped ? `Answer: ${card.a}. Tap to see the question.` : `Question: ${card.q}. Tap to see the answer.`}
            >
              {/* front */}
              <div className="card absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden p-6 text-center [backface-visibility:hidden]">
                <div className="h-28 w-56 sm:h-32 sm:w-64">
                  <Art art={card.art} />
                </div>
                <p className="font-display text-2xl font-bold leading-snug text-fg sm:text-3xl">{card.q}</p>
                <span className="chip">Tap to flip</span>
              </div>
              {/* back */}
              <div className="card absolute inset-0 flex flex-col justify-center gap-4 overflow-hidden p-6 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8">
                <p className="text-lg leading-relaxed text-fg sm:text-xl">{card.a}</p>
                {card.key && <p className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-soft">💡 {card.key}</p>}
              </div>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn btn-ghost !px-3" onClick={() => go(-1)} aria-label="Previous card">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-ghost !px-3" onClick={() => go(1)} aria-label="Next card">
            <ArrowRight className="h-4 w-4" />
          </button>
          {voice && (
            <button type="button" className="btn btn-ghost" onClick={readAloud}>
              <Volume2 className="h-4 w-4" /> Read aloud
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {flipped ? (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => mark(false)}>
                <RotateCcw className="h-4 w-4" /> Again
              </button>
              <button type="button" className="btn btn-primary" onClick={() => mark(true)}>
                <Check className="h-4 w-4" /> Got it
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const o = [...order].sort(() => Math.random() - 0.5);
                setOrder(o);
                setPos(0);
                setFlipped(false);
              }}
            >
              <Shuffle className="h-4 w-4" /> Shuffle
            </button>
          )}
        </div>
      </div>

      {card.try && (
        <p className="mt-3 text-center text-sm">
          <Link href={card.try.href} className="font-semibold text-primary-soft underline-offset-2 hover:underline">
            {card.try.label} →
          </Link>
        </p>
      )}
      {known.size === FLASHCARDS.length && (
        <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-center text-sm text-fg">
          🎉 You learned all {FLASHCARDS.length} cards!{" "}
          <button type="button" className="font-semibold text-primary-soft underline" onClick={() => saveKnown(new Set())}>
            Start over
          </button>
        </p>
      )}
    </div>
  );
}
