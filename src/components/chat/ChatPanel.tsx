"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import type { ChatEvent } from "@/app/api/chat/route";
import type { TutorLevel } from "@/lib/tutor/knowledge";
import { getLabSnapshot } from "@/lib/tutor/bridge";
import { ChatMarkdown } from "./ChatMarkdown";
import { CycloMark } from "./CycloMark";

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const STORE = "br-chat";
const LEVELS: { id: TutorLevel; label: string; hint: string }[] = [
  { id: "simple", label: "Simple", hint: "everyday words" },
  { id: "student", label: "Student", hint: "school physics" },
  { id: "expert", label: "Expert", hint: "full maths" },
];

const STARTERS: Record<TutorLevel, string[]> = {
  simple: ["What is a cycloid?", "Why is the curved path faster?", "What does “brachistochrone” mean?", "Would it work on the Moon?"],
  student: ["How is energy conserved on the slide?", "Why does a steep start help so much?", "What is the tautochrone property?", "How does friction change the best path?"],
  expert: ["Derive the brachistochrone with the Euler–Lagrange equation", "Explain Bernoulli’s Snell’s-law solution", "Prove the tautochrone property of the cycloid", "How does rolling without slipping change the times?"],
};

function load(): { messages: Msg[]; level: TutorLevel } {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v.messages)) return { messages: v.messages, level: v.level ?? "student" };
    }
  } catch {
    /* storage unavailable */
  }
  return { messages: [], level: "student" };
}

export default function ChatPanel({ onClose, pending, clearPending }: { onClose: () => void; pending: string | null; clearPending: () => void }) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [level, setLevel] = useState<TutorLevel>("student");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = load();
    setMessages(s.messages);
    setLevel(s.level);
    setHydrated(true);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hydrated || busy) return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ messages: messages.slice(-40), level }));
    } catch {
      /* storage unavailable */
    }
  }, [messages, level, busy, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setInput("");
      const history: Msg[] = [...messages.filter((m) => !m.error), { role: "user", content: q }];
      setMessages([...history, { role: "assistant", content: "" }]);
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let acc = "";
      const setReply = (content: string, error = false) =>
        setMessages((ms) => {
          const next = ms.slice();
          next[next.length - 1] = { role: "assistant", content, error };
          return next;
        });
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            level,
            page: pathname,
            labState: pathname === "/lab" ? getLabSnapshot() : "",
          }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          let msg = "Something went wrong. Please try again.";
          try {
            msg = (await res.json()).error ?? msg;
          } catch {
            /* not json */
          }
          setReply(msg, true);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let last = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (!line.trim()) continue;
            const ev = JSON.parse(line) as ChatEvent;
            if (ev.t === "text") acc += ev.v;
            else if (ev.t === "error") {
              setReply(acc ? `${acc}\n\n_${ev.v}_` : ev.v, !acc);
              return;
            }
          }
          // throttle re-renders while streaming
          const now = performance.now();
          if (now - last > 40) {
            last = now;
            setReply(acc);
          }
        }
        setReply(acc || "Hmm, I didn't get an answer. Please try again.", !acc);
      } catch {
        if (ctrl.signal.aborted) setReply(acc ? `${acc}\n\n_(stopped)_` : "_(stopped)_", !acc);
        else setReply("Connection problem — please check your internet and try again.", true);
      } finally {
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [busy, messages, level, pathname],
  );

  // a question sent from elsewhere on the site (e.g. "Ask Cyclo why")
  useEffect(() => {
    if (pending && hydrated && !busy) {
      clearPending();
      void send(pending);
    }
  }, [pending, busy, send, clearPending, hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const empty = messages.length === 0;

  return (
    <motion.div
      role="dialog"
      aria-label="Cyclo, the BrachistoRush physics tutor"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-3xl"
      style={{ boxShadow: "0 30px 80px -20px rgba(2,6,23,.7), 0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent)" }}
    >
      {/* header */}
      <div className="relative flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="atmosphere pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <CycloMark className="relative h-10 w-10" />
        <div className="relative min-w-0">
          <p className="font-display font-semibold text-fg">Cyclo</p>
          <p className="truncate text-xs text-muted">Your cycloid &amp; brachistochrone tutor</p>
        </div>
        <div className="relative ml-auto flex items-center gap-1">
          {!empty && (
            <button
              className="btn btn-ghost h-9 w-9 !p-0"
              onClick={() => {
                abortRef.current?.abort();
                setMessages([]);
              }}
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button className="btn btn-ghost h-9 w-9 !p-0" onClick={onClose} aria-label="Close tutor">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* level */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-2" role="radiogroup" aria-label="Explanation level">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Level</span>
        {LEVELS.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={level === l.id}
            onClick={() => setLevel(l.id)}
            title={l.hint}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${level === l.id ? "bg-primary/15 text-primary-soft ring-1 ring-primary/40" : "text-muted hover:text-fg"}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={busy}>
        {empty && (
          <div>
            <div className="rounded-2xl border border-line bg-surface-soft p-4 text-sm text-fg-2">
              <p className="font-semibold text-fg">Hi! I&apos;m Cyclo 👋</p>
              <p className="mt-1">
                Ask me anything about cycloids, the brachistochrone, energy, friction or the history behind the race — from “what does it mean?” to full calculus. I can also set up experiments for you in the Race Lab.
              </p>
            </div>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted">Try asking</p>
            <div className="flex flex-col gap-2">
              {STARTERS[level].map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-2xl border border-line px-3 py-2 text-left text-sm text-fg-2 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-fg">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary/15 px-3.5 py-2 text-sm text-fg ring-1 ring-primary/25">{m.content}</div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <CycloMark className="mt-0.5 h-7 w-7 shrink-0" />
              <div className={`min-w-0 flex-1 text-sm leading-relaxed ${m.error ? "text-friction" : "text-fg-2"}`}>
                {m.content ? (
                  <ChatMarkdown text={m.content} onNavigate={() => window.innerWidth < 640 && onClose()} />
                ) : (
                  <span className="inline-flex items-center gap-1 py-2" aria-label="Cyclo is thinking">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-2 w-2 rounded-full bg-primary"
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* input */}
      <form
        className="border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface-soft p-1.5 pl-3 focus-within:border-primary/50">
          <label htmlFor="tutor-input" className="sr-only">
            Ask Cyclo a question
          </label>
          <textarea
            id="tutor-input"
            ref={inputRef}
            rows={1}
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about the cycloid, energy, history…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm text-fg placeholder:text-muted focus:outline-none"
          />
          {busy ? (
            <button type="button" className="btn btn-secondary h-9 w-9 shrink-0 !p-0" onClick={() => abortRef.current?.abort()} aria-label="Stop answer">
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary h-9 w-9 shrink-0 !p-0" disabled={!input.trim()} aria-label="Send question">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted">Cyclo is an AI and can make mistakes — check important facts in the lab!</p>
      </form>
    </motion.div>
  );
}
