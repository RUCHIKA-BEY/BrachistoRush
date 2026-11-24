import { ComingSoon } from "@/components/layout/SectionChrome";

export const metadata = { title: "Challenges & Quizzes" };

export default function Page() {
  return (
    <ComingSoon
      slug="challenges"
      items={[
        { title: "Beat the cycloid", text: "Draw paths against the clock — get within 1% for a gold badge." },
        { title: "Quick quizzes", text: "Short, visual questions with instant feedback and explanations." },
        { title: "Badges", text: "Collect badges for predictions, experiments and challenges." },
      ]}
    />
  );
}
