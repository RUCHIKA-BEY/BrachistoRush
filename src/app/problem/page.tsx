import { ComingSoon } from "@/components/layout/SectionChrome";

export const metadata = { title: "The Brachistochrone Problem" };

export default function Page() {
  return (
    <ComingSoon
      slug="problem"
      items={[
        { title: "June 1696: the challenge", text: "Johann Bernoulli dares “the sharpest mathematicians in the world” to find the curve of fastest descent." },
        { title: "Interactive timeline", text: "Galileo’s circle guess (1638) → Bernoulli → Newton’s overnight solution → Leibniz, l’Hôpital, Jakob Bernoulli." },
        { title: "Say it in Greek", text: "brákhistos (shortest) + khrónos (time) — an animated word-builder." },
      ]}
    />
  );
}
