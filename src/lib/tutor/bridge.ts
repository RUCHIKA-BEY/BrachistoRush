"use client";

/** Tiny bridge between the pages and the tutor chat (no global state library needed). */

let labSnapshot = "";

/** The Race Lab reports a short text summary of its current setup / last result. */
export function setLabSnapshot(text: string) {
  labSnapshot = text;
}
export function getLabSnapshot() {
  return labSnapshot;
}

let speakNext = false;

/** Open the tutor and (optionally) ask a question, from anywhere on the site. `speakAnswer` reads the reply aloud. */
export function askTutor(question?: string, opts: { speakAnswer?: boolean } = {}) {
  speakNext = !!opts.speakAnswer;
  window.dispatchEvent(new CustomEvent("br:ask", { detail: { question } }));
}

/** True once, right after a spoken question, so the chat reads its answer aloud. */
export function takeSpeakNext() {
  const v = speakNext;
  speakNext = false;
  return v;
}
