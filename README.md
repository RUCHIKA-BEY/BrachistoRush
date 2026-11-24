# BrachistoRush

An interactive, 3D-enabled learning lab for the **cycloid** and the **brachistochrone problem** — why a longer curved path can beat a straight line under gravity. Inspired by the Agastya International Foundation's hands-on "Cycloidal Path" model.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

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
