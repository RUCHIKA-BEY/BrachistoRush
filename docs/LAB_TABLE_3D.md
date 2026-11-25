# BrachistoRush 3D Lab Table — Architecture & Interaction Model

> The main experience is a **virtual lab table**. Students pick up physical parts,
> place them on the table, release balls and watch the race from any angle. They can
> freeze time to look at forces and energy on the ball itself.
> The earlier parameter-driven Race Lab stays available at `/lab/classic` for precise
> measurement work and tutor presets.

## 1. What the student sees

```
┌────────────────────────────────────────────────────────────────────────────┐
│ navbar                                                                     │
├──────┬──────────────────────────────────────────────────────────┬──────────┤
│ TRAY │                3D scene (full bleed)                      │INSPECTOR │
│      │                                                          │ (when    │
│Tracks│     lab table · tracks · balls · stopwatch · shadows      │ selected)│
│Balls │     3D arrows / energy bars / info cards on each ball      │          │
│Props │                                                          │ size,    │
│      │                                                          │ material │
│Tools │                                                          │ delete   │
├──────┴──────────────────────────────────────────────────────────┴──────────┤
│  ▶ Release / ❚❚ Freeze / ↺ Reset · 1× ½× ¼× ⅒× · timeline · camera modes      │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2. Interaction model

| Action | How |
|---|---|
| Add a part | Click a tray item; it sticks to the cursor as a ghost. Click on the table to place it (or drag it straight from the tray). Esc cancels. |
| Move | Press on a part and drag; it slides across the tabletop (optional 5 cm grid snap). |
| Rotate | Drag the rotation ring on the selected part, or press **Q / E** (15° steps with snap on). |
| Select / inspect | Click a part. The inspector shows its properties (track size, ball type…). |
| Delete / duplicate | **Del** / **D**, or the inspector buttons. |
| Put a ball on a track | Drop the ball near the track; it snaps into the start gate at A. |
| Custom curve | Select a custom track, then drag its two shaping handles inside the track's plane. |
| Line up a race | The "Line up" tool places every track side by side, sharing the same A and B. |
| Release | **Space** or ▶. Every start gate opens at once, and the stopwatch starts. |
| Freeze time | **Space** again while the ball is moving. The clock and balls freeze, and force arrows, energy bars and a data card appear on each ball. |
| Scrub | While frozen or after the finish, drag the timeline to any moment of the run. |
| Slow motion | 1× · 0.5× · 0.25× · 0.1×. |
| Camera | Orbit (drag), pan (right-drag / two fingers), zoom (wheel / pinch). Modes: **Free**, **Follow** (chase cam on the selected ball), **Side**, **Top**, **Close-up**, **Cinematic** (slow auto orbit). Camera moves are eased. |
| Transparency | Toggle frosted / clear boards to see the ball's path and the arrows through the track. |

Editing is locked while a run is in progress. **Reset** returns every ball to its gate.

## 3. Physics: two layers

1. **Track motion: constrained rigid-body dynamics (exact).**
   - A ball in a track's groove has one degree of freedom: arc length *s*. The same RK4
     integrator as the classic lab solves
     `a = (g·T_y − μ|N|·sign v) / (1 + I/(m r²))`, with `N = v²κ − g·T_x`.
   - `I/(m r²)` is 2/5 for a solid rolling ball, 2/3 for a hollow ball and 0 for a sliding
     bead. So "ball vs bead" is a real, visible difference: a rolling ball is slower
     because part of its energy goes into spin.
   - The ball's spin is drawn from `ω = v / r`.
   - The run is precomputed on release, so the view can replay any time instantly. Pausing,
     slow motion and scrubbing are exact, and every frame shows the same numbers as the
     physics.
   - Why not let a general physics engine roll the ball on a triangle mesh? A contact solver
     on a thin curved groove jitters, loses energy at every triangle edge and can't hold a
     ball on the cycloid's vertical start. Times would vary by several percent from run to
     run, which would defeat the purpose of the experiment.
2. **Free bodies: Rapier rigid-body engine (next phase).**
   - Balls dropped loose on the table, objects knocked over, a car leaving the track end.
   - Rapier is added once such interactions exist. Track runs keep using layer 1.

## 4. Rendering

- three.js through React Three Fiber.
  - Soft shadow maps from a key light.
  - Image-based lighting from built-in light panels (no network HDRs).
  - Physically based materials: dark acrylic boards, a glowing groove strip in each track's
    colour, a chrome steel ball.
- Post-processing: subtle bloom on glowing accents, SMAA anti-aliasing and a vignette. All
  of it is switched off in high-contrast mode.
- Text in 3D (data cards, stopwatch display) is drawn to canvas textures, so no extra React
  roots are needed.
- Colours come from the Teal Quantum CSS tokens, so dark, light and high-contrast themes
  carry over.

## 5. Code layout

```
src/lib/lab3d/
  types.ts        table objects (tracks, balls, stopwatch), ball types, gravity presets
  tracks.ts       track-local 2D path → 3D frame helpers, custom spline, board layout
  physics.ts      run a ball on a track (rolling inertia), energies, forces at time t
  store.ts        zustand store: objects, selection, tool, run state, settings, run log
  clock.ts        mutable experiment clock shared by the scene and the DOM (no re-renders)
src/components/table/
  LabTable.tsx    page shell: tray, inspector, run bar, keyboard shortcuts, loads the canvas
  TableCanvas.tsx <Canvas>, lighting, environment, post-processing, camera rig
  TableSurface.tsx  table, grid mat, drop plane
  TrackModel.tsx    board + groove + start gate + finish stop + custom handles
  BallModel.tsx     ball on a track or loose on the table
  Stopwatch3D.tsx   desk stopwatch with live display
  InspectOverlay.tsx  velocity / gravity / normal / friction arrows, energy bars, data card
  CameraRig.tsx     camera modes and follow cam
  ui/*              Tray, Inspector, RunBar, RunLog
```

## 6. Recording & comparison

- **This phase:** every run is recorded automatically per ball (object, track shape, size,
  μ, g, time, top speed, outcome) to a run log saved in the browser.
- **Next phase:**
  - save named experiments (the whole table setup plus its runs);
  - replay two runs side by side in split view with synced clocks;
  - ghost replays on the same track;
  - "ball vs car" comparisons.

## 7. Build order

1. **This step:** the lab table and its scene, placing/moving/rotating tracks (straight,
   arc, parabola, cycloid, custom), balls and the stopwatch; release and freeze; 3D
   inspect overlays; camera modes; slow motion; transparency; auto run log.
2. Experiment save/replay, side-by-side comparison, toy car (wheels and rolling resistance).
3. Rapier free bodies, run-off onto the table, collisions between objects.
4. Measuring tools (ruler, protractor, light gates), challenge missions on the table.
