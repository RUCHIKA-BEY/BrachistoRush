import { ComingSoon } from "@/components/layout/SectionChrome";

export const metadata = { title: "Explore Further" };

export default function Page() {
  return (
    <ComingSoon
      slug="explore"
      items={[
        { title: "The tautochrone", text: "Release balls from different heights on a cycloid — they all arrive together!" },
        { title: "Rolling vs sliding", text: "A rolling ball stores energy in spin. How does that change the race?" },
        { title: "Friction-optimal curves", text: "See how the fastest curve flattens as friction grows." },
      ]}
    />
  );
}
