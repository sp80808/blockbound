# BLOCKBOUND TECHSTACK.md — canonical stack and integration protocol

> **Source of truth (8 October 2026):** `sp80808/blockbound`, `main` at commit `6b104f1`. See [DESIGN.md](DESIGN.md) for design language, [README.md](README.md) for implementation status, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for runtime consolidation.

## 1. Runtime and source-of-truth decision

**Authoritative product:** `web/` — Vite + React/TypeScript + Three.js/React Three Fiber. Google AI Studio Build Mode **Web App**, not native Kotlin. Build for mobile Chrome, iOS Safari and an eventual Android shell/PWA.

**Important runtime split (do not accidentally expand it):**
- `web/src/`: active target, React/WebGL app. Has **one district**, procedural board, simple dice and upgrades. Basic economy is in-memory.
- `app/src/main/assets/www/index.html`: *different* static HTML/Three.js game used by Android `MainActivity.kt`, with richer heist/raid/tile logic, pip dice and localStorage.
- `app/src/main/java/com/example/blockbound/`: older Kotlin/Compose reference, **not** active game runtime in Android launcher.

**Never generate a fourth full game.** An isolated mini-game laboratory is allowed only to deliver importable modules that integrate into the single `web/` product.

## 2. Verified dependency baseline (from `web/package.json`)

| Role | Existing package | Current manifest range | Scope |
| --- | --- | --- | --- |
| App UI | `react`, `react-dom` | `^18.3.1` | Main UI |
| Language | `typescript` | `^5.2.2` | Strict typed logic |
| Dev/build | `vite`, `@vitejs/plugin-react` | `^5.2.0`, `^4.2.1` | Web |
| WebGL | `three` | `^0.164.1` | Scene and mesh |
| React 3D | `@react-three/fiber` | `^8.16.0` | Render loop |
| 3D utilities | `@react-three/drei` | `^9.105.0` | Controls/helpers |
| State | `zustand` | `^4.5.2` | Current provisional store |
| Icons | `lucide-react` | `^0.378.0` | DOM UI |
| Mobile bridge | `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` | `^6.0.0` | **Not yet validated** |

Current commands: `npm run dev`, `npm run build` (`tsc && vite build`), `npm run preview`, `npm run cap:sync`. No committed lockfile or web test/lint scripts were observed. Install, build, CI, PWA and Android sync success have **not been verified** from this review. Add tools incrementally, record actual test output, and avoid gratuitous major upgrades across source branches.

**External minigame labs must target this compatibility baseline**, not silently adopt React 19, R3F v9 or a separate global router/store. Lovable may scaffold Tailwind/shadcn; minigame packages must not depend on Lovable-specific Supabase, routing, proprietary UI, global Tailwind resets or server infrastructure.

## 3. Recommended code boundaries

```text
web/src/
  game/
    rules/             # pure TS dice, tile encounters, currencies, payouts
    content/           # district/building/tile definitions and event configs
    contracts/         # encounter and GameAction TypeScript types
    events/            # host event resolver and idempotent claim lifecycle
  minigames/
    heist/             # portable component + pure encounter reducer
    raid/              # portable component + pure encounter reducer
    excavation/        # later
  components/
    VoxelScene.tsx     # real R3F scene; no game-economy authority
    HUD.tsx            # app-level resources and navigation
  store/
    gameStore.ts       # Zustand adapter; delegates to pure rules
  services/
    persistence/       # versioned browser save & migrations
    audio/             # one-shot audio, user-controlled settings
```

This is a **proposed structure**, not a claim that these paths exist today. Parallel labs should deliver into `src/minigames/` inside their own repo, importable to Blockbound using ordinary TypeScript modules. Avoid copying any full-page app shell into `web/src/`.

## 4. Pure encounter contracts (v1 proposal)

Export public TypeScript types from `src/minigames/contracts.ts`; do not bind to Zustand types.

```ts
export type Currency = 'coins' | 'materials' | 'energy' | 'shields';
export type Reward = { currency: Currency; amount: number };

export type EncounterTheme = 'sunny' | 'candy' | 'neon' | 'pirate';

export type EncounterPlan<T = unknown> = {
  version: 1;
  encounterId: string;             // globally unique; assigned by host
  kind: 'heist' | 'raid' | 'excavation';
  theme: EncounterTheme;
  seed: string;                    // deterministic fixture/replay
  payload: T;                      // immutable input; may hide reveal details in UI
};

export type EncounterResult = {
  version: 1;
  encounterId: string;
  kind: EncounterPlan['kind'];
  selectedIds: string[];
  rewards: Reward[];               // host validates against committed plan
  eventLog: Array<{ type: string; itemId?: string; step: number }>;
  completedAt: string;             // ISO-8601 informational only
};

export type MinigameProps<T = unknown> = {
  plan: EncounterPlan<T>;
  reducedMotion?: boolean;
  soundEnabled?: boolean;
  onComplete: (result: EncounterResult) => void;
  onExit: (reason: 'cancel' | 'close') => void;
};
```

**Trust and security:** The browser is untrusted. The UI may display precommitted reward assignments, but the host/server must derive and validate the ultimate payout, not trust `result.rewards`. Do not transmit hidden safe outcomes to clients in multiplayer settings until appropriate reveal; for this offline proof-of-concept, deterministic immutable local plans are acceptable. No direct balance changes or `localStorage` writes inside minigames.

**Idempotency:** enforce at host reducer by `encounterId` (processed set / transaction ledger), and additionally guard UI callback from repeat clicks. Use integers, bounds checking and explicit currency caps. Never use `Date.now` or `Math.random` in a pure resolver; pass seed/RNG/clock as inputs.

### Host bridge lifecycle

```text
BOARD_RESOLVED -> ENCOUNTER_READY(plan) -> ENCOUNTER_ACTIVE
-> CHOICES_COMMITTED (once) -> RESULT_VALIDATED -> REWARDS_APPLIED (once)
-> ENCOUNTER_CLOSED -> BOARD_READY
```

Transitions must tolerate double taps, cancelled animations, navigating away and reloading. Only the host owns quest/event updates, inventory, saves, online identities and resource balance. The presentation must be replayable from `plan + eventLog`.

## 5. Modular contracts per minigame

### Vault Heist
```ts
type HeistPayload = {
  pickLimit: 3;
  safes: Array<{
    id: string;
    visualVariant: 'brass' | 'steel' | 'crystal';
    rewards: Reward[]; // demo only: real server must not leak hidden values
  }>;
};
```
Exactly 9 distinct IDs; max 3 unique picks; finalize once; no hard-coded center jackpot, no repeated reward claim.

### Town Raid
```ts
type RaidPayload = {
  opponent: { id: string; displayName: string; kind: 'npc' | 'player' };
  targets: Array<{
    id: string; label: string; buildingTier: number;
    shielded: boolean;
    outcomeRewards: Reward[];
  }>;
  choiceLimit: 1;
};
```
Select one target, show an actual 3D impact/shield response, finish once. Offline fixture `opponent.kind` **must be `npc`**. Avoid inventing player leaderboards or overwriting other users' towns.

### Treasure Excavation (next)
Document `width, height, tiles, toolsAvailable, revealSequence, rewardTable` as immutable host-provided data. Every dig decrements one tool once. Entire excavation event can resume from a typed choice log.

## 6. Host adapter integration checklist

When Lovable/Replit returns a minigame:

1. Review its dependency graph and package versions against existing `web/package.json`.
2. Import only portable component(s), contracts, test fixtures, reducer and scoped styles.
3. Adapt existing `gameStore` to issue an immutable `EncounterPlan` on `HEIST`/`RAID` resolved tile; do not fork the game store.
4. Make modal draw on top of active 3D board, preserving board camera state and HUD. Pause board controls while active.
5. Validate `EncounterResult` against plan, check `encounterId` not processed, apply rewards **once**, persist atomically.
6. Dispatch canonical `EncounterCompleted` once to quests/live events only if applicable.
7. On resume, restore plan + committed choices, or return an explicit policy-driven cancellation state.
8. Test portrait viewport, touch actions, modal close access, 3D frame rate and cleanup.
9. Open an integration PR from a separate feature branch/repo; show test logs and screenshots; leave merge manual until verified.

**Recommended initial delivery:** Vault Heist and Town Raid from one experimental Lovable mini-game project, isolated from the canonical Blockbound GitHub repository. Replit's existing blockbound copy may be used as a reference, not as a source of second authoritative runtime.

## 7. Performance, accessibility and asset rules
- Batch/instance repeated voxels; minimize draw calls and shader variants.
- Cap shadows/particles, adapt DPR, avoid frequent React state writes in `useFrame`.
- Test on mid-range Android Chrome and iOS Safari as available; no fabricated 60 FPS claims.
- Mobile DOM controls >= 44px target; camera input isolated from modal touches; safe-area insets.
- Pause or suspend activity when document hidden; clean up animation frames, listeners and GPU buffers.
- Support screen-reader controls, keyboard navigation, high-contrast labels and reduced motion.
- Prefer original procedural geometry or legally licensed CC0 assets; save actual upstream licence texts and changes to `THIRD_PARTY_NOTICES.md`.
- Avoid direct DOM access to assets from external CDNs without a reviewed privacy/offline dependency decision.

## 8. Parallel repo / PR workflow

Use **one independent sandbox repository for the lab**, not the canonical main branch. If the Lovable project offers GitHub sync, connect that project to its **own** GitHub repository (e.g. `blockbound-minigames-lab`), rather than `sp80808/blockbound` directly. A Lovable project alone is **not** proof a new GitHub repo exists.

Delivery rules:
- A separate repo or feature branch is mandatory before integration; no unreviewed push to `main`.
- `DESIGN.md`, `TECHSTACK.md`, and `README.md` must be read before coding; `INTEGRATION.md` shipped back.
- Version contracts (`version: 1`); differences require deliberate migration.
- Maintain unit tests and fixture snapshots. Integration PR must link lab commit SHA and explain copy vs vendoring decision.
- No duplicate game-wide app state, independent coin bank, untrusted multiplayer claims or cloned proprietary UI.
- If future app is made public, keep secrets, keystores, personal data, asset rights and licensing in mind.

## 9. Build/test gates and concrete scope

**Acceptance for lab:** working standalone responsive preview of 3×3 Vault Heist and Town Raid; deterministic fixtures; once-only completion; observable impact/safe animations; reduced-motion toggle; 10+ focused tests; TypeScript build; integration guide with public API and exact package requirements.

**Acceptance for Blockbound merge:** no regressions to 32-tile board, upgrades or existing save; correct economy; repeated confirm/cancel/reload does not mint twice; consumes encounter plan once; preserves mobile camera layout; claims only source-backed test status.

**First step for any coding agent:** inspect the current `web/` before integration, compare to this document, list mismatches explicitly, and implement the smallest verifiable connected change.
