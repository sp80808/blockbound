# Blockbound: Dice Districts

**Roll. Build. Raid. Rebuild.** A colourful, portrait-first voxel board game about turning a tiny neighbourhood into a living miniature city.

> **Status: early prototype — engine migration planned.** The repository currently contains a **native Android Kotlin + Jetpack Compose prototype**, not a React/Three.js application. The approved development direction for **Google AI Studio Web app mode** is **React + TypeScript + Three.js + React Three Fiber + Drei + Zustand**, with PWA support and a Capacitor-ready Android build. **This migration has not yet been implemented.** Please do not mistake the current isometric Compose drawings for WebGL/real 3D meshes.

[Roadmap](ROADMAP.md) · [Architecture and migration](docs/ARCHITECTURE.md) · [AI Studio handoff](docs/AI_STUDIO.md) · [Contributing](CONTRIBUTING.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## The game

Blockbound takes inspiration from the *genre* of playful dice-and-board progression games (including Monopoly GO!, Coin Master, Board Kings and Dice Dreams), but is intended to have its **own mechanics, world, characters, UI and art**.

1. **Roll** two dice and move around a looping board.
2. **Earn** coins, construction materials, shields and other rewards from board spaces.
3. **Build** a miniature voxel district whose buildings change appearance as they improve.
4. **Play** quick heist, raid and mystery events.
5. **Progress** through districts, quests, unlocks and customisation.

**Core differentiator:** the evolving voxel town should be a *playable, persistent miniature world*, not just a static background. Building, damage, repairs and milestones should produce visible in-world changes.

### Design principles

- **Real gameplay before spectacle:** interactions must affect state, not just play animations.
- **Tactile and legible:** attractive 3D dice, short movement animations, readable rewards and satisfying block-by-block construction.
- **Mobile-native feel:** portrait layout, thumb-reachable controls, screen-safe UI, low-memory rendering and quick sessions.
- **Fair by design:** optional monetisation, transparent mechanics, no mandatory purchases or misleading near-miss rewards.
- **Deterministic where it matters:** gameplay results are settled in the game model; animations cannot alter or duplicate rewards.
- **Independent identity:** no copied commercial game art, protected characters, board layouts, logos or proprietary assets.

## Current repository: what is actually here?

The checked-in source (October 2026) is an **Android Gradle/Kotlin** project under `app/`. It includes the following **prototype code**; these are *source-level observations*, **not a claim of a tested release**:

| Area | Current code | Target |
| --- | --- | --- |
| Board | 32-space perimeter and isometric drawing with Compose `Canvas` | Actual Three.js 3D board with camera, meshes and touch gestures |
| Dice | Dice outcome/movement state and Compose-drawn dice | 3D dice models and outcome-driven cinematic rolling |
| Economy | Coins, materials, dice energy, shields and multipliers | Framework-independent rules, transaction safety and tests |
| Town | Building tiers, districts, upgrades/repairs and drawn voxel blocks | Instanced/merged voxel meshes with construction and damage effects |
| Encounters | Raid, heist and mystery dialog/logic | Polished, interactive events with consistent state transitions |
| UX | Splash screen, HUD, quests, upgrade and settings dialogs | Responsive WebGL scene with an accessible React HUD |
| Persistence | Local `SharedPreferences` save manager | Versioned web save format and import/migration strategy |
| Tests | Kotlin JUnit, Robolectric and instrumentation test files | TypeScript unit tests, gameplay integration tests and mobile E2E coverage |

Relevant legacy implementation locations:

- `app/src/main/java/com/example/blockbound/game/GameViewModel.kt` — gameplay, economy and board state.
- `app/src/main/java/com/example/blockbound/model/GameModels.kt` — tile, building, district and event models.
- `app/src/main/java/com/example/blockbound/voxel/VoxelDioramaCanvas.kt` — **2D Compose Canvas** renderer with isometric projection, **not** a 3D engine.
- `app/src/main/java/com/example/blockbound/ui/DiceRollerView.kt` — existing dice UI.
- `app/src/main/java/com/example/blockbound/data/SaveManager.kt` — prototype save shape.

The Kotlin code is a **reference implementation** until the web vertical slice reaches feature parity. It must not be silently deleted or described as migrated.

## Approved target architecture

| Layer | Planned stack |
| --- | --- |
| Game client | React, TypeScript, Vite |
| 3D scene | Three.js, React Three Fiber, Drei |
| State | Zustand plus **pure, testable TypeScript gameplay functions** |
| Voxel assets | Procedural/GLB meshes; merge/instance repeated geometry |
| Storage | Versioned local storage initially; backend authority only when online |
| Web distribution | Responsive mobile web app and installable PWA |
| Android | Capacitor wrapper after on-device WebGL profiling |
| Future optional backend | Accounts/social/asynchronous events and server-verified transactions, not required for the first release |

**Google AI Studio:** use **Web app mode** for the target stack. The existing Kotlin files were produced in a native Android project; entering an override prompt does not itself convert those files. See [the AI Studio handoff](docs/AI_STUDIO.md).

### Proposed web layout (not yet present)

```text
src/
  app/               # App shell, routes, lifecycle, responsive HUD
  game/core/         # Pure rules: RNG, turns, tile resolution, economy
  game/content/      # Board, buildings, quests, reward configuration
  game/state/        # Zustand stores and persistence adapters
  scene/             # React Three Fiber board, dice, town, effects
  ui/                # React HUD, overlays, dialogs, accessibility
  platform/          # Web/PWA/Capacitor integrations
  test/              # Seeded rules and integration tests
public/              # Original licensed/owned game assets
```

## Getting started

### Current Kotlin prototype

1. Clone the repository and open its root folder in **Android Studio**.
2. Install the Android SDK and the JDK version compatible with the checked-in Android Gradle Plugin.
3. Sync Gradle and select the `app` run configuration.
4. Run on an emulator or Android device; if there is a sync/build error, capture the exact failure and Android Studio/JDK versions in an issue.

**Important:** this snapshot contains Gradle configuration files and `gradle/wrapper/gradle-wrapper.properties`, but **does not commit `gradlew`, `gradlew.bat` or the wrapper JAR**. Do not claim the project has a working command-line wrapper until these are added or a supported local Gradle setup is documented. No successful APK build or test run has been verified by this documentation change.

### Planned Web/AI Studio application

The repository does **not yet** have a `package.json` or a runnable React client. Once the migration PR adds them, the intended developer workflow will be:

```bash
npm ci
npm run dev
npm test
npm run build
```

These are **target commands**, not commands that work on `main` today. The migration must include scripts, pinned dependency versions and reproducible setup instructions before advertising them as ready.

## Roadmap and release gate

See [ROADMAP.md](ROADMAP.md) for phased milestones, dependencies and acceptance criteria. The first non-negotiable gate is a **browser-playable 3D board with functional dice, a tile reward, a construction upgrade and persisted state**, tested on an Android phone. Online PvP and purchases come later.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Please:

- Open focused issues/PRs linked to a roadmap milestone.
- Keep **game rules independent from graphics** and make random decisions reproducible for tests.
- Do not add new Kotlin-only gameplay features unless they are explicitly part of a migration/parity task.
- Show before/after evidence for visual changes and real-device measurements for performance claims.
- Verify dependency compatibility, licensing and attribution; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Never commit API keys, billing secrets, keystores or credentials.

## Project and licensing

Blockbound: Dice Districts is an original, experimental game project. Third-party dependencies have their own licences. **No top-level project licence is currently provided**, so do not assume the game's original source code or assets have been licensed for reuse. This is a development repository, not a published Android release.
