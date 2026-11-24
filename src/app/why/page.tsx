import { ComingSoon } from "@/components/layout/SectionChrome";

export const metadata = { title: "Why the Cycloid Wins" };

export default function Page() {
  return (
    <ComingSoon
      slug="why"
      items={[
        { title: "Speed early, distance later", text: "A scroll-driven story comparing two balls frame by frame." },
        { title: "Light takes the fastest path too", text: "Bernoulli’s trick: treat the ball like light bending through layers of glass (Snell’s law)." },
        { title: "The maths, gently", text: "From energy conservation to the calculus of variations, with every step visualised." },
      ]}
    />
  );
}
