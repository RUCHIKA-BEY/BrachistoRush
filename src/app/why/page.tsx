import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader, SectionPager } from "@/components/layout/SectionChrome";
import { Flashcards } from "@/components/sections/Flashcards";

export const metadata: Metadata = {
  title: "Why the Cycloid Wins",
  description: "Flip through simple flashcards that explain why a longer curved path beats the straight line: speed early, energy, the cycloid, light and the 1696 challenge.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeader slug="why">
        Twelve flashcards, one simple idea each. Tap a card to flip it, swipe or use the arrow keys to move, and press <strong className="text-fg">Read aloud</strong> to
        hear it.
      </SectionHeader>
      <Flashcards />
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
        Want to see it with your own eyes?{" "}
        <Link href="/lab" className="font-semibold text-primary-soft underline-offset-2 hover:underline">
          Race the tracks in the 3D lab
        </Link>{" "}
        and freeze time to watch height turn into speed.
      </p>
      <SectionPager slug="why" />
    </div>
  );
}
