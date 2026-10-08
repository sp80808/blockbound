import {
  ActiveQuest,
  generateQuestsForWindow,
  getWindowId,
  QuestActionType,
  QuestReward,
  WindowCadence
} from './rotationEngine';

export interface RotationWindow {
  windowId: number;
  quests: ActiveQuest[];
}

export interface RotationState {
  lastSeenTimestamp: number;
  windows: Record<WindowCadence, RotationWindow>;
}

export const ALL_CADENCES: readonly WindowCadence[] = ['flash', 'daily', 'weekly'];

export function createInitialRotationState(timestamp: number, district = 0): RotationState {
  const safeTime = Math.max(0, timestamp);
  const windows: Record<WindowCadence, RotationWindow> = {
    flash: {
      windowId: getWindowId('flash', safeTime),
      quests: generateQuestsForWindow('flash', getWindowId('flash', safeTime), district)
    },
    daily: {
      windowId: getWindowId('daily', safeTime),
      quests: generateQuestsForWindow('daily', getWindowId('daily', safeTime), district)
    },
    weekly: {
      windowId: getWindowId('weekly', safeTime),
      quests: generateQuestsForWindow('weekly', getWindowId('weekly', safeTime), district)
    }
  };

  return {
    lastSeenTimestamp: safeTime,
    windows
  };
}

/**
 * Dispatch an action across all active windows. Pure function.
 * Increments matching quests, clamped at `goal`.
 */
export function dispatchQuestAction(
  state: RotationState,
  actionType: QuestActionType,
  amount: number
): RotationState {
  if (amount <= 0) return state;

  let changed = false;
  const newWindows = { ...state.windows };

  for (const cadence of ALL_CADENCES) {
    const win = state.windows[cadence];
    if (!win) continue;

    let winChanged = false;
    const updatedQuests = win.quests.map(quest => {
      if (quest.actionType !== actionType || quest.claimed || quest.current >= quest.goal) {
        return quest;
      }
      winChanged = true;
      return {
        ...quest,
        current: Math.min(quest.goal, quest.current + amount)
      };
    });

    if (winChanged) {
      changed = true;
      newWindows[cadence] = {
        ...win,
        quests: updatedQuests
      };
    }
  }

  if (!changed) return state;

  return {
    ...state,
    windows: newWindows
  };
}

/**
 * Checks if any window has rolled over past its expiration time.
 * If rolled over:
 *  - Auto-collects any completed but unclaimed rewards from the expiring window.
 *  - Generates fresh quests for the new window.
 *  - Discards incomplete quests.
 */
export function checkAndTurnoverWindows(
  state: RotationState,
  currentTimestamp: number,
  district = 0
): { state: RotationState; autoCollectedReward: QuestReward | null } {
  // Prevent time travel backwards
  const safeTime = Math.max(state.lastSeenTimestamp, currentTimestamp);

  let collectedCoins = 0;
  let collectedMats = 0;
  let collectedEnergy = 0;

  const newWindows = { ...state.windows };

  for (const cadence of ALL_CADENCES) {
    const currentWin = state.windows[cadence];
    const targetWinId = getWindowId(cadence, safeTime);

    if (!currentWin || targetWinId > currentWin.windowId) {

      // Auto-collect completed, unclaimed quests in the old window
      if (currentWin) {
        for (const q of currentWin.quests) {
          if (!q.claimed && q.current >= q.goal) {
            collectedCoins += q.reward.coins;
            collectedMats += q.reward.materials;
            collectedEnergy += q.reward.energy;
          }
        }
      }

      // Generate fresh quests for the new window
      newWindows[cadence] = {
        windowId: targetWinId,
        quests: generateQuestsForWindow(cadence, targetWinId, district)
      };
    }
  }

  const nextState: RotationState = {
    lastSeenTimestamp: safeTime,
    windows: newWindows
  };

  const hasRewards = collectedCoins > 0 || collectedMats > 0 || collectedEnergy > 0;
  const autoCollectedReward: QuestReward | null = hasRewards
    ? { coins: collectedCoins, materials: collectedMats, energy: collectedEnergy }
    : null;

  return {
    state: nextState,
    autoCollectedReward
  };
}

/**
 * Claims a specific quest by cadence and ID.
 * Returns updated state and earned reward, or null if quest cannot be claimed.
 */
export function claimQuest(
  state: RotationState,
  cadence: WindowCadence,
  questId: string
): { state: RotationState; reward: QuestReward } | null {
  const win = state.windows[cadence];
  if (!win) return null;

  const targetIdx = win.quests.findIndex(q => q.id === questId);
  if (targetIdx === -1) return null;

  const quest = win.quests[targetIdx];
  if (quest.claimed || quest.current < quest.goal) {
    return null; // Not ready or already claimed
  }

  const updatedQuests = [...win.quests];
  updatedQuests[targetIdx] = {
    ...quest,
    claimed: true
  };

  const nextState: RotationState = {
    ...state,
    windows: {
      ...state.windows,
      [cadence]: {
        ...win,
        quests: updatedQuests
      }
    }
  };

  return {
    state: nextState,
    reward: { ...quest.reward }
  };
}

/**
 * Count total number of completed, unclaimed quests across all active windows.
 */
export function countClaimableQuests(state: RotationState): number {
  let count = 0;
  for (const cadence of ALL_CADENCES) {
    const win = state.windows[cadence];
    if (!win) continue;
    for (const q of win.quests) {
      if (!q.claimed && q.current >= q.goal) {
        count++;
      }
    }
  }
  return count;
}
