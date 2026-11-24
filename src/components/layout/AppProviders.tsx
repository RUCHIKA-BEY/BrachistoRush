"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SECTIONS } from "@/lib/sections";

type Theme = "dark" | "light";

interface AppState {
  theme: Theme;
  toggleTheme: () => void;
  highContrast: boolean;
  toggleContrast: () => void;
  visited: string[];
  markVisited: (slug: string) => void;
  progress: number; // 0..1
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
}

const Ctx = createContext<AppState | null>(null);

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [highContrast, setHighContrast] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const [tourOpen, setTourOpen] = useState(false);

  // hydrate from the attributes set by the pre-paint script + storage
  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.dataset.theme === "light" ? "light" : "dark");
    setHighContrast(el.dataset.contrast === "high");
    try {
      const v = JSON.parse(safeGet("br-visited") ?? "[]");
      if (Array.isArray(v)) setVisited(v.filter((x) => typeof x === "string"));
    } catch {
      /* ignore */
    }
    if (!safeGet("br-onboarded")) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      safeSet("br-theme", next);
      window.dispatchEvent(new Event("br:theme"));
      return next;
    });
  }, []);

  const toggleContrast = useCallback(() => {
    setHighContrast((h) => {
      const next = !h;
      if (next) document.documentElement.dataset.contrast = "high";
      else delete document.documentElement.dataset.contrast;
      safeSet("br-contrast", next ? "high" : "normal");
      window.dispatchEvent(new Event("br:theme"));
      return next;
    });
  }, []);

  const markVisited = useCallback((slug: string) => {
    setVisited((v) => {
      if (v.includes(slug)) return v;
      const next = [...v, slug];
      safeSet("br-visited", JSON.stringify(next));
      return next;
    });
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    safeSet("br-onboarded", "1");
  }, []);

  const value = useMemo<AppState>(
    () => ({
      theme,
      toggleTheme,
      highContrast,
      toggleContrast,
      visited,
      markVisited,
      progress: visited.filter((v) => SECTIONS.some((s) => s.slug === v)).length / SECTIONS.length,
      tourOpen,
      openTour: () => setTourOpen(true),
      closeTour,
    }),
    [theme, toggleTheme, highContrast, toggleContrast, visited, markVisited, tourOpen, closeTour],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProviders");
  return c;
}

/** Drop into a page to record that the student visited this learning step. */
export function MarkVisited({ slug }: { slug: string }) {
  const { markVisited } = useApp();
  useEffect(() => markVisited(slug), [slug, markVisited]);
  return null;
}

export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('br-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t;if(localStorage.getItem('br-contrast')==='high'){d.dataset.contrast='high'}}catch(e){document.documentElement.dataset.theme='dark'}})();`;
