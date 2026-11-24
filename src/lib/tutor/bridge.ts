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

/** Open the tutor and (optionally) ask a question, from anywhere on the site. */
export function askTutor(question?: string) {
  window.dispatchEvent(new CustomEvent("br:ask", { detail: { question } }));
}
