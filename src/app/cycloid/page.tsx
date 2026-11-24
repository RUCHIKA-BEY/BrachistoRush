import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionPager } from "@/components/layout/SectionChrome";
import { CycloidGenerator } from "@/components/sections/CycloidGenerator";

export const metadata = { title: "What is a Cycloid?" };

const FACTS = [
  { k: "Made by rolling", v: "Tape a dot on a bicycle tyre and ride: the dot draws cycloid arches through the air." },
  { k: "Arch width", v: "One arch is exactly 2π r wide — the wheel's circumference." },
  { k: "Arch length", v: "The curved arch is exactly 8 r long — Christopher Wren proved it in 1658." },
  { k: "Upside down", v: "Flip an arch over and you get the brachistochrone: the fastest slide under gravity." },
];

export default function CycloidPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeader slug="cycloid">
        A cycloid is the path traced by a point on the rim of a rolling wheel. Watch it being drawn — then flip it over to see the racetrack.
      </SectionHeader>
      <CycloidGenerator />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.k} className="card p-5">
            <p className="font-display font-semibold text-primary-soft">{f.k}</p>
            <p className="mt-1.5 text-sm text-fg-2">{f.v}</p>
          </div>
        ))}
      </div>
      <div className="card mt-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-mono text-sm text-fg-2">
            x = r(θ − sin θ) &nbsp;·&nbsp; y = r(1 − cos θ)
          </p>
          <p className="mt-1 text-sm text-muted">θ is how far the wheel has turned (in radians), r is its radius.</p>
        </div>
        <Link href="/lab" className="btn btn-primary">
          Race on a cycloid <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <SectionPager slug="cycloid" />
    </div>
  );
}
