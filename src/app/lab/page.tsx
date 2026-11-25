import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MarkVisited } from "@/components/layout/AppProviders";
import { LabTableClient } from "@/components/table/LabTableClient";

export const metadata: Metadata = {
  title: "3D Lab Table",
  description:
    "Build your own brachistochrone experiment on a 3D lab table: place cycloid, straight, arc, parabola and custom tracks, drop in balls, release them and freeze time to see velocity, forces and energy on the ball.",
};

const PRESET_KEYS = ["dx", "dh", "mu", "g", "racers"];

export default async function LabPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // older tutor links carried classic-lab presets on /lab; send them to the classic lab
  const sp = await searchParams;
  if (PRESET_KEYS.some((k) => k in sp)) {
    const q = new URLSearchParams();
    for (const k of PRESET_KEYS) if (typeof sp[k] === "string") q.set(k, sp[k] as string);
    redirect(`/lab/classic?${q.toString()}`);
  }
  return (
    <>
      <MarkVisited slug="lab" />
      <LabTableClient />
    </>
  );
}
