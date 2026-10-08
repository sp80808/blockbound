# Google AI Studio — Blockbound development handoff

**Engine directive:** Continue the **React + TypeScript + Three.js + React Three Fiber + Drei + Zustand** project in `web/`. Use Google AI Studio **Web app mode**, *not* native Android/Kotlin mode. Do not substitute Godot, Unity, Unreal, GDScript, C# or a Compose Canvas imitation.

## Read the repository before changing anything

This is **not** a blank project. At the 8 October 2026 review:

- `web/` already has Vite, React, TSX, `VoxelScene.tsx`, `HUD.tsx`, `SplashScreen.tsx`, `App.tsx` and `gameStore.ts`.
- `VoxelScene.tsx` uses real Three.js meshes and OrbitControls. The dice are still simple tumbling **blank boxes** and don't settle with visible, correct results.
- `gameStore.ts` currently implements a simplified roll/energy/coin loop and basic construction; **not** all 32 tile actions or raid/heist encounters.
- The Android launcher in `app/src/main/java/com/example/MainActivity.kt` loads a **different** HTML game from `app/src/main/assets/www/index.html`, not the React build.
- Legacy Kotlin files under `app/src/main/java/com/example/blockbound/` hold useful event/economy definitions, but their Compose voxel renderer is **2D isometric painting**.

Check current files and commit history again; never assume this handoff reflects the latest code after subsequent updates.

## Agent implementation contract

**Don't restart or switch engines. Don't generate a fourth independent game.** Extend the existing React web app and converge toward one source of truth.

1. Inspect all game entry points, package scripts, bundling and the Android WebView before editing.
2. State observed features vs missing functionality with file paths; do not invent tests, assets or behaviour.
3. Separate reusable pure TypeScript gameplay rules from Zustand UI state and the R3F renderer.
4. Implement feature-complete 32-tile board behaviour with seeded tests, unique roll IDs and non-duplicating rewards.
5. Create 3D pipped dice, deterministic outcome-driven settling and tile-by-tile animated traversal.
6. Implement visibly distinct voxel building tiers, block construction animation and persisted economy/building state.
7. Improve mobile camera, portrait framing, safe-area HUD, reachable controls and small-screen interaction.
8. Unify Android packaging using the **built Vite assets**, verifying the current WebView shell is not serving an out-of-date standalone HTML game.
9. Keep original/licensed visuals only, document third-party code/assets, and avoid unnecessary expensive backend services.
10. Execute real build and test commands, record outputs and list incomplete tasks.

### Deliverable and acceptance

The slice must actually play: **splash → roll → correct 3D dice faces → move correct number of spaces → tile reward → building upgrade → save/reload**, on browser and representative Android hardware. Avoid demo-only buttons and placeholder 'completed' states.

### Platform guardrails

- Rendering: React Three Fiber `<Canvas>`, WebGL Three.js meshes, actual camera/light/depth.
- UI: React DOM elements, responsive landscape/portrait handling (portrait primary), accessible labels.
- State: Zustand for app state, pure model reducers/commands for money and turn logic.
- Performance: instance/merge geometry when warranted, control DPR, shadows/particles and measure Android FPS.
- Save: versioned local persistence; don't conflate Kotlin SharedPreferences and browser local storage.
- PWA/Android: add manifest/service worker only when tested; Capacitor-ready means integration **and** a working build, not merely a config file.
- Security: never expose real keys or depend on browser-only currency authority for future paid/competitive modes.
- Copyright: inspiration is acceptable; copying commercial branded boards, proprietary assets or characters is not.

## Preferred coding task order

1. Reproducible `web/` install/build and one-source Android packaging plan.
2. Pure rules, complete tile resolver and deterministic tests.
3. Dice geometry/pips/result alignment plus stepwise travel.
4. Encounter flows and persistent state.
5. Voxel construction polish and mobile performance QA.
6. Extra districts, social features and monetisation **after** the vertical slice is validated.

Consult [ROADMAP.md](../ROADMAP.md), [ARCHITECTURE.md](ARCHITECTURE.md), [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md). Update documentation alongside implemented changes; don't mark roadmap boxes complete based on generated plans alone.

## Required end-of-task report

Report:
- The files actually changed and key architecture decisions.
- Commands run with results; identify commands not run and why.
- Browser/Android device test evidence, if applicable.
- Known regressions, save-format impact and third-party licence notices.
- Follow-up issues and remaining acceptance criteria.

**Do not claim that code was built, tested, deployed or merged without evidence.**
