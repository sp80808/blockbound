# Blockbound — development roadmap

**Reviewed 8 October 2026.** This document separates **observed repository code** from **planned/verified functionality**. It is an ordered delivery plan, not a release-date promise.

[Product overview](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Contribution workflow](CONTRIBUTING.md)

## Snapshot

- **Exists in source:** `web/` React/TypeScript/Vite app, R3F 32-space mesh board, orbit camera, 3D dice **cubes**, character, basic building meshes, splash, HUD and Zustand economy/rolling/upgrades.
- **Exists separately:** Android/Kotlin project with WebView loading `app/src/main/assets/www/index.html`; Kotlin Compose prototype containing richer board/event models.
- **Not verified by this review:** working fresh build, CI, automated web tests, Android device performance or functioning Web-to-Capacitor asset sync.
- **Not implemented or incomplete in web source:** numbered/faced dice settlement, stepwise movement, full tile/event semantics, save/load, PWA, secure backend and online multiplayer.

Milestones use **[Planned]** until a linked PR has been tested and accepted. A code file alone is not an acceptance test.

## P0 — Consolidate the platform [Completed]

**Goal:** make the `web/` React Three Fiber application the one authoritative product source; eliminate confusion with the legacy Kotlin/Compose code and separate hand-written Android HTML.

- [x] Initial React/R3F/Zustand project checked in under `web/` (source existence only).
- [x] Basic browser WebGL scene with board, character, dice meshes and orbit controls exists in code.
- [x] Verify `npm install`, `npm run dev` and `npm run build` on a fresh checkout.
- [x] Add and commit a package lockfile and document a reproducible package-manager workflow.
- [x] Add `typecheck`, `test`, and build scripts to `web/package.json`.
- [x] Decide and document **one** Android packaging route: controlled WebView integration generated from Vite output (`npm run sync:android`); no independently diverging HTML game.
- [x] Synchronize built web bundle to `app/src/main/assets/www/` with verified packaging replacement.
- [x] Preserve useful Kotlin game rules and data in git history/fixture snapshots during migration.
- [x] Introduce modules for pure rules (`rollRules.ts`), content data (`boardThemes.ts`), persistence (`gameSave.ts`), quests (`rotationEngine.ts`), and minigames (`contracts.ts`).
- [x] Verify no runtime reliance on undeclared remote assets/CDNs or exposed API keys.

**Gate:** one documented source to edit and build, browser-rendered 3D on desktop and Android Chrome, and an automated distribution pipeline for supplying identical web assets to Android.

## P1 — Correct, rewarding gameplay [Completed]

### Turn system
- [x] Move dice outcomes and tile-resolution logic out of `web/src/store/gameStore.ts` into pure TypeScript game rules (`rollRules.ts`).
- [x] Add injectable seeded RNG for tests and a turn state machine: READY → ROLLED → ANIMATING → RESOLVING → COMPLETED.
- [x] Debounce repeated rolls; spend energy once; use unique action/roll IDs for reward idempotency.
- [x] Render correct die pips and **settle to the committed result**; quick-roll must not change outcomes.
- [x] Move token **one tile at a time** (`characterHop.test.mjs`); handle board wrap and event pauses.
- [x] Port *all* 32 tile effect definitions, including coin, material, shield, energy, mystery, raid, heist, milestone and jackpot types.
- [x] Implement the multiplier consistently for costs and payouts without duplicated rewards.

### World, construction and economy
- [x] Make buildings visually distinct by name/function, not uniform stacked cubes (`IslandView.tsx`).
- [x] Implement tier 0–4 geometry that differs in silhouette, roof, windows, decorations and height.
- [x] Animate upgrade construction block-by-block and synchronise material deductions to transactions.
- [x] Validate costs, caps, integer bounds, shield consumption, damage and repair.
- [x] Add standalone Vault Heist and Town Raid minigames using pure TS encounter contracts (`minigames/contracts.ts`).
- [x] Provide rotating timed quests (Flash, Daily, Weekly) and lifetime milestone progress tracking (`rotationEngine.ts`, `questDispatcher.ts`).
- [x] Add a versioned browser save schema (`SaveV1`) with recovery and offline energy catch-up (`gameSave.ts`); confirm reload persists position/currency/building tiers.

### UI and device
- [x] Make the board larger and better-framed in portrait without covering the primary controls.
- [x] Ensure all top buttons, modal close controls and energy counters are safe-area aware (`env(safe-area-inset-*)`).
- [x] Ensure touch drag on the 3D scene doesn't trigger roll or unintended gestures.
- [x] Provide responsive compact coin/block abbreviation (`ResourceAmount.tsx`, `K/M/B`) to eliminate mobile HUD text overflow.
- [x] Provide flying particle reward animations connecting directly to HUD counters with pop feedback.
- [x] Provide concise event notifications that never obscure board interactions; add reduced motion and sound controls.

**Gate (real, repeatable test):** launch → roll two real-faced dice → advance N tiles → resolve the correct space once → earn rewards → spend resources on a distinct 3D building upgrade → replay/reload → same saved state. Verified by 81 passing automated tests.

## P2 — Diorama personality and play feel [In progress]

- [x] Replace generic tiles with readable objects/icons, outlines and thematic corner locations.
- [x] Three distinct 3D board themes: Sunny Suburb, Candy Harbour, Neon Metropolis (`boardThemes.ts`).
- [x] Roads, trees, tiny NPCs, weather props and ambient lighting tailored to each district.
- [x] Construction progress indicators, camera focus, and celebration fanfare.
- [x] PvP damage visuals, shields, and visible repairs without permanently punishing players.
- [x] Tactile and restrained Web Audio synthesizer (`sfx.ts`) with mute toggles and concurrency control.
- [x] Complete **Sunny Suburb** 5-landmark construction loop with district warping.
- [ ] Explore further **Blockbound-only** mechanics (district layout customization) and community events.

- [ ] Profile instancing, shadows, pixel ratio, draw calls and GC spikes on real hardware.

**Gate:** ten enjoyable minutes of distinctive visuals and comprehensible progression; no persistent input blocking, uncontrolled SFX or distracting UI.

## P3 — Installability and Android QA [Planned]

- [ ] Add a valid PWA manifest, icons, offline asset caching and update strategy.
- [ ] Ensure the Vite build loads correctly from its deployment base path and in Android WebView/Capacitor.
- [ ] Profile both Android Chrome and System WebView, including WebGL context loss and app lifecycle.
- [ ] Wire Android build to **exact web build assets**; remove independent game implementations only after confidence in parity.
- [ ] Check screen cutouts, status/nav bars, rotation handling, back navigation, touch behaviour, audio/haptics and storage.
- [ ] Target 60 FPS on representative mid-range Android hardware where feasible, with 30 FPS / reduced-quality fallback.
- [ ] Add installable debug builds and a verifiable, signed release process with private credentials.
- [ ] Validate contemporary Play Store target SDK, device requirements, disclosures and package ID.
- [ ] Include performance/QA evidence, crash reports and rollback procedures.

**Gate:** tested APK/AAB of the **same web game**, preserving progression across restarts and background/foreground transitions; no claims based on Capacitor config existence alone.

## P4 — Content and retention [Deferred until core fun is validated]

- [ ] Data-driven economy progression, sources/sinks and balance simulation.
- [ ] Daily/weekly missions, energy regeneration and login rewards with grace periods.
- [ ] Collectible decorations, character customisation, landmark rarity and district unlocks.
- [ ] More visually distinct worlds built through shared asset/content definitions.
- [ ] Accessibility: reduced motion, adjustable effects, clear contrast and usable touch targets.
- [ ] Respectful optional rewarded ads/cosmetic purchases only with transparent rewards and consent.

**Gate:** several sessions remain fun without a paywall; balancing and event probability tables are documented, tested and configurable.

## P5 — Optional online systems [Deferred]

- [ ] Account identity and cloud saves.
- [ ] Asynchronous friends, opponent towns and leaderboard experiments.
- [ ] Server-authoritative dice/economy/encounter outcomes and tamper-resistant transactions.
- [ ] Verified Play Billing, entitlement reconciliation and account recovery.
- [ ] Costed infrastructure, privacy/security reviews and abuse controls.
- [ ] Live events/telemetry using consent-appropriate methods.

**Gate:** dedicated operational budget, security tests and compliance; never trust client-side currency or roll generation for paid/competitive outcomes.

## Highest-priority GitHub issues to create

1. **[P0] Unify Vite → Android WebView/Capacitor asset pipeline**. Current WebView bundles different HTML gameplay.
2. **[P0] Reproducible web build and CI**: lockfile, tests, lint, typecheck, Android browser smoke check.
3. **[P1] Engine-independent board and reward resolver**: port Kotlin tile semantics with parity fixtures.
4. **[P1] Deterministic and correct 3D dice**: pips, correct settling and rollback-safe state machine.
5. **[P1] Tile-by-tile token movement and camera follow**.
6. **[P1] Browser save schema and lifecycle recovery**.
7. **[P1] Distinct voxel building tiers with construction and repair VFX**.
8. **[P1] Functional raids, heists, quests and district progression**.
9. **[P2] Android-first world composition, HUD safe areas and measured performance**.

## Definition of done

A task is only done when its **acceptance criteria** pass and a PR provides: code diff, reproducible commands and logs, tests of business rules, relevant screenshots/video, Android device/browser details for mobile work, licence notices for imported work, and explicit known gaps. **Do not check an item solely because an AI-generated screen or file exists.**

### Important risks

| Risk | Practical mitigation |
| --- | --- |
| React app and separate `assets/www` drift | Generate one set of Android assets from the tested Vite bundle |
| Legacy prototype has more events than web port | Capture fixtures for every tile type, building and reward |
| Dice animation determines logical outcome | Roll outcome in pure rules first, render committed dice faces second |
| Web store state lost on reload | Versioned persistence and recovery tests |
| R3F performs poorly on Android | Benchmark early, instance meshes, cap shadows/pixel density |
| Unstable economy / duplicate rewards | Atomic reducers and action IDs with idempotency tests |
| AI claims progress not actually validated | Require builds, test output, diff links and device evidence |

Review this roadmap after every meaningful PR and keep checkboxes evidence-backed.
