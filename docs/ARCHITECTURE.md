# Architecture: from Kotlin isometric prototype to a real WebGL voxel game

## Architecture decision

**Decision (8 October 2026):** build the next Blockbound client using **Google AI Studio Web app mode, React, TypeScript, Three.js, React Three Fiber, Drei and Zustand**. Keep the existing Kotlin/Jetpack Compose code as a **legacy gameplay reference** until the new client demonstrates equivalent outcomes.

**Not yet implemented:** No React application, Vite config, npm lockfile, WebGL scene, PWA or Capacitor project currently exists in `main`. This document is an implementation contract, not a retrospective of work already completed.

### Why change?

The existing `VoxelDioramaCanvas.kt` uses `androidx.compose.foundation.Canvas` and manually draws depth-sorted projected faces of cubes. The effect is *isometric*, but it is not a Three.js 3D scene with meshes, a 3D camera, scene lighting or hardware depth buffering.

The game needs richer dioramas, construction effects and real camera control, all with a workflow that AI Studio can preview and iterate on. React Three Fiber is a reasonable fit **provided Android WebGL performance is confirmed on device**. Switching frameworks cannot by itself guarantee good frame times.

## Legacy code map (source of truth for parity, not the destination)

| Legacy file | Extract/port | Do not preserve blindly |
| --- | --- | --- |
| `game/GameViewModel.kt` | board definitions, transitions, encounter/reward rules | AndroidViewModel, coroutines, implicit mutable event effects |
| `model/GameModels.kt` | stable game IDs, tile types, building/district/quest fields | Compose or Android-specific types |
| `voxel/VoxelModels.kt` | original tile ordering, palette and location intentions | manually painted isometric cube geometry |
| `voxel/VoxelDioramaCanvas.kt` | touch affordances, visual design references | Compose Canvas draw path, screen-space pan |
| `ui/DiceRollerView.kt` | required controls and dice UI states | 2D/projection-only dice rendering |
| `data/SaveManager.kt` | legacy persistence fields and v1 format semantics | assumption that `SharedPreferences` can be read by a browser |
| `ui/HeistDialog.kt`, `ui/RaidDialog.kt` | encounter flow and reward terms | Android Compose dialogs |
| `ui/MainGameScreen.kt` | information hierarchy and HUD interactions | Android Compose widget tree |

Parity must be measured by outputs and player-observable behaviour; a line-for-line port would carry over accidental platform coupling and bugs.

## Proposed target module boundaries

```text
src/
  game/
    core/                  # No React, WebGL, window, localStorage or platform imports
      types.ts
      random.ts            # Injectable RNG/seeded test implementation
      board.ts
      turn.ts
      rewards.ts
      economy.ts
      buildings.ts
      encounters.ts
      transitions.ts
    content/               # JSON/TS content tables: tiles, districts, costs, quests
    state/                 # Zustand state/commands, persistence adapters
  scene/
    GameScene.tsx          # Three canvas, camera, framing, light
    Board3D.tsx
    Dice3D.tsx
    Town3D.tsx
    Character3D.tsx
    effects/
    assets/
  ui/
    GameHUD.tsx            # Standard React/DOM, responsive to safe areas
    dialogs/
  platform/
    storage/
    audio/
    haptics/
    lifecycle/
  test/
public/
```

**Critical rule:** neither a React component nor a 3D mesh is allowed to be the authority for rolls, coins, materials, shields or district progress. Scene animations receive **immutable result data** from the game core.

## State and command contract

Proposed logical state (exact TypeScript interfaces must be versioned by the implementation PR):

- `gameVersion`, `saveVersion`, `playerId` (local installation ID initially)
- `resources`: coins, materials, dice energy, maximum energy, shields, shield cap
- `board`: active district ID, tile index, last roll summary
- `districts`: stable district IDs with building ID, tier and damaged state
- `quests`: stable IDs, progress and claimed flags
- `statistics`: rolls, raids, upgrades
- `timers`: regeneration anchor and necessary expiry metadata
- `pendingEvent`: event ID and resolved/not-resolved state, if appropriate
- `processedTransactions`: limited, durable list or ledger preventing duplicate claims

Example **commands**:

```text
ROLL_DICE({ actionId, multiplier })
RESOLVE_LANDING({ actionId, rollId, tileId })
UPGRADE_BUILDING({ actionId, buildingId })
REPAIR_BUILDING({ actionId, buildingId })
CHOOSE_HEIST_TARGET({ actionId, eventId, targetId })
CHOOSE_RAID_TARGET({ actionId, eventId, targetId })
CLAIM_QUEST({ actionId, questId })
REGEN_ENERGY({ actionId, effectiveTimestamp })
```

Resulting **events** (for rendering/audio, not arbitrary economy mutation):

```text
DiceRolled       { rollId, die1, die2, steps }
TokenMoved       { rollId, from, to, visitedTiles }
TileResolved     { rollId, tileId, rewards, spawnedEvent }
BuildingUpgraded { actionId, buildingId, oldTier, newTier }
RewardGranted    { actionId, resourceChanges }
EncounterStarted { eventId, type }
EncounterResolved{ eventId, outcome }
GameSaved        { saveVersion }
```

### Turn state machine

```text
READY
  -> ROLL_COMMITTED         (validate and deduct energy exactly once)
  -> DICE_PRESENTING        (animate predetermined outcome)
  -> TOKEN_MOVING           (move correct number of steps)
  -> LANDING_RESOLVING      (apply one tile result, or open one encounter)
  -> ENCOUNTER_PENDING?     (player makes an allowed choice)
  -> TURN_COMPLETED         (persist committed game state)
  -> READY
```

Game state may persist immediately at safe transactional boundaries rather than waiting for animations. Skip, fast-forward, low-frame-rate or app resume must **not** generate new dice outcomes or replay rewards.

### Required invariants

1. Dice values remain integers in `[1,6]`; steps always equal their sum.
2. Movement ends at `(startingIndex + steps) mod boardLength` (currently 32).
3. Every roll consumes exactly its configured energy cost, at most once.
4. Each `rollId` can resolve landing rewards at most once.
5. Resource balances are never negative, non-finite or outside documented caps.
6. A building upgrade increments exactly one tier, never beyond `maxTier`, after validating costs.
7. Claims, heists and raids are idempotent per event ID.
8. Timers handle time changes, resumes and invalid timestamps robustly.
9. Failed transactions leave state unchanged.
10. Visual animations have no authority to modify the committed game outcome.

For automated tests, the RNG must be injected/seeded and outcomes replayable. In any future online economy, server-side trusted randomness and server-authoritative transactions supersede client RNG for rewards and competitive actions.

## Rendering contract

Use React Three Fiber `Canvas` with actual `Mesh`, `InstancedMesh`, cameras, lights and depth buffer. This is separate from the **legacy Android Compose `Canvas`**.

- Make the board prominent in the portrait viewport rather than surrounded by unused vertical space.
- Reuse geometry and materials, merge static building detail and instance repeated voxel blocks.
- Give buildings 0–4 meaningful visual tiers, with distinct roof, door, window and silhouette shapes.
- Separate world coordinates from tile IDs, and camera transforms from UI hit areas.
- Prefer outcome-driven **kinematic/cinematic dice** for reliable face presentation; full physics can be optional spectacle.
- Set animation updates on frame delta; avoid creating thousands of React state updates per frame.
- Cap the number of particles and avoid unbounded allocation.
- Use render profiling, not assumed optimisation benefits.
- Support touch pan/pinch and lock gesture capture so rolling the board does not scroll the document.

## Saving and legacy migration

`SaveManager.kt` currently persists data in Android `SharedPreferences` (`blockbound_save_v1`). A Web app cannot simply read that on the phone: **there is no automatic cross-engine save migration**.

1. Specify a new versioned, serialisable and validated web save schema.
2. Test save/load on interrupted sessions and damaged values.
3. Provide local persistence first with stable keys and version upgrades.
4. If preserving *installed Android prototype* progress is required, build an explicit and consent-based export/import bridge (e.g. legacy app export of non-sensitive game state) rather than promising transparent migration.
5. Keep local data separate from remote authority if online PvP or purchases are introduced.

## PWA and Capacitor boundaries

- The React project must function as a normal website first.
- Only mark PWA as implemented after manifest, icons, service worker/offline behaviour and update recovery are validated.
- Test rendering in Android Chrome and Android System WebView before deciding on Capacitor.
- Only mark an Android build as ready after signed build, lifecycle, touch, audio, storage and graphics checks.
- No Google Play billing, live ads or online features without dedicated implementation, testing and operational support.

## Acceptance and evidence

The first migration PR must prove: reproducible install/build, visible **real WebGL** scene, a deterministic roll, correct tile landing, real resource transaction, one visible building upgrade and reload-safe game state.

Attach:
- Screenshot or video of the running browser scene
- Commands and test results
- Device/browser and FPS/memory observations where relevant
- Old vs new core rule parity results
- Explicit list of unported mechanics, missing content and risks

See [ROADMAP.md](../ROADMAP.md) for phased product goals.
