"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleHelp, Contrast, Menu, Moon, Sun, X } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { useApp } from "./AppProviders";
import { LogoMark, Wordmark } from "./Logo";

function ProgressRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative hidden h-10 w-10 place-items-center sm:grid" title={`${Math.round(value * 100)}% of the learning path explored`}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <motion.circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className="font-mono text-[10px] font-bold text-fg-2">{Math.round(value * SECTIONS.length)}/{SECTIONS.length}</span>
      <span className="sr-only">Learning path progress: {Math.round(value * 100)} percent</span>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, highContrast, toggleContrast, progress, visited, openTour } = useApp();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-colors ${scrolled ? "glass border-x-0 border-t-0" : "border-b border-transparent"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 btn btn-primary">
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl" aria-label="BrachistoRush home">
          <LogoMark />
          <Wordmark />
        </Link>

        <ul className="no-scrollbar ml-4 hidden flex-1 items-center gap-0.5 overflow-x-auto xl:flex">
          {SECTIONS.map((s) => {
            const active = pathname === s.href;
            const done = visited.includes(s.slug);
            return (
              <li key={s.slug}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${
                    active ? "text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full border border-line bg-surface-soft"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={`relative grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                      done ? "bg-primary text-on-primary" : active ? "bg-secondary/25 text-secondary-soft" : "bg-surface-soft text-muted"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : s.step}
                  </span>
                  <span className="relative">{s.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          <ProgressRing value={progress} />
          <button className="btn btn-ghost hidden h-10 w-10 !p-0 sm:inline-flex" onClick={openTour} aria-label="Replay the welcome tour" title="Welcome tour">
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
          <button
            className={`btn h-10 w-10 !p-0 ${highContrast ? "btn-secondary" : "btn-ghost"}`}
            onClick={toggleContrast}
            aria-pressed={highContrast}
            aria-label="High-contrast mode"
            title="High-contrast mode"
          >
            <Contrast className="h-[18px] w-[18px]" />
          </button>
          <button className="btn btn-ghost h-10 w-10 !p-0" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle light / dark">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <button className="btn btn-ghost h-10 w-10 !p-0 xl:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Open sections menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* learning-path progress bar */}
      <div className="h-[2px] w-full bg-transparent" aria-hidden="true">
        <motion.div className="h-full bg-gradient-to-r from-primary to-secondary" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass absolute inset-x-0 top-full border-x-0 xl:hidden"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 sm:hidden">
              <span className="text-xs text-muted">
                Progress: <strong className="text-fg">{Math.round(progress * SECTIONS.length)}/{SECTIONS.length}</strong> steps explored
              </span>
              <button className="btn btn-ghost ml-auto !py-1.5 !text-xs" onClick={openTour}>
                <CircleHelp className="h-4 w-4" /> Tour
              </button>
            </div>
            <ul className="mx-auto grid max-w-7xl gap-1 p-3 sm:grid-cols-2">
              {SECTIONS.map((s) => {
                const active = pathname === s.href;
                const done = visited.includes(s.slug);
                return (
                  <li key={s.slug}>
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${active ? "bg-surface-soft" : "hover:bg-surface-soft"}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-primary text-on-primary" : "bg-surface-soft text-muted ring-1 ring-line"}`}>
                        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.step}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-fg">{s.title}</span>
                        <span className="block text-xs text-muted">{s.blurb}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
