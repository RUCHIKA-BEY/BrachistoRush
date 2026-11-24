# BrachistoRush

An interactive, 3D-enabled learning lab for the **cycloid** and the **brachistochrone problem** — why a longer curved path can beat a straight line under gravity. Inspired by the Agastya International Foundation's hands-on "Cycloidal Path" model.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

### Turn on the Cyclo tutor (AI chatbot)

1. Get an API key at https://platform.claude.com.
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY=...`.
3. Restart `npm run dev`. Without a key the chat still opens but says it isn't connected.

To run a production build while the dev server is running, build into a separate folder:
`NEXT_DIST_DIR=.next-build npx next build`.

## The Cyclo tutor (step 2)

- Floating launcher on every page; streaming answers with Markdown and LaTeX (KaTeX).
- Levels: Simple / Student / Expert. Starter questions per level.
- Knows the site: links to sections and can set up lab experiments via links like `/lab?dx=3.5&dh=0.6&mu=0.2&g=moon&racers=cycloid,straight`.
- Sees the Race Lab's current setup and last result, so "explain my race" works ("Ask Cyclo" button in the Explain step).
- Server route `src/app/api/chat/route.ts`: Claude Opus 5.5 via the Anthropic SDK, cached system prompt (`src/lib/tutor/knowledge.ts`), server-side refusal fallback, per-IP rate limit, message length caps, topic guardrails.

## What's built (step 1)

- **Teal Quantum** design system (Tailwind v4 tokens): dark / light / high-contrast, glass surfaces, racer colours + shapes.
- Sticky navigation with numbered learning steps, progress ring, breadcrumbs, prev/next pager, first-visit onboarding tour.
- **Home** with a live physics hero race.
- **What is a Cycloid?** — rolling-wheel generator with "flip upside down".
- **Race Lab** — cycloid vs straight / arc / parabola / friction-tuned curve / your drawn path; drag B, friction, gravity presets,
  slow-mo, trails, ghost runs, velocity vectors, speed-time graph, energy bars, Predict → Race → Measure → Explain → Vary,
  human-stopwatch challenge, trial notebook with mean ± σ and CSV export, 2D and orbitable 3D views.

Physics lives in `src/lib/physics` (RK4 along arc length with Coulomb friction incl. centripetal normal force); the frictionless
results match the exact formulas (cycloid θ·√(r/g), straight √(2L²/gh)).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full plan and build order.
