# Contributing to Blockbound: Dice Districts

Thanks for helping make Blockbound a polished, original voxel board game. This project is in an **early prototype / engine-transition stage**. Please read [README.md](README.md), [ROADMAP.md](ROADMAP.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before making a significant change.

> **Important:** `main` currently contains a **Kotlin + Compose** Android prototype. The project owner has selected **Google AI Studio Web app mode** and a **React + TypeScript + Three.js + React Three Fiber + Drei + Zustand** stack for the next generation. The migration has **not shipped**. Do not add new gameplay dependencies or features to Kotlin merely because those are the existing files; discuss exceptions in a GitHub issue.

## Ways to help

Helpful contributions include:
- Focused fixes to gameplay rules, deterministic tests and persistence.
- Mobile-safe React/3D board, camera, dice and voxel rendering work **in the new web client**.
- Original artwork, procedural geometry, music/SFX and animations with documented permissions.
- Accessibility, touch usability, lifecycle and Android browser performance improvements.
- Clear reproductions of bugs and actionable proposals linked to a roadmap gate.
- Documentation that is factual about what exists and what is merely planned.

For extensive architecture changes, open an issue or design discussion **before** creating a large PR.

## Workflow

1. Check existing issues and [ROADMAP.md](ROADMAP.md) to avoid duplicating work.
2. Open or reference a scoped issue describing the behaviour, motivation and acceptance criteria.
3. Create a branch named `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `test/<topic>`.
4. Keep changes narrow, make them reviewable and add tests with gameplay changes.
5. Run all applicable checks for the code **actually present**.
6. Open a pull request to `main` with screenshots/recordings for visual work and device details for Android issues.
7. Address review feedback; do not silently replace existing mechanics or wipe local saves.

**Never force-push to `main`, expose secrets, or delete the Kotlin baseline before feature parity is verified.**

## Project setup

### Checked-in Kotlin prototype

- Open the repository root in Android Studio.
- Install a compatible Android SDK/JDK for the checked-in Gradle version.
- Let Android Studio sync and use its test/run actions.

The current repository has `gradle/wrapper/gradle-wrapper.properties` but **does not include wrapper executables or the wrapper JAR**. Therefore, **do not claim `./gradlew test` works on a fresh checkout**. If proposing a build or CI improvement, first add and verify a reproducible Gradle setup. Report build blockers with the full error, Java version, Android SDK and device/emulator details.

Current tests live under:
- `app/src/test/` (JUnit / Robolectric)
- `app/src/androidTest/` (Android instrumentation)

Their presence does **not** mean they have passed on the latest commit.

### Intended React/WebGL client

Once the migration adds the new app, contributors should be able to run documented commands such as:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

**These commands are a requirement of the migration PR, not working commands today.** Ensure the real scripts and lockfile exist first. Standardise the package manager in that PR, rather than mixing npm/pnpm/yarn lockfiles.

For AI Studio development, choose **Web app mode**. Export/sync code to GitHub frequently. A screenshot of a native Android Compose UI is not proof that React/R3F has been implemented.

## Coding and architectural standards

### Gameplay model

- Implement game rules in **pure TypeScript functions**, independent of React components or the Three.js scene.
- Treat the model as authoritative for dice results, movement, economy, building costs, quests, rewards and state transitions.
- Renderers should consume state and emit user actions; they should **not grant rewards**, directly change balances or generate authoritative outcomes.
- Keep stable identifiers for board tiles, buildings, districts, quests and transactions.
- Use a deterministic injectable RNG for unit tests. Gameplay result generation must happen **once per roll**.
- Use idempotency keys for actions involving currency, shields, upgrades and reward claims.
- Validate every economic operation: preconditions, caps, costs, signed balances and save lifecycle.
- Keep content data (board tiles, theme palettes, reward values, building costs) separate from UI code.

### Rendering and UX

- Use React Three Fiber for 3D scene composition; use CSS/React for HUD and dialogs.
- Prefer batching, geometry merging and `InstancedMesh` over thousands of individual cube meshes.
- Avoid arbitrary work in the render loop and per-frame object allocations.
- Keep VFX cancellable; quick-roll or reduced-motion settings must **not** change rewards.
- Maintain frame-appropriate adaptive quality; measure performance on actual mid-range Android hardware.
- Preserve portrait safe areas, keyboard/back handling, touch-sized targets and reachable close controls.
- Do not obstruct the main game with repetitive overlays, audio loops or notifications.

### State and persistence

- Store serialisable gameplay state in a versioned format.
- Use intentional save migrations and safe fallback for invalid/corrupted state.
- Avoid putting Three.js objects, DOM nodes or React elements in persistent state.
- Distinguish authoritative gameplay time from visual animation time.
- Do not trust editable local storage for online currency, competitive raids or purchases when those features eventually exist.

### Security, privacy and third-party work

- Do not commit API keys, service tokens, signing keys, `.env` files, keystores or user data.
- No client-side billing or reward validation for real-money purchases.
- Verify each dependency's version, browser/Android compatibility, maintenance and licence.
- Record any **actual** third-party source/assets in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); architectural inspiration is not the same as incorporating licensed code.
- Do not copy commercial board-game characters, board art, interfaces, music, protected names or proprietary assets.
- Do not assume a repository with no top-level LICENSE grants third parties broad reuse rights. Contact the maintainer about contributions or distribution rights if uncertain.

## Testing guidance

Minimum tests for relevant gameplay changes:

| Area | Test examples |
| --- | --- |
| Dice | seeded result, valid values, doubles, multiplier cost, no double dispatch |
| Board | start positions, 32-space wraparound, landing, step-by-step position |
| Rewards | correct tile effects, single application, clamped energy/shields |
| Economy | insufficient funds, max tier, exact upgrade cost, rollback on failure |
| Events | raid/heist selection, shield use, claim only once, cancel/resume safety |
| Save | full round trip, migration, bad JSON/data, reopened app, offline restoration |
| UI/3D | camera gestures, touch vs scroll, WebGL context loss, reduced motion |
| Android | viewport cutouts, background/resume, audio, low-memory recovery |

Use explicit seed/state fixtures rather than nondeterministic screenshots as the sole verification. If tests cannot run in the environment, **say so** and do not report a pass.

## Pull request checklist

Include the following checklist in the PR description and tick only completed items:

- [ ] Linked issue / roadmap milestone and clear scope
- [ ] Summary of player-facing behaviour and any rule changes
- [ ] Game model and rendering remain cleanly separated
- [ ] Added or updated deterministic tests where appropriate
- [ ] Applicable build, test, lint and typecheck commands run; results supplied
- [ ] Android/touch check on a real device where applicable (model, browser, resolution)
- [ ] Before/after screenshots or video for visual changes
- [ ] Save compatibility and rollback considerations addressed
- [ ] Third-party licence and asset attribution reviewed
- [ ] No secrets or copied commercial assets
- [ ] Known limitations, follow-up work and performance measurements disclosed

## AI-assisted contributions

AI-generated changes are welcome when they are **understood, tested and reviewed**.

- Provide the agent with [docs/AI_STUDIO.md](docs/AI_STUDIO.md) and this contributor guide.
- Require repo inspection and accurate reporting before any large change.
- Never accept fabricated build logs, completion claims, benchmark numbers or passing tests.
- Prefer one working vertical slice and smaller PRs over broad generated stubs.
- Review imports, licence information, error paths, API usage and persistent state carefully.
- Ask the agent to explicitly list **what it did not implement**.

## Reports and feedback

For bugs, include:
1. Expected vs actual behaviour.
2. Reproduction steps and game state.
3. Commit/branch, browser or Android build, OS and device details.
4. Screenshot/video and log output where relevant.
5. Whether the issue occurs in the **Kotlin prototype** or **React web client**.

For feature suggestions, explain the player's benefit, implementation cost, measurable acceptance criteria and [roadmap](ROADMAP.md) dependency.

The project's aim is a delightful original mobile game; reliability, performance and truthful progress reporting are more valuable than a large unchecked feature list.
