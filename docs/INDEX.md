# 📚 Blockbound Documentation Index

Comprehensive index of architectural documentation, game design specifications, research analyses, and contributor guides for **Blockbound: Dice Districts**.

---

## 🧭 Document Directory

```
├── README.md                                 # Primary project overview, visual gallery & quickstart
├── DESIGN.md                                 # Voxel art contract, palette, UI hierarchy & styling guidelines
├── TECHSTACK.md                              # Core tech stack, integration contracts & dependency rules
├── ROADMAP.md                                # Phased milestone tracking & deliverables
├── CONTRIBUTING.md                           # Development workflows, quality gates & PR rules
├── THIRD_PARTY_NOTICES.md                    # Open-source licenses & third-party notices
│
└── docs/
    ├── INDEX.md                              # This document index
    ├── ARCHITECTURE.md                       # High-level architecture, runtime surfaces & state machine
    ├── SAVE_RECOVERY.md                      # Versioned browser saves, offline regen & crash recovery
    ├── GAME_FEEL.md                          # Tactile feedback, hop locomotion & reward presentation
    ├── EXECUTION_PLAN.md                     # Phased roadmap, verification metrics & testing plan
    ├── UI_UX_REVIEW.md                       # Mobile ergonomics, safe areas & HUD layout specs
    ├── MOBILE_INTERACTION_RESEARCH.md        # Touch mechanics, gestures, auto-roll & accessibility
    ├── REWARD_DESIGN_RESEARCH.md             # Non-coercive retention, payout pacing & streak curves
    ├── AI_STUDIO.md                          # Google AI Studio Web App mode configuration & notes
    │
    ├── assets/
    │   ├── icon.png                          # High-resolution golden voxel dice app icon (512×512)
    │   └── screenshots/
    │       ├── 01-sunny-suburb-board.png     # District 01 3D board & isometric world
    │       ├── 02-town-raid-encounter.png    # Interactive Town Raid target selection modal
    │       ├── 03-town-raid-direct-hit.png   # Direct hit payout resolution
    │       ├── 04-landmark-tier-progression.png # Tier 2 Windmill upgrade & dynamic build goals
    │       └── 05-stake-multiplier-hud.png   # Dynamic stake multipliers & HUD counter layout
    │
    └── superpowers/
        ├── specs/
        │   └── 2026-10-08-timed-rotation-quests-design.md # Deterministic epoch rotation spec
        └── plans/
            └── 2026-10-08-timed-rotation-quests-plan.md   # Step-by-step quest implementation plan
```

---

## 📑 Guide Summaries

### 1. Foundational Architecture & State Engine
* [**System Architecture (`docs/ARCHITECTURE.md`)**](ARCHITECTURE.md): Runtime surface consolidation (Web/R3F canonical source powering desktop, mobile PWA, and Android WebView), turn lifecycle state machine (`READY → COMMITTED → PRESENTING → MOVING → RESOLVING → READY`), and deterministic roll contracts.
* [**Save Schema & Offline Catch-up (`docs/SAVE_RECOVERY.md`)**](SAVE_RECOVERY.md): `SaveV1` versioned browser persistence, atomic save transactions, corrupted checkpoint backups, and monotonic clock-safe energy regeneration (45s per energy, capped at max energy).
* [**Technical Stack & Contracts (`TECHSTACK.md`)**](file:///Volumes/Harry/DEV/Games%20Archive/Blockbound/blockbound/TECHSTACK.md): Runtime stack specifications (TypeScript, React 18, Three.js, Zustand, Lucide), pure game engine rules, and isolated minigame encounter contracts (`web/src/minigames/contracts.ts`).

### 2. Gameplay, Interaction & Game Feel
* [**Tactile Game Feel & Audio (`docs/GAME_FEEL.md`)**](GAME_FEEL.md): Character hop progression loops, numbered 3D dice faces, physical camera damping, particle arcs, and responsive audio synthesis with reduced-motion support.
* [**Mobile Interaction & Gestures (`docs/MOBILE_INTERACTION_RESEARCH.md`)**](MOBILE_INTERACTION_RESEARCH.md): Tap vs hold-to-auto gestures (`HOLD_TO_AUTO_MS = 540ms`), drag tolerance, one-roll-one-transaction safety, and keyboard hotkeys (`Space`, `Enter`, `R`, `M`).
* [**UI/UX Ergonomics & Overflow Protection (`docs/UI_UX_REVIEW.md`)**](UI_UX_REVIEW.md): Mobile portrait thumb-zone layouts, safe-area padding (`env(safe-area-inset-*)`), and responsive compact resource formatting (`formatCompactAmount` with `K/M/B` suffixes).

### 3. Visuals, Art & Theming
* [**Design System & Art Contract (`DESIGN.md`)**](file:///Volumes/Harry/DEV/Games%20Archive/Blockbound/blockbound/DESIGN.md): Chunky voxel toy-box aesthetic, 32-tile perimeter layouts, district colour palettes, and lighting design.
* [**Visual Asset Gallery (`docs/assets/screenshots/`)**](assets/screenshots/): Full capture gallery of the live 3D board, minigame encounters, and HUD progressions.

### 4. Progression, Quests & Events
* [**Timed Rotations & Quests Spec (`docs/superpowers/specs/`)**](superpowers/specs/2026-10-08-timed-rotation-quests-design.md): Deterministic epoch turnover engine (4h flash, 24h daily, 7d weekly), seed-based quest generation, and duplicate-claim prevention.
* [**Reward Systems Research (`docs/REWARD_DESIGN_RESEARCH.md`)**](REWARD_DESIGN_RESEARCH.md): Retention curves, 7-day login streak reward tables, milestone bonuses, and ethical game design avoiding coercive timers.

### 5. Delivery, Android & PWA
* [**Execution & Verification Plan (`docs/EXECUTION_PLAN.md`)**](EXECUTION_PLAN.md): Verification matrix, unit tests (`npm test`), build optimization, and performance targets.
* [**Android WebView Sync (`web/package.json`)**](file:///Volumes/Harry/DEV/Games%20Archive/Blockbound/blockbound/web/package.json): Single-command synchronization (`npm run sync:android`) pushing production web bundles to `app/src/main/assets/www/`.
* [**PWA Offline Capabilities (`web/public/manifest.webmanifest`)**](file:///Volumes/Harry/DEV/Games%20Archive/Blockbound/blockbound/web/public/manifest.webmanifest): Service worker shell caching, installable home-screen launcher, and offline notifications.
