# Roadmap — Blockbound: Dice Districts

_Last reviewed: 8 October 2026. This is a prioritised development plan, **not** a release schedule or a claim that milestones have shipped._

**Primary objective:** deliver an original, polished, **browser-playable 3D voxel board game** in Google AI Studio Web app mode, then package a tested Android build. Preserve useful gameplay rules from the existing Kotlin prototype while moving the client to React/TypeScript and actual WebGL 3D rendering.

## Status and scope

- **Existing baseline (legacy, not validated in this review):** Kotlin/Compose Android project with source for a 32-tile board, dice movement, rewards, a tiered town, raid/heist dialogs, quests and local persistence.
- **New web client:** **not present** on `main`.
- **Native 3D/WebGL game:** **not present** on `main`.
- **Android web wrapper / PWA:** **not present** on `main`.
- **Online multiplayer, billing or ad integration:** **not present** on `main`.

Statuses: **Existing prototype source** means implementation was seen in the repository, not fully QA-tested. **Planned** means not yet implemented. Move a milestone to **Done** only after satisfying its acceptance criteria and linking evidence.

## P0 — Establish the web-first foundation [Planned, blocking]

**Goal:** stop further divergence between the Compose prototype and the requested AI Studio Web application.

- [ ] Initialise a runnable React + TypeScript + Vite application with Three.js, React Three Fiber, Drei and Zustand, keeping dependency versions compatible.
- [ ] Add `package.json`, lockfile and working `dev`, `test`, `lint`, `typecheck` and `build` commands.
- [ ] Introduce explicit `game/core`, `game/content`, `scene`, `ui`, `state` and `platform` boundaries.
- [ ] Move gameplay constants and rules into engine-independent TypeScript functions before rebuilding every screen.
- [ ] Document the original Kotlin game state schema and stable IDs (tiles, districts, buildings, quests).
- [ ] Set up seeded outcome testing and snapshot fixtures that allow old/new rules to be compared.
- [ ] Make the web app directly previewable in **AI Studio Web app mode** and in a normal browser.
- [ ] Retain the Android/Kotlin prototype in git history (or clearly marked `legacy/` location) until functionality parity is proven.
- [ ] Add automated checks and project setup instructions matching the **actual** code, rather than placeholder commands.

**Acceptance:** fresh checkout launches the real React/WebGL app; CI/lint/typechecks run; there is a visible 3D object with orbit or touch gestures; automated rule fixtures pass; Kotlin files have not been misleadingly passed off as web code.

## P1 — End-to-end playable 3D slice [Planned, highest product priority]

**Goal:** the first ten minutes feel like a game, not an illustration.

### Board and camera
- [ ] Recreate the 32-space perimeter as meshes within a miniature 3D world.
- [ ] Implement a genuinely controllable three-quarter camera, bounded pan/pinch, sensible auto-framing and a prominent board.
- [ ] Keep tile identity, movement order and reward resolution independent of visual coordinates.
- [ ] Make the character travel correct spaces step-by-step with skip/quick-roll without changing the outcome.

### Dice and turn resolution
- [ ] Display **two 3D dice** with correct pips, face orientation and cinematic roll/settle animations.
- [ ] Use reproducible seeded rolls in tests; decouple the actual result from animation physics.
- [ ] Ensure roll button debouncing, legal energy costs, state transitions and zero duplicate rewards.
- [ ] Support multiplier costs and effects through tunable configuration, not UI hardcoding.

### Economy and building
- [ ] Award actual coins/materials/shields/energy when landing on relevant spaces.
- [ ] Allow constructing or upgrading at least one building through four distinguishable visual tiers.
- [ ] Implement a satisfying, scalable voxel assembly animation; persist the building tier.
- [ ] Reject unaffordable purchases atomically; prevent overflows/negative balances.
- [ ] Add a clean responsive HUD, one accessible reward overlay and working splash-to-game transition.
- [ ] Save, close and reopen without losing money, position or construction progress.

**Acceptance: complete manual flow:** launch → roll → move exactly the rolled number of spaces → receive the correct tile effect → upgrade a building → see changed **3D mesh** → close/reload → same valid state. At least one mid-range Android browser device must be tested with screenshots/video and performance numbers.

**Explicit non-goals for this phase:** cloud accounts, Google Play purchases, synchronised PvP, daily pop-up chains, seven fully built worlds and complex simulation AI.

## P2 — Distinctive voxel city and richer gameplay [Planned]

**Goal:** make Blockbound stand apart from generic dice-board titles.

- [ ] Establish a cohesive mini-diorama art direction: detailed buildings, streets, trees, unique tile silhouettes and consistent palettes.
- [ ] Replace repeated unbatched cubes with merged meshes/`InstancedMesh` where appropriate.
- [ ] Add responsive construction VFX and modest voxel damage/repair visuals; minimise allocations.
- [ ] Improve miniature inhabitants, weather/ambient details and accessible reward feedback.
- [ ] Implement the raid and heist events as interactive, state-safe mini-sequences with **fictional offline opponents**.
- [ ] Add shields, repairs, quests and district-completion triggers.
- [ ] Create the first polished district, **Sunny Suburb**, before producing many underdeveloped worlds.
- [ ] Explore one differentiated feature in depth: **player-influenced town planning/decorations** or **construction combos**.
- [ ] Improve music, one-shot SFX, sound concurrency, reduced-motion options and haptics where available.

**Acceptance:** visual upgrades visibly affect a persistent world; raid/heist rewards are processed once; events are skippable or brief; no input dead zones or offscreen dialogs on small portrait devices.

## P3 — Mobile experience and Android packaging [Planned]

**Goal:** a stable installable game, not merely a successful desktop preview.

- [ ] Responsive 9:16 layout across short, tall and cutout screens; reachable controls and close buttons.
- [ ] Touch gestures that do not fight browser scrolling or roll-button input.
- [ ] PWA manifest, icons, offline assets, version-aware cache invalidation and update recovery.
- [ ] Test WebGL context-loss/restoration and lifecycle background/foreground transitions.
- [ ] Profile GPU, memory, battery, overdraw and asset size on representative Android hardware.
- [ ] Aim for 60 FPS on target devices with an explicit lower-quality/30 FPS fallback, measuring results.
- [ ] Integrate Capacitor **after** web gameplay passes the device quality gate.
- [ ] Verify WebView performance, haptics, audio permissions, back navigation and immersive/safe-area behaviour.
- [ ] Produce signed release artifacts using protected CI secrets; do not check in credentials.
- [ ] Validate the then-current Google Play requirements instead of freezing SDK/policy assumptions in docs.

**Acceptance:** QA-tested, installable Android build preserving state across restart, with no major touch, audio, device-rotation, render or payment-placeholder regressions.

## P4 — Retention, content tools and accessibility [Planned]

**Goal:** enjoyable repeat play supported by measurable, respectful design.

- [ ] Daily/weekly missions, energy regeneration, returning-player rewards and sensible streak grace periods.
- [ ] Additional districts defined as data, with reusable assets and upgrade templates.
- [ ] Collectible cosmetic decorations, character customisation and achievable progression goals.
- [ ] Content/economy tuning via versioned configuration files instead of scattered magic numbers.
- [ ] Economy spreadsheet covering sinks/sources, pacing, upgrade costs, event odds and progression time.
- [ ] Improve contrast, touch-target size, reduced motion, subtitles/labels and colour-blind legibility.
- [ ] Privacy-aware gameplay analytics and opt-in instrumentation where applicable.

**Acceptance:** multi-session pacing can be tested and tuned without code changes, progression never requires payment to continue, and rewards/odds are correctly described.

## P5 — Optional connected systems [Deferred]

Introduce **only if there is proven demand and operating budget**:

- [ ] Account login and server-side save/restore.
- [ ] Asynchronous friend visits/raids and leaderboards.
- [ ] Server-authoritative rolls, economy operations, entitlement checks and rate limiting.
- [ ] Auditable, tamper-resistant event processing and anti-abuse controls.
- [ ] Optional ads/purchases with age-appropriate, policy-compliant consent and clear prices.
- [ ] Live events and remote configuration with rollback support.

**Acceptance:** deployment, security, operations and cost are documented; no real opponent data or currency is trusted purely from the client; compliance and billing tests pass.

## Cross-cutting definition of done

Every user-visible task should include:

1. **Function:** real interaction and complete state transition, not a decorative or mock button.
2. **Reproducibility:** meaningful unit/integration test (seeded RNG where relevant).
3. **Mobile UX:** at least one small portrait viewport and real Android check for interaction-heavy changes.
4. **Performance:** no obvious jank or unbounded scene/particle allocations; measured before/after for optimisations.
5. **Lifecycle:** correct save/reload and pause/resume behaviour when game state changes.
6. **Evidence:** reproducible commands, screenshots/video as appropriate, limitations and rollback plan in the PR.
7. **Licensing:** no copied proprietary assets; update notices for any reused code/assets.

## Near-term issue/PR order

1. **[P0] Scaffold AI Studio React/R3F client**, lockfile, tests and architecture boundaries.
2. **[P0] Port immutable board/economy/turn rules** with deterministic fixtures from Kotlin.
3. **[P1] Render 3D board, camera and token** with proper touch controls.
4. **[P1] Animate true 3D dice + settle to predetermined legal result**.
5. **[P1] Tile-resolution pipeline and 3D building upgrade/save/load**.
6. **[P1] Polished mobile HUD and first on-device acceptance pass**.
7. **[P2] Raids, heists and construction/damage polish**.

Track real work via linked GitHub issues and PRs. Don't mark checkboxes as completed because an AI assistant generated a plan or because a screenshot looks plausible.

## Key risks and mitigations

| Risk | Mitigation |
| --- | --- |
| AI Studio silently creates a Kotlin app | Explicitly choose **Web app mode**; require `package.json`, TSX and working browser preview |
| Existing UI is mistaken for true 3D | Verify `<Canvas>` from R3F, actual meshes and runtime camera/depth behaviour |
| Port breaks economy or progression | Shared ID tables, golden rule fixtures and parity comparisons |
| PWA works on desktop but not Android | Early on-device testing and graphics quality tiers |
| Costly online/social integration too early | Offline-first vertical slice; backend deferred |
| Rewards double-apply after animations | Single state-machine transaction, unique roll/event IDs and idempotency tests |
| Too much content before fun is proven | Complete **one** district and the roll/build loop first |

See [README.md](README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for implementation guidance.
