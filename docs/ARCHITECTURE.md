# BrachistoRush — Architecture & Feature Plan

> A digital, measurement-rich version of the Agastya "Cycloidal Path" model.
> Goal: make it *obvious, through play and evidence*, why a longer curved path can beat a straight line under gravity.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Routing per learning section, static export-friendly, API routes for the chatbot |
| Styling | Tailwind CSS v4 + CSS variables ("Teal Quantum" tokens) | One token set drives dark / light / high-contrast themes, used by both DOM and canvas |
| Motion | `motion` (Framer Motion) | Page/section transitions, onboarding, stepper animations |
| 2D simulation | HTML Canvas 2D, own rAF loop | 60 fps race rendering, trails, particles, vectors, drag handles |
| 3D | three.js via `@react-three/fiber` + `drei` (lazy-loaded) | Orbit the race track, 3D tubes, lane view; never blocks first paint |
| Physics | Pure TS module (`src/lib/physics`) | Deterministic RK4 integration along arc length, unit-testable, shared by 2D/3D/charts |
| Chatbot (step 2) | Next.js route handler → Google Gemini API (`@google/genai`), streaming | Topic-restricted tutor with links into site sections |
| State | React state + refs; `localStorage` for theme, onboarding, progress | No backend needed for the core experience |

## 2. Information architecture

```
/                Home — hero race, learning-path map, key ideas
/cycloid         1 · What is a Cycloid?           rolling-circle generator
/problem         2 · The Brachistochrone Problem   1696 challenge, timeline (Galileo → Bernoulli → Newton …)
/lab             3 · Race Lab                      main playground (Predict → Race → Measure → Explain → Vary)
/why             4 · Why the Cycloid Wins          speed-early intuition, energy, Snell's-law analogy, calculus of variations
/explore         5 · Explore Further               friction, rolling balls, other planets, tautochrone
/challenges      6 · Challenges & Quizzes          beat-the-cycloid drawing challenge, quizzes, badges
/applications    7 · Real World                    ramps, skate parks, roller coasters, bird dives, gear teeth
```

Global chrome: sticky glass navbar (step-numbered links + learning-progress ring), breadcrumbs,
"previous / next step" pager, theme + high-contrast toggles, replayable onboarding tour,
floating chatbot launcher (step 2).

## 3. Physics model (shared by every view)

* Every path is resampled to uniform arc-length points with tangent **T** and signed curvature **κ**.
* A bead slides along the path; state is (s, v). Tangential acceleration:

  `a = g·T_y − μ·|N|·sign(v)`,  normal force per mass `N = v²κ − g·T_x` (includes the centripetal term).
* RK4 with Δt = 0.1 ms, recorded every 2 ms → playback is pure lookup, so slow motion and scrubbing are exact.
* Checks: frictionless cycloid time is compared against the exact θ_B·√(r/g); straight line against √(2L²/gH).
* Curves: straight line, circular arc (vertical start), sideways parabola, cycloid through A and B
  (solved numerically for θ_B), a friction-adjusted cycloid family for μ > 0, and a student-drawn path.

## 4. Race Lab features

| Feature | Detail |
|---|---|
| Multi-path race | Cycloid, straight, arc, parabola, friction-adjusted curve, your own drawn path |
| Drag endpoint B | Cycloid (and all paths) regenerate live; keyboard arrows also move B |
| Live readouts | Velocity vectors, race clock, per-racer times & places, speed-vs-time graph, PE / KE / friction-loss bars, path lengths |
| Time control | Play / pause / reset, slow-mo 1× · 0.5× · 0.25× · 0.1×, scrubber after the finish |
| Overlays | Fading trails, cycloid particle sparks, ghost of the previous run |
| Environment | Friction μ 0–0.5, gravity (Earth, Moon, Mars, Jupiter), optional "real-world noise" |
| Measurement | Trial log with mean / σ per path, win counts, CSV export, human-stopwatch challenge vs exact time |
| Inquiry flow | Predict → Race → Measure → Explain (built from the actual numbers) → Vary one factor (one-click experiments) |
| Views | 2D canvas and orbitable 3D track |
| Accessibility | Every racer has colour + name + shape; keyboard control; high-contrast mode removes glow/blur |

## 5. Build order

1. **Foundation (this step)** — scaffolding, theme system, layout, navigation, onboarding, progress, Home, Race Lab, cycloid generator.
2. AI tutor chatbot (Gemini API route, topic guardrails, deep links into sections and lab presets).
3. "Why the Cycloid Wins" + "The Problem" (timeline infographic, Snell's-law light analogy, energy infographic).
4. Explore Further (rolling vs sliding, tautochrone race, friction-optimal curves).
5. Challenges & Quizzes (beat-the-cycloid, badges), Real World.
6. Polish: i18n (English / Hindi / Kannada…), PWA offline mode for classrooms, performance passes.
