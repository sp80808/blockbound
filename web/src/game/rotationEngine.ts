/**
 * Pure deterministic epoch rotation engine for Blockbound.
 * Divides time into UTC windows (Flash 4h, Daily 24h, Weekly 7d),
 * picks varied quests via seeded hash, and scales pacing by district.
 */

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

export interface QuestReward {
  coins: number;
  materials: number;
  energy: number;
}

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
  reward: QuestReward;
}

export interface QuestTemplate {
  templateId: string;
  cadence: WindowCadence;
  title: string;
  icon: string;
  actionType: QuestActionType;
  baseGoal: number;
  baseReward: QuestReward;
  desc: (goal: number) => string;
}

export const CADENCE_DURATIONS_MS: Record<WindowCadence, number> = {
  flash: 4 * 3600 * 1000,       // 4 hours
  daily: 24 * 3600 * 1000,      // 24 hours
  weekly: 7 * 24 * 3600 * 1000  // 7 days
};

// 1970-01-01 was a Thursday. Offset by 4 days (345,600,000 ms) so weekly reset aligns to Monday 00:00 UTC.
export const WEEKLY_OFFSET_MS = 4 * 24 * 3600 * 1000;

export function getWindowId(cadence: WindowCadence, timestamp: number): number {
  const safeTime = Math.max(0, timestamp);
  if (cadence === 'weekly') {
    return Math.floor((safeTime + WEEKLY_OFFSET_MS) / CADENCE_DURATIONS_MS.weekly);
  }
  return Math.floor(safeTime / CADENCE_DURATIONS_MS[cadence]);
}

export function getWindowExpiry(cadence: WindowCadence, windowId: number): number {
  if (cadence === 'weekly') {
    return (windowId + 1) * CADENCE_DURATIONS_MS.weekly - WEEKLY_OFFSET_MS;
  }
  return (windowId + 1) * CADENCE_DURATIONS_MS[cadence];
}

export function getTimeRemaining(
  cadence: WindowCadence,
  currentTimestamp: number,
  forcedWindowId?: number
): { remainingMs: number; formatted: string } {
  const windowId = forcedWindowId !== undefined ? forcedWindowId : getWindowId(cadence, currentTimestamp);
  const expiry = getWindowExpiry(cadence, windowId);
  const remainingMs = Math.max(0, expiry - currentTimestamp);

  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else {
    const pad = (n: number) => n.toString().padStart(2, '0');
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return { remainingMs, formatted };
}

/** 32-bit FNV-1a hash */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function scalePacingByDistrict(baseValue: number, district: number, roundTo = 1): number {
  const multiplier = 1.0 + Math.max(0, district) * 0.4;
  const raw = baseValue * multiplier;
  if (roundTo > 1) {
    return Math.max(roundTo, Math.round(raw / roundTo) * roundTo);
  }
  return Math.max(1, Math.round(raw));
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  // --- FLASH POOL (Fast 4h challenges) ---
  {
    templateId: 'tmpl_f_rolls',
    cadence: 'flash',
    title: 'Speed Roller',
    icon: '🎲',
    actionType: 'roll',
    baseGoal: 10,
    baseReward: { coins: 8000, materials: 2, energy: 5 },
    desc: g => `Roll the dice ${g} times.`
  },
  {
    templateId: 'tmpl_f_doubles',
    cadence: 'flash',
    title: 'Twin Sparks',
    icon: '⚡',
    actionType: 'doubles',
    baseGoal: 2,
    baseReward: { coins: 10000, materials: 3, energy: 5 },
    desc: g => `Roll doubles ${g} times.`
  },
  {
    templateId: 'tmpl_f_coins',
    cadence: 'flash',
    title: 'Pocket Rush',
    icon: '🪙',
    actionType: 'earn_coins',
    baseGoal: 15000,
    baseReward: { coins: 12000, materials: 2, energy: 0 },
    desc: g => `Collect ${g.toLocaleString()} coins from board tiles.`
  },
  {
    templateId: 'tmpl_f_pass_go',
    cadence: 'flash',
    title: 'Lap Sprinter',
    icon: '🚩',
    actionType: 'pass_go',
    baseGoal: 2,
    baseReward: { coins: 9000, materials: 2, energy: 5 },
    desc: g => `Pass the GO tile ${g} times.`
  },

  // --- DAILY POOL (24h challenges) ---
  {
    templateId: 'tmpl_d_upgrade',
    cadence: 'daily',
    title: 'Urban Development',
    icon: '🔨',
    actionType: 'upgrade',
    baseGoal: 3,
    baseReward: { coins: 25000, materials: 8, energy: 0 },
    desc: g => `Upgrade buildings ${g} times.`
  },
  {
    templateId: 'tmpl_d_repair',
    cadence: 'daily',
    title: 'Restoration Crew',
    icon: '🩹',
    actionType: 'repair',
    baseGoal: 1,
    baseReward: { coins: 15000, materials: 4, energy: 5 },
    desc: g => `Repair a damaged building ${g} time.`
  },
  {
    templateId: 'tmpl_d_raid',
    cadence: 'daily',
    title: 'Town Striker',
    icon: '⚔️',
    actionType: 'raid',
    baseGoal: 2,
    baseReward: { coins: 30000, materials: 6, energy: 5 },
    desc: g => `Complete ${g} town raids.`
  },
  {
    templateId: 'tmpl_d_heist',
    cadence: 'daily',
    title: 'Safe Cracker',
    icon: '💎',
    actionType: 'heist',
    baseGoal: 2,
    baseReward: { coins: 35000, materials: 6, energy: 5 },
    desc: g => `Crack ${g} vault heists.`
  },
  {
    templateId: 'tmpl_d_jackpot',
    cadence: 'daily',
    title: 'Golden Strike',
    icon: '✨',
    actionType: 'jackpot',
    baseGoal: 1,
    baseReward: { coins: 40000, materials: 5, energy: 10 },
    desc: g => `Land on the Jackpot space ${g} time.`
  },
  {
    templateId: 'tmpl_d_marathon_rolls',
    cadence: 'daily',
    title: 'Daylong Roller',
    icon: '🎲',
    actionType: 'roll',
    baseGoal: 35,
    baseReward: { coins: 30000, materials: 5, energy: 10 },
    desc: g => `Roll the dice ${g} times.`
  },

  // --- WEEKLY POOL (7d Milestone challenges) ---
  {
    templateId: 'tmpl_w_master_builder',
    cadence: 'weekly',
    title: 'Master Architect',
    icon: '🏛️',
    actionType: 'upgrade',
    baseGoal: 10,
    baseReward: { coins: 120000, materials: 30, energy: 20 },
    desc: g => `Upgrade ${g} building tiers across any district.`
  },
  {
    templateId: 'tmpl_w_board_conqueror',
    cadence: 'weekly',
    title: 'District Champion',
    icon: '👑',
    actionType: 'pass_go',
    baseGoal: 15,
    baseReward: { coins: 100000, materials: 25, energy: 25 },
    desc: g => `Complete ${g} full board laps around the district.`
  },
  {
    templateId: 'tmpl_w_fortune_seeker',
    cadence: 'weekly',
    title: 'Fortune Seeker',
    icon: '💰',
    actionType: 'earn_coins',
    baseGoal: 150000,
    baseReward: { coins: 150000, materials: 35, energy: 15 },
    desc: g => `Earn ${g.toLocaleString()} coins across all gameplay.`
  }
];

export const CADENCE_SLOT_COUNTS: Record<WindowCadence, number> = {
  flash: 2,
  daily: 3,
  weekly: 1
};

export function generateQuestsForWindow(
  cadence: WindowCadence,
  windowId: number,
  district: number
): ActiveQuest[] {
  const pool = QUEST_TEMPLATES.filter(t => t.cadence === cadence);
  const needed = Math.min(pool.length, CADENCE_SLOT_COUNTS[cadence]);
  const selected: QuestTemplate[] = [];

  for (let slot = 0; slot < needed; slot++) {
    // Determine template index using seeded hash
    const seed = hashString(`${cadence}_win${windowId}_slot${slot}`);
    let candidateIdx = seed % pool.length;

    // Resolve collision to guarantee distinct templates per window
    while (selected.some(s => s.templateId === pool[candidateIdx].templateId)) {
      candidateIdx = (candidateIdx + 1) % pool.length;
    }
    selected.push(pool[candidateIdx]);
  }

  return selected.map((tmpl, slot) => {
    const isCurrencyGoal = tmpl.actionType === 'earn_coins';
    const goal = scalePacingByDistrict(
      tmpl.baseGoal,
      district,
      isCurrencyGoal ? 5000 : 1
    );

    const coinsReward = scalePacingByDistrict(
      tmpl.baseReward.coins,
      district,
      1000
    );
    const matsReward = scalePacingByDistrict(
      tmpl.baseReward.materials,
      district,
      1
    );

    return {
      id: `q_${cadence}_${windowId}_${slot}_${tmpl.templateId}`,
      templateId: tmpl.templateId,
      cadence,
      windowId,
      title: tmpl.title,
      icon: tmpl.icon,
      desc: tmpl.desc(goal),
      actionType: tmpl.actionType,
      current: 0,
      goal,
      claimed: false,
      reward: {
        coins: coinsReward,
        materials: matsReward,
        energy: tmpl.baseReward.energy // energy kept stable to preserve pacing
      }
    };
  });
}
