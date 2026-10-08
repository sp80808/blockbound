import { create } from 'zustand';
import {
  loadFromStorage, refillEnergy, refreshStreak, saveToStorage,
  type ProgressSnapshot
} from '../game/gameSave';
import {
  affordableAutoMultiplier,
  boardPath,
  nextMultiplier,
  rollPair,
  tileReward,
  type EncounterKind
} from '../game/rollRules';

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
  options: { label: string; coins: number }[];
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
  activeModal: 'upgrade' | 'streak' | 'encounter' | 'reward' | null;
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
  resolveEncounter: (choiceIndex: number) => void;
  upgradeBuilding: (plotIdx: number) => void;
  repairBuilding: (plotIdx: number) => void;
  openModal: (modal: 'upgrade' | 'streak') => void;
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
    totalRolls: s.totalRolls, momentum: s.momentum, lastRoll: s.lastRoll,
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
  }
];

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
    set({
      ...restored, districts, visualTile: restored.currentTile,
      isRolling: false, isDiceAnimating: false, cameraMode: 'OVERVIEW', dicePopup: null,
      autoRolling: false, autoRollsRemaining: 0, autoEnergyBudget: 0, autoEnergySpent: 0,
      activeModal: restored.pendingEncounter ? 'encounter' : restored.pendingReward ? 'reward' : null,
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
    const milestone = id % 5 === 0;
    const materialGain = landing.materials + (milestone ? 3 : 0);
    const newEnergy = Math.min(s.maxEnergy, s.energy - cost + landing.energy + (doubles ? 10 : 0));

    let encounter: Encounter | null = null;
    if (landing.encounter) {
      const base = landing.encounter === 'raid' ? [6000, 9000, 12000] : [4000, 15000, 7500];
      const labels = landing.encounter === 'raid'
        ? ['Workshop', 'Market', 'Tower']
        : ['Copper Vault', 'Golden Vault', 'Crystal Vault'];
      encounter = {
        id, kind: landing.encounter, multiplier: cost,
        options: labels.map((label, i) => ({ label, coins: base[i] * cost }))
      };
    }

    const message = landing.label + (
      landing.coins ? ' +' + landing.coins.toLocaleString() + ' 🪙' :
      materialGain ? ' +' + materialGain + ' 🧱' :
      landing.energy ? ' +' + landing.energy + ' ⚡' :
      landing.shields ? ' +1 🛡️' : ''
    ) + (milestone ? ' · Build momentum +3 🧱!' : '');
    const notice = !encounter && !s.autoOkay ? { title: landing.label, detail: message } : null;
    const remaining = fromAuto ? s.autoRollsRemaining - 1 : 0;
    const resumeAuto = fromAuto && remaining > 0 && !encounter;
    const now = Date.now();
    const anchor = s.energy === s.maxEnergy ? now : s.energyUpdatedAt;

    set({
      isRolling: true, isDiceAnimating: true, lastRoll: roll,
      cameraMode: 'DICE_FOCUS', dicePopup: null, toast: null,
      currentTile: destination, visualTile: s.currentTile,
      coins: s.coins + landing.coins,
      materials: s.materials + materialGain,
      energy: newEnergy,
      energyUpdatedAt: newEnergy === s.maxEnergy ? now : anchor,
      shields: Math.min(s.maxShields, s.shields + landing.shields),
      totalRolls: id, momentum: id % 5,
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
          activeModal: latest.pendingEncounter ? 'encounter' :
            latest.pendingReward ? 'reward' : null
        });
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

  resolveEncounter: choiceIndex => {
    const current = get();
    const event = current.pendingEncounter;
    const option = event?.options[choiceIndex];
    if (!event || !option || current.isRolling) return;
    set({
      pendingEncounter: null,
      activeModal: null,
      coins: current.coins + option.coins,
      toast: null
    });
    get().showToast((event.kind === 'raid' ? '⚔️ Raid success' : '🗝️ Vault opened') +
      ' · +' + option.coins.toLocaleString() + ' 🪙');
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
      set({
        coins: coins - cost,
        materials: materials - mats,
        districts: nextDistricts,
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
    set({
      coins: coins - 2500,
      districts: nextDistricts,
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
