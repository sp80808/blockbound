# Contributing to Blockbound: Dice Districts

Thanks for helping make Blockbound an original, polished voxel board game. This is an **experimental project with multiple prototype runtimes**, so please start with [README.md](README.md), [ROADMAP.md](ROADMAP.md) and [Architecture](docs/ARCHITECTURE.md) before opening a substantial PR.

## Important context: which application do I edit?

| Source | Purpose | Contribution policy |
| --- | --- | --- |
| `web/` | **Primary** React + TypeScript + Three.js/R3F game | **New features and 3D rendering go here** |
| `web/src/store/gameStore.ts` | Current provisional gameplay state and rules | Extract pure rules and tests; avoid growing a giant store |
| `app/src/main/assets/www/` | Separate bundled WebView HTML/Three.js build | **Do not implement a parallel game here**; migrate toward generated Vite assets |
| `app/src/main/java/com/example/MainActivity.kt` | Android WebView shell | Android-specific integration only |
| `app/src/main/java/com/example/blockbound/` | Earlier Kotlin/Compose gameplay prototype | Reference for missing mechanics/fixtures; changes by explicit parity/port issue only |

**Target stack:** Google AI Studio **Web app mode**, React, TypeScript, Vite, Three.js, React Three Fiber, Drei and Zustand, with an optional PWA and Android packaging via a unified build. Do **not** open new Godot/Unity/native-Kotlin gameplay work without an agreed architectural decision.

## Before your first PR

1. Search [issues](https://github.com/sp80808/blockbound/issues) and the [roadmap](ROADMAP.md); open a focused issue for significant changes.
2. Fork/branch with `feat/`, `fix/`, `test/`, `docs/` or `refactor/`.
3. Keep changes small enough to review, ideally one milestone or coherent gameplay behaviour.
4. Add tests and document any saved-game schema changes.
5. Record screenshots/video for scene/UI changes and Android device/browser details for mobile behaviour.
6. Link the relevant issue and identify known limitations in the PR.
7. Never force-push or directly overwrite someone else's work on `main`.

## Local development

### Web (primary)

```bash
git clone https://github.com/sp80808/blockbound.git
cd blockbound/web
npm install
npm run dev
```

Vite currently uses port **3000**. Run `npm run build` to invoke TypeScript and Vite compilation. **Build success has not been independently verified by this documentation change.**

```bash
npm run build
npm run preview
```

`web/package.json` currently defines **`dev`, `build`, `preview` and `cap:sync`**, but has **no `test`, `lint` or standalone `typecheck` script**, and no committed lockfile was seen. Treat adding reproducible scripts, a lockfile and CI as priority work; do not report these checks as passing until they exist and run.

### Android

Open the repository root in Android Studio for the existing Kotlin Gradle project. Its current `MainActivity.kt` loads `file:///android_asset/www/index.html` rather than the React app's `web/dist`.

**Do not manually modify both web implementations to 'sync' gameplay.** Consolidating packaging into **one Vite build → Android asset** path is a roadmap blocker. A `capacitor.config.json` file alone does not make the Android output ready. Before running `npm run cap:sync`, set up and verify the required native project and package dependencies.

The root Gradle wrapper executable/JAR are not committed in the reviewed snapshot. Record JDK/Gradle/SDK versions and any sync failures when working on native packaging.

## Architecture principles

### Gameplay and economy

- **Use pure TypeScript rules for gameplay.** React components, R3F meshes and animations should only *display* model state or dispatch input.
- Dice outcomes must be generated/committed **before** dice animation; visible faces must settle correctly.
- Inject seeded RNG for testing. Rolls always yield 1–6 per die and move the specified sum around a 32-space perimeter.
- Resolve a tile reward **once** per roll. Repeated taps, quick-roll, reload or skipped animations must not duplicate rewards.
- Cost and reward calculations must be centralised and validated. Prevent negative balances, illegal upgrades, exceeding shield/energy caps and unsafe numeric values.
- Treat actions involving currency or upgrades as **atomic and idempotent**; use unique action/event identifiers.
- Content tables (tile types, buildings, districts, quest costs) belong outside UI code and outside the R3F render loop.
- Do not embed timers or `Math.random()` directly into components or state transitions without test seams.
- Cloud/social/paid currency must eventually be server-authoritative. Client-only values are **not** safe for competitive or monetary systems.

### Render pipeline and Android UX

- Render actual 3D with Three.js meshes via React Three Fiber, **not** 2D isometric projection or a static screenshot.
- Use `InstancedMesh`, reused materials/geometry and modest particles where profiling shows benefit.
- Avoid recreating geometry per frame or sending frequent React state updates for visual-only motion.
- Touch gestures must not conflict with buttons, modals, scrolling or browser navigation.
- Keep the board visually central and the roll button accessible on small portrait screens.
- Respect safe-area insets, readable contrast, reduced-motion preferences and reachability of close controls.
- Ensure audio events are one-shot with controlled concurrency; visual frame rates must not alter outcomes.
- Use actual Android phone profiling before claiming 60 FPS or battery/memory improvements.

### Persistence and lifecycle

- Implement a documented **versioned web save** with validation, migrations and recovery from malformed data.
- The legacy Kotlin `SharedPreferences` store is **not automatically available** to the browser game.
- Tests must cover reload, tab background/foreground, WebGL context loss, interrupted effects and recovering from partially completed transactions.
- Keep original source and save migration/port fixtures available until parity is verified.

### Dependencies, security and rights

- New packages need a rationale, compatibility check and licence review; pin via lockfile.
- Update [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for **actually reused** open-source assets/code. Merely learning from a repository is different from bundling it.
- No copied brand names, proprietary art, branded board layouts, music, character designs or visual UI from inspiration games.
- Never commit `.env`, keys, OAuth credentials, Play Billing secrets, keystores, analytics tokens or user data.
- There is no top-level licence granting permission to redistribute Blockbound's original assets/code; do not assume all contributions become unrestricted public-domain work.

## Test matrix

Add/update tests for the behaviour changed. Examples:

| System | Test cases |
| --- | --- |
| Dice | seeded `d1,d2`, valid faces, doubles, cost once, no overlapping rolls |
| Board | 0–31 indices, wraparound, step-by-step movement, corner landing |
| Rewards | correct tile type, multiplier, one-time claim, cap enforcement |
| Economy | unaffordable upgrade, max tier, damage and repair, negative-value guard |
| Encounters | deterministic choice/result, shield use, repeat/cancel/resume safety |
| Saves | full state round trip, schema migration, reload, malformed data recovery |
| Renderer | displayed faces equal committed dice results, gestures, context recovery |
| Mobile | Android Chrome/WebView, cutouts, portrait controls, audio, FPS/quality fallbacks |

For tests you cannot run, report **"not run"** with the blocker. Don't make up test outcomes or benchmark numbers.

## Pull request template (paste into the description)

```md
### Purpose / linked issue
Closes #

### Behaviour changed
-

### Verification
- [ ] Web app starts; commands and versions recorded
- [ ] Production build checked
- [ ] Relevant tests added/updated and run
- [ ] Android phone/browser checked (if UI/gameplay changed)
- [ ] Screenshots/video for visual work
- [ ] Save/migration impact reviewed
- [ ] Dependency licence and attribution checked
- [ ] No secrets or copyrighted copied assets

### Results and evidence
(commands, logs, device/browser, screenshots or recordings)

### Known limitations / next steps
-
```

## Filing issues

Please provide **actual vs expected** behaviour, steps to reproduce, the branch/commit, affected runtime (`web/`, bundled WebView or Kotlin prototype), device/browser and any error logs. For performance issues include hardware, graphics settings and reproducible profiling results.

## Working with AI coding assistants

AI-authored contributions are welcome, but must meet exactly the same review standard. Give agents [docs/AI_STUDIO.md](docs/AI_STUDIO.md), require inspection of the *current* repository before modifications, and demand a specific checklist of implemented, tested and unfinished work. **A code generation response is not a successful build or an implemented feature.**

**One working, verified end-to-end vertical slice beats many attractive but disconnected demos.**
