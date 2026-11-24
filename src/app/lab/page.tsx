import type { Metadata } from "next";
import { RaceLab } from "@/components/lab/RaceLab";
import { SectionHeader, SectionPager } from "@/components/layout/SectionChrome";

export const metadata: Metadata = {
  title: "Race Lab",
  description: "Race the cycloid against a straight line, arc, parabola and your own drawn path. Drag the finish, add friction, change gravity and measure every run.",
};

export default function LabPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeader slug="lab">
        Predict the winner, race, measure the times, explain the result — then change one thing. Drag <strong className="text-secondary-soft">B</strong> to reshape every path live.
      </SectionHeader>
      <RaceLab />
      <SectionPager slug="lab" />
    </div>
  );
}
