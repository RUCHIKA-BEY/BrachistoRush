export type CardArt = "word" | "paths" | "drop" | "sprinter" | "balance" | "wheel" | "same-speed" | "history" | "light" | "rolling" | "bowl" | "ramp";

export interface Flashcard {
  id: string;
  art: CardArt;
  /** front: a question a curious kid might ask */
  q: string;
  /** back: the answer, in simple words */
  a: string;
  /** optional one-line "remember this" */
  key?: string;
  try?: { label: string; href: string };
}

export const FLASHCARDS: Flashcard[] = [
  {
    id: "word",
    art: "word",
    q: "What does “brachistochrone” mean?",
    a: "It comes from two Greek words: brachistos means “shortest” and chronos means “time”. So it is the path of shortest time: the slide that gets a ball from A to B the fastest.",
    key: "Brachistochrone = shortest TIME, not shortest distance.",
  },
  {
    id: "paths",
    art: "paths",
    q: "Is the shortest path also the fastest?",
    a: "No! The straight line is the shortest path, but it is not the fastest. A curve that dips down first can win, even though the ball travels farther.",
    key: "Distance is not everything. Speed matters too.",
    try: { label: "Race them in the lab", href: "/lab" },
  },
  {
    id: "drop",
    art: "drop",
    q: "Where does the ball get its speed?",
    a: "From going down. The lower the ball gets, the faster it moves: its height energy turns into moving energy. A drop of h metres gives a speed of √(2 × g × h).",
    key: "Lower = faster.",
  },
  {
    id: "sprinter",
    art: "sprinter",
    q: "Why does a steep start help so much?",
    a: "Think of two runners. One reaches top speed in the first second; the other speeds up slowly. The quick starter is fast for almost the whole race. A steep start does the same for the ball.",
    key: "Get fast early, stay fast longer.",
    try: { label: "Freeze time and look at the speed arrows", href: "/lab" },
  },
  {
    id: "balance",
    art: "balance",
    q: "Then why not drop straight down first?",
    a: "A path that falls straight down and then goes flat is very long, and the ball wastes time on the extra distance. The best curve balances two things: getting fast early, and not going too far.",
    key: "The winner balances speed and distance.",
  },
  {
    id: "wheel",
    art: "wheel",
    q: "What is a cycloid?",
    a: "Put a dot on the rim of a wheel and roll the wheel along a straight line. The dot draws arches: that curve is a cycloid. Flip one arch upside down and you get the fastest slide!",
    try: { label: "Watch the wheel draw it", href: "/cycloid" },
  },
  {
    id: "same-speed",
    art: "same-speed",
    q: "Do all the balls reach B at the same speed?",
    a: "Yes, if there is no friction and they all drop the same height. The cycloid ball does not finish faster. It just gets fast sooner, so its average speed over the trip is higher.",
    key: "Same drop → same speed at B. Different trip times!",
  },
  {
    id: "history",
    art: "history",
    q: "Who solved this puzzle?",
    a: "In 1696 Johann Bernoulli challenged the best mathematicians in Europe. Isaac Newton is said to have solved it in a single night. Leibniz, Jakob Bernoulli and others also found the answer: the cycloid.",
  },
  {
    id: "light",
    art: "light",
    q: "What does light have to do with it?",
    a: "Light always takes the quickest route, and it bends when its speed changes. Johann Bernoulli imagined the ball as a ray of light that speeds up as it goes deeper. The path that light would take is a cycloid!",
    key: "Ball and light both choose the quickest route.",
  },
  {
    id: "rolling",
    art: "rolling",
    q: "Does a rolling ball race like a sliding bead?",
    a: "A rolling ball uses some of its energy to spin, so it is a little slower than a bead that just slides. But the cycloid still beats the other tracks for both of them.",
    try: { label: "Try a bead vs a steel ball", href: "/lab" },
  },
  {
    id: "bowl",
    art: "bowl",
    q: "What is the cycloid’s other magic trick?",
    a: "In a cycloid-shaped bowl, balls let go from different heights all reach the bottom at the same moment! This is called the tautochrone (“same time”). Christiaan Huygens used it to design pendulum clocks.",
  },
  {
    id: "ramp",
    art: "ramp",
    q: "Where can we use this idea?",
    a: "Designers of slides, skate ramps and roller-coaster drops use steep starts to build speed quickly. The same idea helps anyone who wants something to get somewhere fast using gravity.",
    try: { label: "Build your own track", href: "/lab" },
  },
];
