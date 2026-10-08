/**
 * Quest catalogue — pure definitions plus progress derivation.
 * Progress comes only from canonical lifetime counters owned by the host
 * store; claiming is idempotent by quest id and pays bounded rewards once.
 */

export interface LifetimeCounters {
  totalRolls: number;
  doublesTotal: number;
  upgradesBuilt: number;
  raidsCompleted: number;
  heistsCompleted: number;
  jackpotsHit: number;
}

export interface QuestReward {
  coins: number;
  materials: number;
  energy: number;
}

export interface QuestDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  reward: QuestReward;
  /** Bounded 0..goal progress for the progress bar. */
  progressOf: (counters: LifetimeCounters) => { have: number; goal: number };
}

function capped(have: number, goal: number): { have: number; goal: number } {
  return { have: Math.min(Math.max(0, have), goal), goal };
}

export const QUEST_DEFS: readonly QuestDef[] = [
  {
    id: 'q_warm_dice',
    name: 'Warm Dice',
    icon: '🎲',
    desc: 'Roll the dice 5 times.',
    reward: { coins: 5000, materials: 0, energy: 0 },
    progressOf: c => capped(c.totalRolls, 5)
  },
  {
    id: 'q_high_roller',
    name: 'High Roller',
    icon: '🎰',
    desc: 'Roll the dice 25 times.',
    reward: { coins: 20000, materials: 5, energy: 0 },
    progressOf: c => capped(c.totalRolls, 25)
  },
  {
    id: 'q_lucky_pair',
    name: 'Lucky Pair',
    icon: '🍀',
    desc: 'Roll doubles 3 times in total.',
    reward: { coins: 10000, materials: 0, energy: 5 },
    progressOf: c => capped(c.doublesTotal, 3)
  },
  {
    id: 'q_builder',
    name: 'Town Builder',
    icon: '🔨',
    desc: 'Upgrade 3 buildings.',
    reward: { coins: 10000, materials: 5, energy: 0 },
    progressOf: c => capped(c.upgradesBuilt, 3)
  },
  {
    id: 'q_raider_robber',
    name: 'Raider & Robber',
    icon: '⚔️',
    desc: 'Complete 1 raid and 1 vault heist.',
    reward: { coins: 25000, materials: 0, energy: 5 },
    progressOf: c => capped(Math.min(c.raidsCompleted, c.heistsCompleted), 1)
  },
  {
    id: 'q_jackpot_joy',
    name: 'Jackpot Joy',
    icon: '✨',
    desc: 'Land on the Jackpot tile.',
    reward: { coins: 30000, materials: 0, energy: 10 },
    progressOf: c => capped(c.jackpotsHit, 1)
  }
];

export type QuestState = 'claimable' | 'claimed' | 'locked';

export interface QuestView {
  def: QuestDef;
  have: number;
  goal: number;
  complete: boolean;
  state: QuestState;
}

/** Full quest board for the UI: progress, completion and claim state. */
export function questViews(
  counters: LifetimeCounters,
  claimedIds: readonly string[]
): QuestView[] {
  const claimed = new Set(claimedIds);
  return QUEST_DEFS.map(def => {
    const { have, goal } = def.progressOf(counters);
    const complete = have >= goal;
    return {
      def,
      have,
      goal,
      complete,
      state: claimed.has(def.id) ? 'claimed' : complete ? 'claimable' : 'locked'
    };
  });
}

/** Quests ready to claim right now (unclaimed + complete). */
export function claimableQuests(
  counters: LifetimeCounters,
  claimedIds: readonly string[]
): QuestDef[] {
  return questViews(counters, claimedIds)
    .filter(v => v.state === 'claimable')
    .map(v => v.def);
}

/** Validate a claim: known id, goal met, not claimed before. */
export function validateClaim(
  questId: string,
  counters: LifetimeCounters,
  claimedIds: readonly string[]
): QuestDef | null {
  const def = QUEST_DEFS.find(q => q.id === questId);
  if (!def || claimedIds.includes(questId)) return null;
  const { have, goal } = def.progressOf(counters);
  return have >= goal ? def : null;
}
