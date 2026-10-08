import { create } from 'zustand';
import {
  loadFromStorage, refillEnergy, refreshStreak, saveToStorage,
  type ProgressSnapshot
} from '../game/gameSave';
import {
  affordableAutoMultiplier,
  boardPath,
  doublesBonus,
  encounterOptions,
  nextMultiplier,
  passGoCount,
  passGoReward,
  rollPair,
  tileReward,
  type EncounterKind
} from '../game/rollRules';
import { validateClaim, type LifetimeCounters } from '../game/quests';
import {
  buzz,
  playBuild,
  playClick,
  playCoins,
  playDiceLand,
  playFanfare,
  playRoll,
  playShield,
  setSoundEnabled
} from '../services/audio/sfx';

export interface Building {
  id: string;
  name: string;
  icon: string;
  tier: number;
  baseCost: number;
  baseMats: number;
  damaged: boolean;
}

export interface District {
  id: number;
  name: string;
  subtitle: string;
  buildings: Building[];
}

/** Preserved from newer main: daily rewards available once per day. */
export interface StreakReward {
  day: number;
  label: string;
  icon: string;
  desc: string;
  coins: number;
  energy: number;
  mats: number;
  shield?: number;
}

export const STREAK_REWARDS: StreakReward[] = [
  { day: 1, label: 'Day 1', icon: '🪙', desc: '+10k Coins & +10⚡', coins: 10000, energy: 10, mats: 0 },
  { day: 2, label: 'Day 2', icon: '⚡', desc: '+20k Coins & +15⚡', coins: 20000, energy: 15, mats: 0 },
  { day: 3, label: 'Day 3', icon: '⭐', desc: '+35k Coins & 1.5X Bet', coins: 35000, energy: 20, mats: 4 },
  { day: 4, label: 'Day 4', icon: '🧱', desc: '+50k Coins & +10 Bricks', coins: 50000, energy: 20, mats: 10 },
  { day: 5, label: 'Day 5', icon: '🛡️', desc: '+75k Coins & +1 Shield', coins: 75000, energy: 25, mats: 5, shield: 1 },
  { day: 6, label: 'Day 6', icon: '💎', desc: '+100k Coins & +30⚡', coins: 100000, energy: 30, mats: 12 },
  { day: 7, label: 'Day 7', icon: '👑', desc: 'EPIC CHEST! +250k Coins!', coins: 250000, energy: 50, mats: 25, shield: 1 }
];

export interface RollResult {
  id: number;
  die1: number;
  die2: number;
  total: number;
  multiplier: number;
  doubles: boolean;
}

export interface Encounter {
  id: number;
  kind: EncounterKind;
  multiplier: number;
  options: {
    label: string; coins: number; materials: number; energy: number;
    variant?: 'brass' | 'steel' | 'crystal'; shielded?: boolean;
  }[];
}

export interface RewardNotice {
  title: string;
  detail: string;
}

export interface GameState {
  coins: number;
  materials: number;
  energy: number;
  maxEnergy: number;
  shields: number;
  maxShields: number;
  currentTile: number;
  visualTile: number;
  multiplier: number;
  isRolling: boolean;
  isDiceAnimating: boolean;
  isTurbo: boolean;
  currentDistrict: number;
  districts: District[];
  toast: string | null;
  activeModal: 'upgrade' | 'streak' | 'encounter' | 'reward' | 'quests' | null;
  dailyStreak: number;
  lastLoginDate: string;
  streakClaimedToday: boolean;
  cameraMode: 'OVERVIEW' | 'DICE_FOCUS' | 'TOKEN_FOLLOW';
  dicePopup: { d1: number; d2: number; total: number; isDoubles: boolean } | null;
  pendingEncounter: Encounter | null;
  pendingReward: RewardNotice | null;
  lastRoll: RollResult | null;
  totalRolls: number;
  momentum: number;
  doublesStreak: number;
  /** Lifetime counters feed quests; monotonic, never decremented. */
  doublesTotal: number;
  upgradesBuilt: number;
  raidsCompleted: number;
  heistsCompleted: number;
  jackpotsHit: number;
  claimedQuests: string[];
  unlockedDistricts: number[];
  soundEnabled: boolean;
  /** Transient celebration + VFX pulses. Never persisted, never affect economy. */
  celebration: { kind: 'jackpot' | 'doubles3' | 'milestone'; key: number } | null;
  buildPulse: { plot: number; tier: number; key: number } | null;
  landingPulse: { tile: number; key: number } | null;
  autoRolling: boolean;
  autoOkay: boolean;
  autoAdjustMultiplier: boolean;
  autoBatchSize: 5 | 10 | 25;
  autoRollsRemaining: number;
  autoEnergyBudget: number;
  autoEnergySpent: number;
  energyUpdatedAt: number;
  hydrated: boolean;
  saveError: boolean;
  hydrateGame: () => void;
  tickRecovery: (now?: number) => void;

  rollDice: (fromAuto?: boolean) => void;
  cycleMultiplier: () => void;
  toggleTurbo: () => void;
  startAutoRoll: () => void;
  stopAutoRoll: () => void;
  cycleAutoBatch: () => void;
  setAutoBatchSize: (count: 5 | 10 | 25) => void;
  toggleAutoOkay: () => void;
  toggleAutoAdjust: () => void;
  acknowledgeReward: () => void;
  dismissCelebration: () => void;
  toggleSound: () => void;
  claimQuest: (questId: string) => void;
  unlockDistrict: () => void;
  setDistrict: (districtId: number) => void;
  resolveEncounter: (choiceIndex: number) => void;
  resolveEncounterPicks: (choiceIndices: number[]) => void;
  upgradeBuilding: (plotIdx: number) => void;
  repairBuilding: (plotIdx: number) => void;
  openModal: (modal: 'upgrade' | 'streak' | 'quests') => void;
  claimStreakReward: () => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
}

let autoTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

// Auto-roll deliberately uses bounded batches rather than unattended infinite spending.
// The next roll is only queued after the previous action has resolved.
function queueAutoRoll(get: () => GameState, delayMs = 650): void {
  if (autoTimer !== undefined) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    autoTimer = undefined;
    const state = get();
    if (state.autoRolling && state.autoRollsRemaining > 0 &&
        !state.isRolling && !state.pendingEncounter && !state.pendingReward &&
        !state.activeModal) {
      state.rollDice(true);
    }
  }, delayMs);
}

function endAutoRoll(get: () => GameState, set: (data: Partial<GameState>) => void): void {
  if (autoTimer !== undefined) clearTimeout(autoTimer);
  autoTimer = undefined;
  if (get().autoRolling || get().autoRollsRemaining !== 0) {
    set({ autoRolling: false, autoRollsRemaining: 0 });
  }
}

function progressOf(s: GameState): ProgressSnapshot {
  return {
    coins: s.coins, materials: s.materials, energy: s.energy, maxEnergy: s.maxEnergy,
    shields: s.shields, maxShields: s.maxShields,
    currentTile: s.currentTile, multiplier: s.multiplier, currentDistrict: s.currentDistrict,
    districts: s.districts.map(d => ({
      id: d.id, buildings: d.buildings.map(b => ({ id: b.id, tier: b.tier, damaged: b.damaged }))
    })),
    dailyStreak: s.dailyStreak, lastLoginDate: s.lastLoginDate,
    streakClaimedToday: s.streakClaimedToday,
    totalRolls: s.totalRolls, momentum: s.momentum, doublesStreak: s.doublesStreak,
    doublesTotal: s.doublesTotal, upgradesBuilt: s.upgradesBuilt,
    raidsCompleted: s.raidsCompleted, heistsCompleted: s.heistsCompleted,
    jackpotsHit: s.jackpotsHit, claimedQuests: s.claimedQuests,
    unlockedDistricts: s.unlockedDistricts, soundEnabled: s.soundEnabled,
    lastRoll: s.lastRoll,
    pendingEncounter: s.pendingEncounter, pendingReward: s.pendingReward,
    autoOkay: s.autoOkay, autoAdjustMultiplier: s.autoAdjustMultiplier,
    autoBatchSize: s.autoBatchSize, isTurbo: s.isTurbo, energyUpdatedAt: s.energyUpdatedAt
  };
}

const initialDistricts: District[] = [
  {
    id: 0,
    name: 'Sunny Suburb',
    subtitle: 'Charming countryside village with winding paths',
    buildings: [
      { id: 'b_townhall', name: 'Town Hall', icon: '🏛️', tier: 1, baseCost: 10000, baseMats: 4, damaged: false },
      { id: 'b_bakery', name: 'Artisan Bakery', icon: '🥖', tier: 1, baseCost: 6000, baseMats: 2, damaged: false },
      { id: 'b_cottage', name: 'Oak Cottage', icon: '🏡', tier: 1, baseCost: 4500, baseMats: 2, damaged: false },
      { id: 'b_windmill', name: 'Windmill', icon: '🌾', tier: 0, baseCost: 8000, baseMats: 3, damaged: false },
      { id: 'b_park', name: 'Central Park', icon: '⛲', tier: 0, baseCost: 9000, baseMats: 3, damaged: false }
    ]
  },
  {
    id: 1,
    name: 'Candy Harbour',
    subtitle: 'Pastel piers and confectionery streets',
    buildings: [
      { id: 'c_keep', name: 'Candy Keep', icon: '🍬', tier: 0, baseCost: 20000, baseMats: 6, damaged: false },
      { id: 'c_fudge', name: 'Fudge Bakery', icon: '🍩', tier: 0, baseCost: 14000, baseMats: 4, damaged: false },
      { id: 'c_lolly', name: 'Lollipop Lodge', icon: '🍭', tier: 0, baseCost: 11000, baseMats: 4, damaged: false },
      { id: 'c_sugar', name: 'Sugar Windmill', icon: '🍥', tier: 0, baseCost: 18000, baseMats: 5, damaged: false },
      { id: 'c_gumdrop', name: 'Gumdrop Gardens', icon: '🌷', tier: 0, baseCost: 22000, baseMats: 6, damaged: false }
    ]
  }
];

/** Sunny Suburb fully maxed unlocks the harbour. Pure for tests/UI. */
export function districtComplete(district: District): boolean {
  return district.buildings.length > 0 && district.buildings.every(b => b.tier >= 4);
}

export function lifetimeOf(s: GameState): LifetimeCounters {
  return {
    totalRolls: s.totalRolls, doublesTotal: s.doublesTotal,
    upgradesBuilt: s.upgradesBuilt, raidsCompleted: s.raidsCompleted,
    heistsCompleted: s.heistsCompleted, jackpotsHit: s.jackpotsHit
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  coins: 35000,
  materials: 16,
  energy: 35,
  maxEnergy: 50,
  shields: 2,
  maxShields: 3,
  currentTile: 0,
  visualTile: 0,
  multiplier: 1,
  isRolling: false,
  isDiceAnimating: false,
  isTurbo: false,
  currentDistrict: 0,
  districts: initialDistricts,
  toast: null,
  activeModal: null,
  dailyStreak: 1,
  lastLoginDate: new Date().toISOString().slice(0, 10),
  streakClaimedToday: false,
  cameraMode: 'OVERVIEW',
  dicePopup: null,
  pendingEncounter: null,
  pendingReward: null,
  lastRoll: null,
  totalRolls: 0,
  momentum: 0,
  doublesStreak: 0,
  doublesTotal: 0,
  upgradesBuilt: 0,
  raidsCompleted: 0,
  heistsCompleted: 0,
  jackpotsHit: 0,
  claimedQuests: [],
  unlockedDistricts: [0],
  soundEnabled: true,
  celebration: null,
  buildPulse: null,
  landingPulse: null,
  autoRolling: false,
  autoOkay: true,
  autoAdjustMultiplier: true,
  autoBatchSize: 5,
  autoRollsRemaining: 0,
  autoEnergyBudget: 0,
  autoEnergySpent: 0,
  energyUpdatedAt: Date.now(),
  hydrated: false,
  saveError: false,

  hydrateGame: () => {
    if (get().hydrated) return;
    const restored = loadFromStorage(progressOf(get()));
    if (!restored) {
      set({ hydrated: true });
      return;
    }
    // Preserve the curated building names, prices and display properties in source.
    const districts = initialDistricts.map(d => ({
      ...d,
      buildings: d.buildings.map(b => {
        const saved = restored.districts.find(s => s.id === d.id)?.buildings.find(s => s.id === b.id);
        return saved ? { ...b, tier: saved.tier, damaged: saved.damaged } : b;
      })
    }));
    // Older saves store only { label, coins } seats. Enrich with the newer
    // optional fields so restored encounters resolve through the same path.
    const pendingEncounter = restored.pendingEncounter
      ? {
          ...restored.pendingEncounter,
          options: restored.pendingEncounter.options.map(o => ({ ...o, materials: 0, energy: 0 }))
        }
      : null;
    // New districts ship locked at tier 0; only known ids survive a restore.
    const unlockedDistricts = restored.unlockedDistricts.filter(id =>
      initialDistricts.some(d => d.id === id));
    if (!unlockedDistricts.includes(0)) unlockedDistricts.unshift(0);
    const currentDistrict = initialDistricts.some(d => d.id === restored.currentDistrict)
      ? restored.currentDistrict : 0;
    setSoundEnabled(restored.soundEnabled);
    set({
      ...restored, districts, visualTile: restored.currentTile,
      currentDistrict: unlockedDistricts.includes(currentDistrict) ? currentDistrict : 0,
      unlockedDistricts,
      pendingEncounter,
      isRolling: false, isDiceAnimating: false, cameraMode: 'OVERVIEW', dicePopup: null,
      autoRolling: false, autoRollsRemaining: 0, autoEnergyBudget: 0, autoEnergySpent: 0,
      activeModal: restored.pendingEncounter ? 'encounter' : restored.pendingReward ? 'reward' : null,
      celebration: null, buildPulse: null, landingPulse: null,
      toast: null, hydrated: true
    });
  },

  tickRecovery: (now = Date.now()) => {
    const s = get();
    if (!s.hydrated) return;
    const filled = refillEnergy(s.energy, s.maxEnergy, s.energyUpdatedAt, now);
    const day = refreshStreak(progressOf(s), now);
    const energyChange = filled.energy !== s.energy;
    const dayChange = day.lastLoginDate !== s.lastLoginDate;
    if (energyChange || dayChange) {
      set({
        energy: filled.energy,
        energyUpdatedAt: filled.energyUpdatedAt,
        dailyStreak: day.dailyStreak,
        lastLoginDate: day.lastLoginDate,
        streakClaimedToday: day.streakClaimedToday
      });
    }
  },

  cycleMultiplier: () => {
    const { multiplier, energy, autoRolling } = get();
    if (autoRolling) return; // Hold the player's chosen max exposure during a batch.
    playClick();
    set({ multiplier: nextMultiplier(multiplier, energy) });
  },

  toggleTurbo: () => set(state => ({ isTurbo: !state.isTurbo })),
  cycleAutoBatch: () => {
    if (get().autoRolling) return;
    set(state => ({ autoBatchSize: state.autoBatchSize === 5 ? 10 : state.autoBatchSize === 10 ? 25 : 5 }));
  },
  setAutoBatchSize: count => {
    if (get().autoRolling || get().isRolling) return;
    set({ autoBatchSize: count });
  },
  toggleAutoOkay: () => set(state => ({ autoOkay: !state.autoOkay })),
  toggleAutoAdjust: () => {
    if (get().autoRolling) return;
    set(state => ({ autoAdjustMultiplier: !state.autoAdjustMultiplier }));
  },

  startAutoRoll: () => {
    const state = get();
    if (!state.hydrated || state.isRolling || state.autoRolling || state.activeModal || state.pendingEncounter || state.pendingReward) return;
    const cost = affordableAutoMultiplier(state.multiplier, state.energy, state.autoAdjustMultiplier);
    if (cost === null) {
      get().showToast('⚡ Not enough dice energy to start Auto Roll');
      return;
    }
    set({
      autoRolling: true,
      autoRollsRemaining: state.autoBatchSize,
      // Never spend more than the explicitly displayed batch maximum.
      autoEnergyBudget: Math.min(state.energy, state.autoBatchSize * state.multiplier),
      autoEnergySpent: 0
    });
    queueAutoRoll(get, 250);
  },

  stopAutoRoll: () => endAutoRoll(get, set),

  claimStreakReward: () => {
    get().tickRecovery();
    const s = get();
    if (s.streakClaimedToday || s.isRolling || s.autoRolling) return;
    const reward = STREAK_REWARDS[s.dailyStreak - 1];
    if (!reward) return;
    playCoins();
    set({
      coins: s.coins + reward.coins,
      materials: s.materials + reward.mats,
      energy: Math.min(s.maxEnergy, s.energy + reward.energy),
      shields: Math.min(s.maxShields, s.shields + (reward.shield ?? 0)),
      streakClaimedToday: true,
      energyUpdatedAt: s.energy + reward.energy >= s.maxEnergy ? Date.now() : s.energyUpdatedAt,
      activeModal: null,
      toast: '🔥 DAY ' + s.dailyStreak + ' CLAIMED! +' + reward.coins.toLocaleString() + ' 🪙'
    });
  },


  openModal: modal => {
    get().stopAutoRoll();
    playClick();
    set({ activeModal: modal });
  },

  closeModal: () => {
    const state = get();
    // An encounter or acknowledgement cannot be dismissed without resolution.
    if (state.activeModal === 'encounter' || state.activeModal === 'reward') return;
    set({ activeModal: null });
  },

  showToast: msg => {
    if (toastTimer !== undefined) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 2800);
  },

  rollDice: (fromAuto = false) => {
    const s = get();
    if (!s.hydrated || s.isRolling || s.activeModal || s.pendingEncounter || s.pendingReward) return;
    if (fromAuto && (!s.autoRolling || s.autoRollsRemaining <= 0)) return;
    if (!fromAuto && s.autoRolling) return;

    const available = fromAuto ? Math.min(s.energy, s.autoEnergyBudget - s.autoEnergySpent) : s.energy;
    const cost = fromAuto
      ? affordableAutoMultiplier(s.multiplier, available, s.autoAdjustMultiplier)
      : (s.energy >= s.multiplier ? s.multiplier : null);
    if (cost === null || (fromAuto && s.autoEnergySpent + cost > s.autoEnergyBudget)) {
      if (fromAuto) get().stopAutoRoll();
      else get().showToast('⚡ Choose a smaller dice multiplier');
      return;
    }

    // Critical invariant: settle authoritative resources, position, rolls and
    // pending encounters in ONE state transition. Animation never pays rewards.
    const { die1, die2, total, doubles } = rollPair(Math.random);
    const id = s.totalRolls + 1;
    const roll: RollResult = { id, die1, die2, total, multiplier: cost, doubles };
    const path = boardPath(s.currentTile, total);
    const destination = path[path.length - 1];
    const landing = tileReward(destination, cost, die1, die2);
    const passes = passGoCount(path);
    const passReward = passGoReward(passes, cost);
    const newStreak = doubles ? s.doublesStreak + 1 : 0;
    const streakBonus = doublesBonus(newStreak, cost);
    const milestone = id % 5 === 0;
    const grandMilestone = id % 10 === 0;
    const milestoneShield = grandMilestone ? 1 : 0;
    const milestoneEnergy = grandMilestone ? 8 : 0;
    const materialGain = landing.materials + (milestone ? 3 : 0);
    const coinGain = landing.coins + passReward.coins + streakBonus.coins;
    const newEnergy = Math.min(
      s.maxEnergy,
      s.energy - cost + landing.energy + passReward.energy + streakBonus.energy + milestoneEnergy
    );

    let encounter: Encounter | null = null;
    if (landing.encounter) {
      encounter = {
        id, kind: landing.encounter, multiplier: cost,
        options: encounterOptions(landing.encounter, cost, id)
      };
    }

    const parts: string[] = [landing.label];
    if (coinGain) parts.push('+' + coinGain.toLocaleString() + ' 🪙');
    if (materialGain) parts.push('+' + materialGain + ' 🧱');
    if (landing.energy + passReward.energy + streakBonus.energy + milestoneEnergy) {
      parts.push('+' + (landing.energy + passReward.energy + streakBonus.energy + milestoneEnergy) + ' ⚡');
    }
    if (landing.shields + streakBonus.shields + milestoneShield) {
      parts.push('+' + (landing.shields + streakBonus.shields + milestoneShield) + ' 🛡️');
    }
    if (passes > 0) parts.push('· Passed GO +' + passReward.coins.toLocaleString() + ' 🪙');
    if (newStreak === 2) parts.push('· Doubles ×2 bonus!');
    if (newStreak >= 3) parts.push('· DOUBLES STREAK ×' + newStreak + '!');
    if (milestone) parts.push('· Build momentum +3 🧱!');
    if (grandMilestone) parts.push('· GRAND milestone +🛡️!');
    const message = parts.join(' ');
    const notice = !encounter && !s.autoOkay ? { title: landing.label, detail: message } : null;
    const celebration = landing.kind === 'jackpot'
      ? { kind: 'jackpot' as const, key: id }
      : newStreak >= 3
        ? { kind: 'doubles3' as const, key: id }
        : grandMilestone
          ? { kind: 'milestone' as const, key: id }
          : null;
    const remaining = fromAuto ? s.autoRollsRemaining - 1 : 0;
    const resumeAuto = fromAuto && remaining > 0 && !encounter;
    const now = Date.now();
    const anchor = s.energy === s.maxEnergy ? now : s.energyUpdatedAt;

    playRoll();
    set({
      isRolling: true, isDiceAnimating: true, lastRoll: roll,
      cameraMode: 'DICE_FOCUS', dicePopup: null, toast: null,
      celebration, landingPulse: null, buildPulse: null,
      currentTile: destination, visualTile: s.currentTile,
      coins: s.coins + coinGain,
      materials: s.materials + materialGain,
      energy: newEnergy,
      energyUpdatedAt: newEnergy === s.maxEnergy ? now : anchor,
      shields: Math.min(s.maxShields, s.shields + landing.shields + streakBonus.shields + milestoneShield),
      totalRolls: id, momentum: id % 5, doublesStreak: newStreak,
      doublesTotal: s.doublesTotal + (doubles ? 1 : 0),
      jackpotsHit: s.jackpotsHit + (landing.kind === 'jackpot' ? 1 : 0),
      pendingEncounter: encounter, pendingReward: notice, activeModal: null,
      autoRolling: resumeAuto, autoRollsRemaining: resumeAuto ? remaining : 0,
      autoEnergySpent: fromAuto ? s.autoEnergySpent + cost : s.autoEnergySpent,
      // Record the actual automatic stake only if adaptive mode changed it.
      multiplier: fromAuto ? cost : s.multiplier
    });

    const motionDelay = s.isTurbo ? 300 : 650;
    const stepDelay = s.isTurbo ? 55 : 115;

    setTimeout(() => {
      if (get().lastRoll?.id !== id) return;
      set({ isDiceAnimating: false, cameraMode: 'TOKEN_FOLLOW',
        dicePopup: { d1: die1, d2: die2, total, isDoubles: doubles } });

      function animateStep(index: number): void {
        if (get().lastRoll?.id !== id) return;
        if (index < path.length) {
          set({ visualTile: path[index] });
          setTimeout(() => animateStep(index + 1), stepDelay);
          return;
        }
        // Rewards were committed and saved before the very first animation frame.
        // Closing the tab while animating restores a finished roll, never a half-roll.
        const latest = get();
        set({
          isRolling: false, isDiceAnimating: false, visualTile: destination,
          cameraMode: 'OVERVIEW', dicePopup: null,
          landingPulse: { tile: destination, key: id },
          activeModal: latest.pendingEncounter ? 'encounter' :
            latest.pendingReward ? 'reward' : null
        });
        playDiceLand();
        if (coinGain > 0) playCoins();
        if (latest.shields > s.shields) playShield();
        if (celebration) playFanfare();
        else if (newStreak >= 2) buzz(20);
        get().showToast(message);
        const completed = get();
        if (completed.autoRolling && completed.autoRollsRemaining > 0 &&
            !completed.pendingEncounter && !completed.pendingReward) {
          queueAutoRoll(get, completed.isTurbo ? 230 : 600);
        }
      }
      animateStep(0);
    }, motionDelay);
  },

  acknowledgeReward: () => {
    if (!get().pendingReward) return;
    set({ pendingReward: null, activeModal: null });
    // Auto-OK is off: wait for explicit acknowledgement before each new roll.
    if (get().autoRolling && get().autoRollsRemaining > 0) queueAutoRoll(get, 330);
  },

  dismissCelebration: () => set({ celebration: null }),

  toggleSound: () => {
    const next = !get().soundEnabled;
    setSoundEnabled(next);
    set({ soundEnabled: next });
    if (next) playClick();
  },

  claimQuest: questId => {
    const s = get();
    if (s.isRolling) return;
    const def = validateClaim(questId, lifetimeOf(s), s.claimedQuests);
    if (!def) return;
    playCoins();
    set({
      coins: s.coins + def.reward.coins,
      materials: s.materials + def.reward.materials,
      energy: Math.min(s.maxEnergy, s.energy + def.reward.energy),
      claimedQuests: [...s.claimedQuests, def.id],
      toast: '⭐ QUEST COMPLETE: ' + def.name.toUpperCase() + '!'
    });
  },

  unlockDistrict: () => {
    const s = get();
    if (s.isRolling || s.unlockedDistricts.includes(1)) return;
    const home = s.districts[0];
    if (!home || !districtComplete(home)) {
      get().showToast('🔒 Max every Sunny Suburb building to Tier 4 to unlock the harbour');
      return;
    }
    playFanfare();
    set({
      unlockedDistricts: [...s.unlockedDistricts, 1],
      currentDistrict: 1,
      activeModal: null,
      celebration: { kind: 'milestone', key: Date.now() },
      toast: '🍬 CANDY HARBOUR UNLOCKED! A new district awaits!'
    });
  },

  setDistrict: districtId => {
    const s = get();
    if (s.isRolling || !s.unlockedDistricts.includes(districtId)) return;
    if (districtId === s.currentDistrict) return;
    playClick();
    set({ currentDistrict: districtId, visualTile: s.currentTile });
  },

  resolveEncounter: choiceIndex => {
    get().resolveEncounterPicks([choiceIndex]);
  },

  resolveEncounterPicks: choiceIndices => {
    const current = get();
    const event = current.pendingEncounter;
    if (!event || current.isRolling) return;
    // Exactly one target for raids, exactly three distinct safes for heists.
    // Duplicates, out-of-range seats and double-collects are rejected.
    const want = event.kind === 'raid' ? 1 : 3;
    const unique = [...new Set(choiceIndices)];
    if (unique.length !== want || unique.some(i => !Number.isInteger(i) || i < 0 || i >= event.options.length)) return;
    const picks = unique.map(i => event.options[i]);
    const coins = picks.reduce((sum, p) => sum + p.coins, 0);
    const materials = picks.reduce((sum, p) => sum + (p.materials ?? 0), 0);
    const energy = picks.reduce((sum, p) => sum + (p.energy ?? 0), 0);
    playCoins();
    set({
      pendingEncounter: null,
      activeModal: null,
      coins: current.coins + coins,
      materials: current.materials + materials,
      energy: Math.min(current.maxEnergy, current.energy + energy),
      raidsCompleted: current.raidsCompleted + (event.kind === 'raid' ? 1 : 0),
      heistsCompleted: current.heistsCompleted + (event.kind === 'heist' ? 1 : 0),
      toast: null
    });
    get().showToast((event.kind === 'raid' ? '⚔️ Raid success' : '🗝️ Vault opened') +
      ' · +' + coins.toLocaleString() + ' 🪙' +
      (materials ? ' +' + materials + ' 🧱' : '') +
      (energy ? ' +' + energy + ' ⚡' : ''));
  },

  upgradeBuilding: plotIdx => {
    const { coins, materials, districts, currentDistrict, isRolling } = get();
    const dist = districts[currentDistrict];
    const building = dist?.buildings[plotIdx];
    if (!building || isRolling) return;
    const cost = Math.floor(building.baseCost * (1 + building.tier * 1.5));
    const mats = building.baseMats + building.tier * 2;

    if (coins >= cost && materials >= mats && building.tier < 4 && !building.damaged) {
      const buildings = [...dist.buildings];
      buildings[plotIdx] = { ...building, tier: building.tier + 1 };
      const nextDistricts = [...districts];
      nextDistricts[currentDistrict] = { ...dist, buildings };
      playBuild();
      set({
        coins: coins - cost,
        materials: materials - mats,
        districts: nextDistricts,
        upgradesBuilt: get().upgradesBuilt + 1,
        buildPulse: { plot: plotIdx, tier: building.tier + 1, key: Date.now() },
        toast: '🔨 ' + building.name.toUpperCase() + ' · TIER ' + (building.tier + 1) + '!'
      });
    }
  },

  repairBuilding: plotIdx => {
    const { coins, districts, currentDistrict } = get();
    const dist = districts[currentDistrict];
    const building = dist?.buildings[plotIdx];
    if (!building || coins < 2500 || !building.damaged) return;
    const buildings = [...dist.buildings];
    buildings[plotIdx] = { ...building, damaged: false };
    const nextDistricts = [...districts];
    nextDistricts[currentDistrict] = { ...dist, buildings };
    playBuild();
    set({
      coins: coins - 2500,
      districts: nextDistricts,
      buildPulse: { plot: plotIdx, tier: building.tier, key: Date.now() },
      toast: '✨ REPAIRED ' + building.name.toUpperCase() + '!'
    });
  }
}));


// Installed once per module: only whitelisted gameplay data is serialised, not UI,
// timers or a paused auto batch. Failed browser storage never crashes gameplay.
let lastSave = '';
useGameStore.subscribe(state => {
  if (!state.hydrated) return;
  const progress = progressOf(state);
  const encoded = JSON.stringify(progress);
  if (encoded !== lastSave) {
    if (saveToStorage(progress)) {
      lastSave = encoded;
      if (state.saveError) useGameStore.setState({ saveError: false });
    } else if (!state.saveError) {
      useGameStore.setState({ saveError: true });
    }
  }
});
