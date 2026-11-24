"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircleQuestion, X } from "lucide-react";
import { useApp } from "@/components/layout/AppProviders";

// markdown + KaTeX only load when the student opens the tutor
const ChatPanel = dynamic(() => import("./ChatPanel"), { ssr: false });

/** Always-available floating tutor launcher. */
export function TutorChat() {
  const { tourOpen } = useApp();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem("br-tutor-seen") === "1");
    } catch {
      /* ignore */
    }
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      setOpen(true);
      if (q) setPending(q);
    };
    window.addEventListener("br:ask", onAsk);
    return () => window.removeEventListener("br:ask", onAsk);
  }, []);

  const openChat = () => {
    setOpen((o) => !o);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem("br-tutor-seen", "1");
      } catch {
        /* ignore */
      }
    }
  };
  const close = useCallback(() => setOpen(false), []);
  const clearPending = useCallback(() => setPending(null), []);

  if (tourOpen) return null;

  return (
    <>
      <AnimatePresence>{open && <ChatPanel key="panel" onClose={close} pending={pending} clearPending={clearPending} />}</AnimatePresence>
      <div className={`fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6 ${open ? "max-sm:hidden" : ""}`}>
        {!seen && !open && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="glass absolute bottom-3 right-16 hidden whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-fg sm:block"
          >
            Stuck? Ask Cyclo 👋
          </motion.span>
        )}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={openChat}
          aria-expanded={open}
          aria-label={open ? "Close the tutor" : "Ask Cyclo, the physics tutor"}
          className="relative grid h-14 w-14 place-items-center rounded-full text-on-primary"
          style={{ background: "var(--btn-primary)", boxShadow: "0 10px 30px -6px color-mix(in srgb, var(--secondary) 70%, transparent), 0 0 0 1px color-mix(in srgb, var(--secondary-soft) 40%, transparent)" }}
        >
          {!seen && !open && <span className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-secondary" aria-hidden="true" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? "x" : "q"} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={{ duration: 0.15 }}>
              {open ? <X className="h-6 w-6" /> : <MessageCircleQuestion className="h-6 w-6" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
