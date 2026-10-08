# Timed Rotation & Pacing Engine + Quests Design Specification

- **Date:** 2026-10-08
- **Status:** Approved
- **Scope:** Sub-Project 1 of Feature Expansion (Timed Rotation & Pacing Engine + Quests)

---

## 1. Executive Summary

This specification defines the offline-first, deterministic timed rotation and pacing engine for Blockbound. It introduces scheduled epoch-based event windows (Flash Rush, Daily Quests, Weekly Milestones), a decoupled action dispatcher for quest progression, district-scaled pacing, auto-collection on expiration, and persistent save state continuation without requiring network or server authority.

---

## 2. Core Architecture

### 2.1 Epoch Windows
Rotation is driven by UTC epoch math, ensuring deterministic reset boundaries and full offline support:
- **Flash Rush (`flash`):** 4-hour cycle (`Math.floor(timestamp / (4 * 3600 * 1000))`).
- **Daily Quests (`daily`):** 24-hour cycle (`Math.floor(timestamp / 86400000)`).
- **Weekly Event (`weekly`):** 7-day cycle (`Math.floor((timestamp + 345600000) / 604800000)` aligned to Monday 00:00 UTC).

```
Window Expiry Calculation:
expiresAt = (windowId + 1) * windowDurationMs
remainingMs = Math.max(0, expiresAt - currentTimestamp)
```

### 2.2 Deterministic Quest Generation
Within each epoch window, quests are selected deterministically using a seeded pseudo-random hash:
- Seed: `hashString(`${windowType}_${windowId}_${slotIndex}`)`
- Quests are selected from categorized pools:
  - **Flash Pool:** Fast roll counts, doubles, quick coin earnings.
  - **Daily Pool:** Building upgrades, raids, heists, jackpot hits, passing GO.
  - **Weekly Pool:** Milestone achievements spanning multiple play sessions.
- Selection enforces unique quest types per active window (no duplicate tasks in the same slot set).

### 2.3 District Pacing & Dynamic Scaling
To ensure pacing remains engaging as the player upgrades districts:
- Base goals and rewards scale with `currentDistrict`:
  - **District 0 (Sunny Suburb):** 1.0x baseline.
  - **District 1 (Candy Harbour):** 1.4x target, 1.4x coin/material rewards.
  - **District 2+:** Progressive formula `1.0 + (districtIndex * 0.4)`.
- Energy and shield rewards remain calibrated (e.g. 5–15 energy) to prevent runaway infinite roll loops.

---

## 3. Data Structures & Action Dispatcher

### 3.1 Types & Contracts
```ts
export type WindowCadence = 'flash' | 'daily' | 'weekly';

export type QuestActionType =
  | 'roll'
  | 'doubles'
  | 'upgrade'
  | 'repair'
  | 'raid'
  | 'heist'
  | 'jackpot'
  | 'pass_go'
  | 'earn_coins';

export interface ActiveQuest {
  id: string;
  templateId: string;
  cadence: WindowCadence;
  windowId: number;
  title: string;
  icon: string;
  desc: string;
  actionType: QuestActionType;
  current: number;
  goal: number;
  claimed: boolean;
  reward: {
    coins: number;
    materials: number;
    energy: number;
  };
}

export interface RotationState {
  lastSeenTimestamp: number;
  windows: Record<WindowCadence, {
    windowId: number;
    quests: ActiveQuest[];
  }>;
}
```

### 3.2 Action Dispatcher
Whenever gameplay events resolve in `gameStore`:
- `dispatchQuestAction(action: QuestActionType, amount: number)`
- Increments `current = Math.min(goal, current + amount)` for all active, uncompleted quests matching `actionType`.
- Emits updates purely into the store state.

---

## 4. Turnover & Auto-Collection Mechanics

### 4.1 Rollover Detection
On app launch (`hydrateGame`), during periodic 1-second ticks (`tickRecovery`), or before any roll:
1. Compare `currentTimestamp` against active `windowId` for each cadence.
2. If `newWindowId > storedWindowId`:
   - Auto-collect all completed, unclaimed quests (`claimed === false && current >= goal`).
   - Credit reward sums (coins, materials, energy) directly to player balance.
   - Queue celebratory toast/notification: `"Quests Rotated: Auto-collected X coins & Y energy!"`.
   - Seed new quests for `newWindowId`.
   - Update `storedWindowId = newWindowId`.

### 4.2 Offline Continuity & Anti-Tampering
- Update `lastSeenTimestamp = Math.max(lastSeenTimestamp, currentTimestamp)`.
- If client system clock moves backward (`currentTimestamp < lastSeenTimestamp`), pin to `lastSeenTimestamp` to prevent timer reset exploits.
- Backward compatibility: If loading a save without `rotationState`, smoothly seed the initial rotation without mutating existing currency, tiles, or buildings.

---

## 5. UI Integration

### 5.1 HUD Button & Notifications
- HUD Quests button shows a badge badge with number of claimable quests.
- Visual warning badge when a Flash Quest has under 30 minutes remaining.

### 5.2 Quests Modal
- Categorized view with 3 tabs:
  - ⚡ **Flash Rush** (Live countdown `03h 42m 10s`, 2 quick slots).
  - 📅 **Daily Quests** (Countdown `14h 22m`, 3 slots).
  - 🏆 **Weekly Milestone** (Countdown `5d 18h`, 1 high-tier slot).
- Progress bar, claim button with sound & visual feedback.
- Banner reminder: *"Completed quests auto-collect when rotation ends"*.

---

## 6. Verification & Test Plan

1. **Epoch Math & Determinism:**
   - Same timestamp yields identical quest slots.
   - Different epochs yield varying, unique quests.
2. **Action Dispatcher:**
   - Rolling dice, upgrading plots, completing minigames correctly advances target counters.
3. **Turnover & Auto-Collection:**
   - Advancing time beyond window boundary auto-claims completed rewards and provisions fresh quests.
   - Incomplete quests reset.
4. **Save/Load Compatibility:**
   - Roundtrip serialisation into `localStorage`.
   - Legacy saves without `rotationState` upgrade smoothly without data loss.
