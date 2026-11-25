import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RaceLab } from "@/components/lab/RaceLab";
import { SectionHeader, SectionPager } from "@/components/layout/SectionChrome";

export const metadata: Metadata = {
  title: "Classic Race Lab",
  description: "Precise 2D measuring lab: race the cycloid against a straight line, arc, parabola and your own drawn path. Drag the finish, add friction, change gravity and measure every run.",
};

export default function LabPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeader slug="lab">
        The classic measuring lab: predict the winner, race, measure the times, explain the result — then change one thing. Drag <strong className="text-secondary-soft">B</strong> to reshape every path live.{" "}
        <Link href="/lab" className="font-semibold text-primary-soft underline-offset-2 hover:underline">
          Build it on the 3D lab table →
        </Link>
      </SectionHeader>
      <Suspense fallback={<div className="card grid h-96 place-items-center text-sm text-muted">Loading the Race Lab…</div>}>
        <RaceLab />
      </Suspense>
      <SectionPager slug="lab" />
    </div>
  );
}
