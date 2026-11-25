export interface Section {
  slug: string;
  href: string;
  step: number;
  title: string;
  short: string;
  blurb: string;
  ready: boolean;
}

export const SECTIONS: Section[] = [
  { slug: "cycloid", href: "/cycloid", step: 1, title: "What is a Cycloid?", short: "Cycloid", blurb: "Watch a rolling wheel draw the magic curve.", ready: true },
  { slug: "problem", href: "/problem", step: 2, title: "The Brachistochrone Problem", short: "The Problem", blurb: "The 1696 challenge that stumped Europe's best minds.", ready: false },
  { slug: "lab", href: "/lab", step: 3, title: "Race Lab", short: "Race Lab", blurb: "Build tracks on a 3D lab table, race balls and freeze time.", ready: true },
  { slug: "why", href: "/why", step: 4, title: "Why the Cycloid Wins", short: "Why it Wins", blurb: "Twelve simple flashcards: speed early, distance later.", ready: true },
  { slug: "explore", href: "/explore", step: 5, title: "Explore Further", short: "Explore", blurb: "Friction, rolling balls, other planets, the tautochrone.", ready: false },
  { slug: "challenges", href: "/challenges", step: 6, title: "Challenges & Quizzes", short: "Challenges", blurb: "Can you draw a path that beats the cycloid?", ready: false },
  { slug: "applications", href: "/applications", step: 7, title: "Real-World Applications", short: "Real World", blurb: "Skate ramps, roller coasters, diving birds and gears.", ready: false },
];

export function sectionBySlug(slug: string) {
  return SECTIONS.find((s) => s.slug === slug);
}
