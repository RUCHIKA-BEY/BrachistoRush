import { ComingSoon } from "@/components/layout/SectionChrome";

export const metadata = { title: "Real-World Applications" };

export default function Page() {
  return (
    <ComingSoon
      slug="applications"
      items={[
        { title: "Skate & snowboard ramps", text: "Why half-pipes and ramps curve the way they do." },
        { title: "Swoops & dives", text: "Why a curved swoop can beat a straight drop — and where air resistance changes the story." },
        { title: "Clocks & gears", text: "Huygens’ cycloidal pendulum and cycloidal gear teeth." },
      ]}
    />
  );
}
