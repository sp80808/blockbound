# Timed Rotation & Pacing Engine + Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an offline-first, deterministic timed rotation and pacing engine for Blockbound with 3-tier quest rotation (Flash 4h, Daily 24h, Weekly 7d), district-scaled pacing, action dispatching, save state persistence, and auto-collection on expiry.

**Architecture:** Epoch-based UTC time slots (`rotationEngine.ts`) deterministically generate varied quests via seeded hashing. A pure action dispatcher (`questDispatcher.ts`) increments progress from gameStore events. Turnover detection runs on ticks/hydration, auto-collecting unclaimed completed rewards. All state persists via `gameSave.ts`.

**Tech Stack:** TypeScript, React 18, Zustand, Node.js Test Runner (`node --test`), Vite.

**Spec:** `docs/superpowers/specs/2026-10-08-timed-rotation-quests-design.md`

## Global Constraints
- 100% offline-compatible: zero network calls, zero server dependencies.
- Deterministic: identical timestamps produce identical rotation slots.
- Anti-cheat monotonic timestamp verification: system clock rollbacks do not reset or cheat rotations.
- Backward compatibility: existing save files without `rotationState` load cleanly with zero data loss.
- Non-blocking auto-claim: completed unclaimed quests auto-collect into player balance upon turnover.
- Clean code: all tests must pass with `npm test`, types pass with `npm run typecheck`, and production bundle builds with `npm run build`.

---

### Task 1: Epoch Timing & Window Rotation Engine

**Files:**
- Create: `web/src/game/rotationEngine.ts`
- Create: `web/tests/rotationEngine.test.mjs`

**Interfaces:**
- Produces:
  - `getWindowId(cadence: WindowCadence, timestamp: number): number`
  - `getWindowExpiry(cadence: WindowCadence, windowId: number): number`
  - `getTimeRemaining(cadence: WindowCadence, timestamp: number): { remainingMs: number; formatted: string }`
  - `generateQuestsForWindow(cadence: WindowCadence, windowId: number, district: number): ActiveQuest[]`
  - `scalePacingByDistrict(baseValue: number, district: number): number`

- [ ] **Step 1: Write the failing tests for rotationEngine**
  - Test epoch window ID calculation for 4h flash, 24h daily, and 7d weekly.
  - Test deterministic quest generation from epoch hash (same timestamp = same quests).
  - Test unique quests per active window (no duplicates).
  - Test district scaling logic.

- [ ] **Step 2: Run tests and confirm failure**
  - Run: `node --test tests/rotationEngine.test.mjs`

- [ ] **Step 3: Implement `web/src/game/rotationEngine.ts`**
  - Implement duration constants (Flash: 4h, Daily: 24h, Weekly: 7d).
  - Implement seeded deterministic hash function.
  - Define template library of quests (roll, doubles, upgrade, repair, raid, heist, jackpot, pass_go, earn_coins).
  - Implement `generateQuestsForWindow` with deduplication and district scaling.

- [ ] **Step 4: Run tests to verify they pass**
  - Run: `node --test tests/rotationEngine.test.mjs`

- [ ] **Step 5: Commit Task 1**
  - `git add web/src/game/rotationEngine.ts web/tests/rotationEngine.test.mjs && git commit -m "feat: implement deterministic epoch rotation engine"`

---

### Task 2: Pure Action Dispatcher & Turnover Logic

**Files:**
- Create: `web/src/game/questDispatcher.ts`
- Create: `web/tests/questDispatcher.test.mjs`

**Interfaces:**
- Consumes: `ActiveQuest`, `WindowCadence`, `generateQuestsForWindow` from `rotationEngine.ts`
- Produces:
  - `dispatchQuestAction(state: RotationState, actionType: QuestActionType, amount: number): RotationState`
  - `checkAndTurnoverWindows(state: RotationState, currentTimestamp: number, district: number): { state: RotationState; autoCollectedReward: QuestReward | null }`
  - `claimQuest(state: RotationState, cadence: WindowCadence, questId: string): { state: RotationState; reward: QuestReward } | null`
  - `countClaimableQuests(state: RotationState): number`

- [ ] **Step 1: Write failing tests for questDispatcher**
  - Test action dispatching advances matching quest progress without exceeding goal.
  - Test claiming completed quest marks claimed and pays rewards once.
  - Test turnover across window boundaries auto-collects completed quests and replaces expired tasks.
  - Test backward clock jump does not break state or duplicate rewards.

- [ ] **Step 2: Run tests and confirm failure**
  - Run: `node --test tests/questDispatcher.test.mjs`

- [ ] **Step 3: Implement `web/src/game/questDispatcher.ts`**
  - Implement pure update functions for action dispatching.
  - Implement turnover resolution with auto-collection calculation.
  - Implement claim validation and reward tallying.

- [ ] **Step 4: Run tests to verify they pass**
  - Run: `node --test tests/questDispatcher.test.mjs`

- [ ] **Step 5: Commit Task 2**
  - `git add web/src/game/questDispatcher.ts web/tests/questDispatcher.test.mjs && git commit -m "feat: implement quest action dispatcher and turnover engine"`

---

### Task 3: Save State Persistence & Backward Compatibility

**Files:**
- Modify: `web/src/game/gameSave.ts`
- Modify: `web/tests/gameSave.test.mjs`

**Interfaces:**
- Consumes: `RotationState` from `questDispatcher.ts`
- Produces: Updated `ProgressSnapshot` with `rotationState`

- [ ] **Step 1: Write failing test in `tests/gameSave.test.mjs`**
  - Test that saves without `rotationState` are safely upgraded with initial rotation state.
  - Test round-trip persistence of active quest progress and window IDs.
  - Test clock rollback protection in save hydration.

- [ ] **Step 2: Run tests and confirm failure**
  - Run: `node --test tests/gameSave.test.mjs`

- [ ] **Step 3: Update `web/src/game/gameSave.ts`**
  - Add `rotationState` to `ProgressSnapshot` interface and sanitization.
  - Add default rotation state factory during save migration.
  - Ensure sanitization validates nested quests array and numbers.

- [ ] **Step 4: Run tests to verify they pass**
  - Run: `node --test tests/gameSave.test.mjs`

- [ ] **Step 5: Commit Task 3**
  - `git add web/src/game/gameSave.ts web/tests/gameSave.test.mjs && git commit -m "feat: persist rotation state and ensure save backward compatibility"`

---

### Task 4: Store Integration & Event Wiring

**Files:**
- Modify: `web/src/store/gameStore.ts`
- Modify: `web/tests/store.test.mjs`

**Interfaces:**
- Consumes: `dispatchQuestAction`, `checkAndTurnoverWindows`, `claimQuest`
- Produces: Store actions `claimRotationQuest(cadence, questId)` and store state `rotationState`

- [ ] **Step 1: Write failing test in `tests/store.test.mjs`**
  - Test rolling dice advances `'roll'` quest.
  - Test upgrading building advances `'upgrade'` quest.
  - Test tick turnover auto-collects rewards and updates player balances.
  - Test claiming rotation quest awards coins/materials/energy.

- [ ] **Step 2: Run tests and confirm failure**
  - Run: `node --disable-warning=DEP0205 --test tests/store.test.mjs`

- [ ] **Step 3: Update `web/src/store/gameStore.ts`**
  - Wire `dispatchQuestAction` into roll, upgrade, repair, encounter, pass GO, and jackpot actions.
  - Wire `checkAndTurnoverWindows` into `tickRecovery` and `hydrateGame`.
  - Add `claimRotationQuest` action and update claimable counts.

- [ ] **Step 4: Run tests to verify they pass**
  - Run: `node --disable-warning=DEP0205 --test tests/store.test.mjs`

- [ ] **Step 5: Commit Task 4**
  - `git add web/src/store/gameStore.ts web/tests/store.test.mjs && git commit -m "feat: wire rotation engine into gameStore actions and lifecycle"`

---

### Task 5: UI Modal & HUD Polish

**Files:**
- Create: `web/src/components/QuestsModal.tsx`
- Modify: `web/src/components/HUD.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/GameFeel.css`

**Interfaces:**
- Consumes: `rotationState`, `claimRotationQuest`, `activeModal`, `closeModal` from `useGameStore`

- [ ] **Step 1: Implement `web/src/components/QuestsModal.tsx`**
  - Multi-tab view: ⚡ Flash Rush (4h), 📅 Daily Quests (24h), 🏆 Weekly Milestone (7d).
  - Live countdown timers for each active tab.
  - Progress bar with percentage, current/goal counter.
  - Claim button with feedback and sound.
  - Informative banner: "Uncollected completed quests auto-collect when window rotates".

- [ ] **Step 2: Update `web/src/components/HUD.tsx`**
  - Display claimable quest badge count on the Quests icon button.
  - Add visual pulsing glow if any quest is ready to claim.

- [ ] **Step 3: Update `web/src/App.tsx`**
  - Render `QuestsModal` when `activeModal === 'quests'`.

- [ ] **Step 4: Add CSS styles in `web/src/components/GameFeel.css`**
  - Styled tabs, smooth countdown badges, animated progress fill, glowing claim buttons.

- [ ] **Step 5: Commit Task 5**
  - `git add web/src/components/QuestsModal.tsx web/src/components/HUD.tsx web/src/App.tsx web/src/components/GameFeel.css && git commit -m "feat: add tabbed rotating quests modal with countdowns and badges"`

---

### Task 6: Full Verification & PWA / TypeScript Build Validation

**Files:**
- Modify: `web/package.json` (add new test files to test script)

- [ ] **Step 1: Update `web/package.json` test script to include new tests**
- [ ] **Step 2: Run complete test suite**
  - Run: `npm test`
- [ ] **Step 3: Run TypeScript typecheck**
  - Run: `npm run typecheck`
- [ ] **Step 4: Run full production build**
  - Run: `npm run build`
- [ ] **Step 5: Commit Task 6**
  - `git commit -am "chore: update test scripts and verify full build"`
