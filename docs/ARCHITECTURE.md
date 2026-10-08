# Architecture and migration notes

**8 October 2026 — actual source review.** Blockbound currently has three overlapping implementations. This guide defines the intended boundaries and flags the gaps without claiming they are complete.

## Three runtime surfaces

1. **`web/` — primary game.** Vite + React 18 + TypeScript; `@react-three/fiber`, `three`, `@react-three/drei`, Zustand. `web/src/components/VoxelScene.tsx` renders actual Three.js meshes, lights and a perspective camera. `HUD.tsx` and `App.tsx` render React UI.
2. **`app/src/main/assets/www/` — independent static WebView game.** Contains its own `index.html` and `three.min.js`. `app/src/main/java/com/example/MainActivity.kt` explicitly loads this via `file:///android_asset/www/index.html`. **This is not an automatically built copy of `web/dist`.**
3. **`app/src/main/java/com/example/blockbound/` — legacy native game.** Contains Kotlin `GameViewModel.kt`, `GameModels.kt`, `VoxelDioramaCanvas.kt`, `SaveManager.kt` and Compose screens. Its isometric renderer uses Android Compose `Canvas`; it is **not** WebGL 3D. It has useful content/rules that have not been fully ported.

The near-term objective is **one authoritative React/R3F implementation**, with a proven output path to desktop/mobile browsers and Android. Avoid expanding parallel rule engines.

## Current web component map

| File | Responsibility | Gap |
| --- | --- | --- |
| `src/App.tsx` | Splash and game composition; upgrade dialog | UI state tightly coupled; more encounters needed |
| `src/components/VoxelScene.tsx` | Mesh board, camera, token, tiered buildings, rolling cubes | 3D dice lack numbered faces/settlement; token lerps to final tile; generic geometry |
| `src/components/HUD.tsx` | Currency, materials, shields, roll, multiplier, turbo | Hard-coded "+1 in 00:45" display, incomplete safe-area/accessibility treatment |
| `src/components/SplashScreen.tsx` | Entry/splash animation | Timer-based presentation, not asset loading state |
| `src/store/gameStore.ts` | In-memory game state and roll/build actions | Only simplified coin tile effects; no full event system or persistent save |
| `capacitor.config.json` | Initial packaging configuration | Not evidence of an integrated Android build |

## Intended separation

```text
web/src/
  app/                # React app shell and navigation
  game/core/          # Pure TS rules, seeded RNG, commands, reducers
  game/content/       # Board/tile/building/district/quest definitions
  game/state/         # Zustand bindings and versioned persistence
  scene/              # R3F meshes, camera, character, dice, voxel effects
  ui/                 # HUD, dialogs, safe-area/reduced motion
  platform/           # Browser audio, haptics, lifecycle, Android bridge
  test/               # Rule fixtures, integration and smoke tests
```

These are *planned* directories. Avoid creating empty folders only to match diagrams.

### Rules must drive visuals

A roll transaction should:
1. Validate that a roll is allowed; spend energy **once**.
2. Generate two valid results with an injected RNG (seeded in tests).
3. Commit the result and associated unique roll/action ID.
4. Animate dice to the **correct physical faces** without changing the outcome.
5. Move the token across the correct sequence of board tiles.
6. Resolve the landed tile effect or open an encounter **exactly once**.
7. Commit/persist the resulting resources, quests and progress.
8. Return control to the player.

Animations may be skipped or interrupted without rerolling, double charging or double granting rewards. Use the state machine READY → COMMITTED → PRESENTING → MOVING → RESOLVING → READY, with interrupted/recovery paths.

**Minimum invariants:** results within 1–6; movement wraps board size; no negative balances; no upgrade above max tier; cap shields/energy; no reused transaction IDs; restore to a consistent state after reload.

### Porting rules from Kotlin

Extract the **observed gameplay contract**, not the Android APIs, from:
- `GameModels.kt` (tile/quest/building/district types)
- `GameViewModel.kt` (tile effects and events)
- `SaveManager.kt` (data fields, stable IDs, lifecycle)
- `VoxelModels.kt` (tile order and original design intent)

Write golden fixtures such as: initial state + seeded dice + action → expected tile, rewards, energy, building tier, quest progress. Keep those fixtures deterministic while converting to TypeScript. Do not blindly carry over bugs or device-specific storage.

**Save compatibility caveat:** Kotlin `SharedPreferences` is not readable from the web game. If preserving installed native prototype saves is required, design an explicit import/export bridge. A new browser save should have versioning and validation before claiming parity.

### Android delivery

Treat **`web/dist` as the desired single build output** after the packaging integration is implemented. Either:

- Use a maintained Capacitor project to package that output, **or**
- Build a controlled existing WebView integration that copies the same versioned assets, with correct path rewriting and repeatable checks.

Do not mix both ad hoc. Confirm that Android is using the correct resources with a runtime build fingerprint. Test WebGL on Android System WebView, along with touch, back handling, audio, state persistence, graphics context loss and app restarts.

### Quality, performance and rights

Use instanced or merged meshes for repeated voxel geometry when beneficial; profile frame time and draw calls before/after. Keep stable content IDs and visual update paths deterministic. Never treat a screenshot as proof of live gameplay.

Dependencies and art must be reviewed for licensing, compatibility and security. Current third-party notice entries may describe **conceptual** inspiration and should be audited before any code or assets are bundled. Preserve original Blockbound assets and code rights.

See [the roadmap](../ROADMAP.md) for acceptance gates and [AI Studio handoff](AI_STUDIO.md) for generator instructions.
