"use client";

import dynamic from "next/dynamic";

// The table keeps its layout in localStorage and draws with WebGL, so it renders on the client only.
const LabTable = dynamic(() => import("./LabTable").then((m) => m.LabTable), {
  ssr: false,
  loading: () => <div className="grid h-[calc(100dvh-4rem)] place-items-center text-sm text-muted">Setting up the lab table…</div>,
});

export function LabTableClient() {
  return <LabTable />;
}
