"use client";

/**
 * Tiny wrapper around the browser's built-in speech (Web Speech API).
 * Speaking works offline in all modern browsers; listening (speech-to-text) works in Chrome and Edge.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const prefer = ["en-in", "en-gb", "en-us"];
  for (const lang of prefer) {
    const natural = en.find((v) => v.lang.toLowerCase() === lang && /natural|google|online/i.test(v.name));
    if (natural) return natural;
  }
  for (const lang of prefer) {
    const v = en.find((q) => q.lang.toLowerCase() === lang);
    if (v) return v;
  }
  return en[0] ?? voices[0];
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Turn Markdown / maths into something pleasant to hear. */
export function plainForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " (see the formula on screen) ")
    .replace(/\$([^$]+)\$/g, (_, m: string) => m.replace(/\\[a-zA-Z]+/g, " ").replace(/[{}^_]/g, " "))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, opts: { onEnd?: () => void } = {}) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  if (cachedVoice === undefined || cachedVoice === null) cachedVoice = pickVoice();
  // long answers are read in sentence-sized pieces (some browsers stop after ~15 s otherwise)
  const parts = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part.trim());
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = 0.98;
    u.pitch = 1.05;
    if (i === parts.length - 1 && opts.onEnd) u.onend = opts.onEnd;
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => (cachedVoice = pickVoice()));
}

/* ---------------- listening ---------------- */

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function Recognition(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen() {
  return !!Recognition();
}

/** Listen for one spoken question. Resolves with the transcript ("" if nothing was heard). */
export function listenOnce(onState?: (listening: boolean) => void): Promise<string> {
  const R = Recognition();
  if (!R) return Promise.reject(new Error("Speech recognition is not supported in this browser."));
  stopSpeaking();
  return new Promise((resolve, reject) => {
    const r = new R();
    r.lang = navigator.language || "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    let text = "";
    r.onresult = (e) => {
      text = e.results[0]?.[0]?.transcript ?? "";
    };
    r.onerror = (e) => {
      onState?.(false);
      if (e.error === "no-speech" || e.error === "aborted") resolve("");
      else reject(new Error(e.error === "not-allowed" ? "Microphone permission was blocked." : `Voice input error: ${e.error}`));
    };
    r.onend = () => {
      onState?.(false);
      resolve(text);
    };
    onState?.(true);
    r.start();
  });
}
