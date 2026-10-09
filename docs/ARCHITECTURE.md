# Architecture & System Design

**Blockbound: Dice Districts** is an original, portrait-first 3D voxel board-and-town progression game built on a unified web foundation for mobile browsers, PWA, and Android.

---

## 🏗️ Unified Runtime Architecture

Blockbound uses **`web/`** as its single canonical source of truth for game logic, rendering, simulation, and assets:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Blockbound Web Source                           │
│              (Vite + React 18 + TypeScript + Three.js + Zustand)        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ npm run build
                                     ▼
                        ┌─────────────────────────┐
                        │   web/dist (Bundle)     │
                        │ (HTML, JS, CSS, PWA, SW)│
                        └────────────┬────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│   Web & Mobile PWA Target    │              │    Android Shell Target      │
│  • Installable Web App       │              │  • app/src/main/assets/www/  │
│  • Offline Service Worker    │              │  • Synced via:               │
│  • Desktop / Mobile browsers │              │    npm run sync:android      │
│  • Google AI Studio preview  │              │  • Loaded by MainActivity.kt │
└──────────────────────────────┘              └──────────────────────────────┘
```

1. **Web & PWA (`web/`)**: React 18, `@react-three/fiber`, `three`, Zustand 4, Lucide icons. Service worker caches static assets; `manifest.webmanifest` provides portrait-locked mobile installation.
2. **Android WebView Shell (`app/src/main/assets/www/`)**: Hosted directly by `MainActivity.kt` (`file:///android_asset/www/index.html`). Synchronized directly from the compiled web distribution via `npm run sync:android`.
3. **Legacy Native Reference (`app/src/main/java/com/example/blockbound/`)**: Original Android Compose/Canvas prototype retained for reference.

---

## 📦 Web Architecture & Component Map

```text
web/src/
├── components/
│   ├── VoxelScene.tsx        # 3D R3F board, camera damping, token hop, pipped dice
│   ├── IslandView.tsx        # District progression, 5 landmark stages, damage & repairs
│   ├── HUD.tsx               # Responsive resource counters, build tracker, dice controls
│   ├── ResourceAmount.tsx    # Responsive compact number formatting (K/M/B) with overflow guard
│   ├── ResourceIcon.tsx      # SVG resource glyphs with crisp theme styling
│   ├── RewardPresentation.tsx# 3D flying particle flights from modal into HUD targets
│   ├── QuestsModal.tsx       # Rotating epoch challenges (Flash, Daily, Weekly) & lifetime badges
│   ├── SplashScreen.tsx      # Entry branding & asset preparation
│   └── GameFeel.css          # Dynamic district CSS variables, safe-area pads & animations
│
├── game/
│   ├── boardThemes.ts        # Pure 3D color palettes & lighting configs for all 3 districts
│   ├── rollRules.ts          # Pure 32-tile board definitions, cost formulas, seeded dice logic
│   ├── formatAmount.ts       # Compact abbreviation engine with rollover protection
│   ├── gameSave.ts           # SaveV1 schema validator, backup restore & offline energy catchup
│   ├── rotationEngine.ts     # Epoch time-window alignment (4h, 24h, 7d) & quest generation
│   ├── questDispatcher.ts    # Canonical gameplay action stream & progress updates
│   └── hotkeys.ts            # Desktop keyboard navigation (Space, Enter, R, M)
│
├── minigames/
│   ├── contracts.ts          # Pure TypeScript encounter contracts (v1 EncounterPlan / Result)
│   ├── heist/VaultHeist.tsx  # 3×3 grid of 9 safes, 3 picks, once-only reward resolution
│   └── raid/TownRaid.tsx     # 3 NPC targets, shielded damage resolution, single strike
│
├── services/audio/
│   └── sfx.ts                # Concurrency-controlled Web Audio synthesis with mute toggles
│
└── store/
    └── gameStore.ts          # Central Zustand state adapter coordinating rules, saves, and UI
```

---

## ⚙️ Deterministic Turn & Transaction Lifecycle

Every dice roll executes as a strict state machine to prevent duplicate claims, lost rolls, or visual desync:

```text
   [ READY ] ──(User Roll / Auto Roll)──► [ COMMITTED ]
                                                │
                                                ▼ (Deduct Energy once)
                                                ▼ (Commit Roll ID & Rewards)
                                                ▼ (Persist to SaveV1)
                                                │
   [ COMPLETE ] ◄──(Settle Rewards)────── [ RESOLVING ]
        ▲                                       ▲
        │                                       │ (Token Hop Complete)
        └────────── [ ANIMATING ] ──────────────┘
                    • 3D Pipped Dice Tumbling
                    • Tile-by-Tile Character Hop
                    • Sound & Haptic Pulses
```

### Key Invariants
1. **Precommitted Economy**: Dice outcome, landed tile, resource delta, and milestone bonuses are calculated and persisted to localStorage **before the first animation frame begins**. If the player refreshes mid-roll, the completed roll state restores without rerolling or loss.
2. **One-Roll-One-Transaction**: Minigames (`TownRaid`, `VaultHeist`) receive precommitted encounter options from the host store. They present choices to the player and fire their completion callback **at most once per encounter**.
3. **Responsive Number Formatting**: Coin and block totals format responsively via `ResourceAmount.tsx` and `formatCompactAmount.ts` (`125K`, `1.28M`, `10M`). Balances never push neighboring counters or wrap onto multiple lines, while exact integer amounts remain accessible via tooltips and screen-reader labels.
4. **Offline Catch-Up**: On launch, `tickRecovery()` calculates elapsed wall-clock time using monotonic safeguards. Energy regenerates at 1 unit per 45 seconds, strictly capped at `maxEnergy`. Device clock rollbacks cannot grant excess energy.

---

## 🧪 Verification & Quality Gates

The test suite runs entirely in Node.js with built-in zero-dependency test runner (`node --test`), compiling TypeScript in-memory:

```bash
cd web
npm test               # Runs 81 unit & integration tests in <6s
npm run typecheck      # Validates strict TypeScript compilation
npm run build          # Builds production bundle
npm run sync:android   # Syncs web build into Android app assets
```

All 81 tests execute deterministically without flaky timers, verifying roll wrapping, energy deductions, corrupted save rollbacks, timed quest turnover, and responsive number compaction.
