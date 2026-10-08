import { create } from 'zustand';
import {
  affordableAutoMultiplier,
  boardPath,
  nextMultiplier,
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
  multiplier: number;
  isRolling: boolean;
  isTurbo: boolean;
  currentDistrict: number;
  districts: District[];
  toast: string | null;
  activeModal: 'upgrade' | 'encounter' | 'reward' | null;
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

  rollDice: (fromAuto?: boolean) => void;
  cycleMultiplier: () => void;
  toggleTurbo: () => void;
  startAutoRoll: () => void;
  stopAutoRoll: () => void;
  cycleAutoBatch: () => void;
  toggleAutoOkay: () => void;
  toggleAutoAdjust: () => void;
  acknowledgeReward: () => void;
  resolveEncounter: (choiceIndex: number) => void;
  upgradeBuilding: (plotIdx: number) => void;
  repairBuilding: (plotIdx: number) => void;
  openModal: (modal: 'upgrade') => void;
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
  multiplier: 1,
  isRolling: false,
  isTurbo: false,
  currentDistrict: 0,
  districts: initialDistricts,
  toast: null,
  activeModal: null,
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
  toggleAutoOkay: () => set(state => ({ autoOkay: !state.autoOkay })),
  toggleAutoAdjust: () => {
    if (get().autoRolling) return;
    set(state => ({ autoAdjustMultiplier: !state.autoAdjustMultiplier }));
  },

  startAutoRoll: () => {
    const state = get();
    if (state.isRolling || state.autoRolling || state.activeModal || state.pendingEncounter || state.pendingReward) return;
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
    const state = get();
    if (state.isRolling || state.activeModal || state.pendingEncounter || state.pendingReward) return;
    if (fromAuto && (!state.autoRolling || state.autoRollsRemaining <= 0)) return;
    if (!fromAuto && state.autoRolling) return;

    const cost = fromAuto
      ? affordableAutoMultiplier(state.multiplier, state.energy, state.autoAdjustMultiplier)
      : (state.energy >= state.multiplier ? state.multiplier : null);
    if (cost === null || (fromAuto && state.autoEnergySpent + cost > state.autoEnergyBudget)) {
      if (fromAuto) get().stopAutoRoll();
      else get().showToast('⚡ Choose a smaller dice multiplier');
      return;
    }

    // Commit dice result and energy cost exactly once, before visual presentation.
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const roll: RollResult = {
      id: state.totalRolls + 1,
      die1, die2,
      total: die1 + die2,
      multiplier: cost,
      doubles: die1 === die2
    };
    const path = boardPath(state.currentTile, roll.total);
    set({
      isRolling: true,
      energy: state.energy - cost,
      lastRoll: roll,
      toast: null,
      ...(fromAuto ? {
        autoRollsRemaining: state.autoRollsRemaining - 1,
        autoEnergySpent: state.autoEnergySpent + cost,
        multiplier: cost
      } : {})
    });

    const motionDelay = state.isTurbo ? 300 : 650;
    const stepDelay = state.isTurbo ? 55 : 115;

    // Move visually one board tile per step, then resolve the landing once.
    setTimeout(() => {
      function animateStep(stepIndex: number): void {
        if (stepIndex < path.length) {
          set({ currentTile: path[stepIndex] });
          setTimeout(() => animateStep(stepIndex + 1), stepDelay);
          return;
        }

        const latest = get();
        const landing = tileReward(path[path.length - 1], roll.multiplier, die1, die2);
        const newTotal = latest.totalRolls + 1;
        const milestone = newTotal % 5 === 0;
        const materialsGain = landing.materials + (milestone ? 3 : 0);
        const bonusEnergy = roll.doubles ? 10 : 0;
        const newCoins = latest.coins + landing.coins;
        const message = landing.label + (
          landing.coins ? ' +' + landing.coins.toLocaleString() + ' 🪙' :
          materialsGain ? ' +' + materialsGain + ' 🧱' :
          landing.energy ? ' +' + landing.energy + ' ⚡' :
          landing.shields ? ' +1 🛡️' : ''
        ) + (milestone ? ' · Build momentum +3 🧱!' : '');

        let encounter: Encounter | null = null;
        if (landing.encounter) {
          const base = landing.encounter === 'raid' ? [6000, 9000, 12000] : [4000, 15000, 7500];
          const labels = landing.encounter === 'raid'
            ? ['Workshop', 'Market', 'Tower']
            : ['Copper Vault', 'Golden Vault', 'Crystal Vault'];
          encounter = {
            id: roll.id,
            kind: landing.encounter,
            multiplier: roll.multiplier,
            options: labels.map((label, i) => ({ label, coins: base[i] * roll.multiplier }))
          };
        }

        // A new event pauses auto-roll for a genuine player choice, even with Auto-OK enabled.
        const rewardNotice = !landing.encounter && !latest.autoOkay
          ? { title: landing.label, detail: message }
          : null;
        const remaining = latest.autoRollsRemaining;
        const autoContinues = latest.autoRolling && remaining > 0 && !encounter && !rewardNotice;
        set({
          isRolling: false,
          coins: newCoins,
          materials: latest.materials + materialsGain,
          energy: Math.min(latest.maxEnergy, latest.energy + landing.energy + bonusEnergy),
          shields: Math.min(latest.maxShields, latest.shields + landing.shields),
          totalRolls: newTotal,
          momentum: newTotal % 5,
          toast: message,
          pendingEncounter: encounter,
          pendingReward: rewardNotice,
          activeModal: encounter ? 'encounter' : rewardNotice ? 'reward' : null,
          autoRolling: autoContinues,
          ...(autoContinues ? {} : { autoRollsRemaining: 0 })
        });
        if (autoContinues) queueAutoRoll(get, latest.isTurbo ? 230 : 600);
      }
      animateStep(0);
    }, motionDelay);
  },

  acknowledgeReward: () => {
    if (!get().pendingReward) return;
    set({ pendingReward: null, activeModal: null });
    // Auto-OK is off: the player opted to acknowledge each step.
    // The next auto batch is intentionally not resumed without a fresh tap.
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
      toast: (event.kind === 'raid' ? '⚔️ Raid success' : '🗝️ Vault opened') +
        ' · +' + option.coins.toLocaleString() + ' 🪙'
    });
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
