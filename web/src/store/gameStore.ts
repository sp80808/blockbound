import { create } from 'zustand';

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
  { day: 1, label: "Day 1", icon: "🪙", desc: "+10k Coins & +10⚡", coins: 10000, energy: 10, mats: 0 },
  { day: 2, label: "Day 2", icon: "⚡", desc: "+20k Coins & +15⚡", coins: 20000, energy: 15, mats: 0 },
  { day: 3, label: "Day 3", icon: "⭐", desc: "+35k Coins & 1.5X Bet", coins: 35000, energy: 20, mats: 4 },
  { day: 4, label: "Day 4", icon: "🧱", desc: "+50k Coins & +10 Bricks", coins: 50000, energy: 20, mats: 10 },
  { day: 5, label: "Day 5", icon: "🛡️", desc: "+75k Coins & +1 Shield", coins: 75000, energy: 25, mats: 5, shield: 1 },
  { day: 6, label: "Day 6", icon: "💎", desc: "+100k Coins & +30⚡", coins: 100000, energy: 30, mats: 12 },
  { day: 7, label: "Day 7", icon: "👑", desc: "EPIC CHEST! +250k Coins!", coins: 250000, energy: 50, mats: 25, shield: 1 }
];

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
  activeModal: string | null;

  // Daily Streak
  dailyStreak: number;
  lastLoginDate: string;
  streakClaimedToday: boolean;

  // Camera & Dice Popup Focus
  cameraMode: 'OVERVIEW' | 'DICE_FOCUS' | 'TOKEN_FOLLOW';
  dicePopup: { d1: number; d2: number; total: number; isDoubles: boolean } | null;

  rollDice: () => void;
  cycleMultiplier: () => void;
  toggleTurbo: () => void;
  upgradeBuilding: (plotIdx: number) => void;
  repairBuilding: (plotIdx: number) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
  claimStreakReward: () => void;
}

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
  toast: null,
  activeModal: null,

  dailyStreak: 1,
  lastLoginDate: new Date().toISOString().slice(0, 10),
  streakClaimedToday: false,

  cameraMode: 'OVERVIEW',
  dicePopup: null,

  districts: [
    {
      id: 0,
      name: "Sunny Suburb",
      subtitle: "Charming countryside village with winding paths",
      buildings: [
        { id: "b_townhall", name: "Town Hall", icon: "🏛️", tier: 1, baseCost: 10000, baseMats: 4, damaged: false },
        { id: "b_bakery", name: "Artisan Bakery", icon: "🥖", tier: 1, baseCost: 6000, baseMats: 2, damaged: false },
        { id: "b_cottage", name: "Oak Cottage", icon: "🏡", tier: 1, baseCost: 4500, baseMats: 2, damaged: false },
        { id: "b_windmill", name: "Windmill", icon: "🌾", tier: 0, baseCost: 8000, baseMats: 3, damaged: false },
        { id: "b_park", name: "Central Park", icon: "⛲", tier: 0, baseCost: 9000, baseMats: 3, damaged: false }
      ]
    }
  ],

  claimStreakReward: () => {
    const { dailyStreak, streakClaimedToday, coins, energy, maxEnergy, materials, shields, maxShields } = get();
    if (streakClaimedToday) return;

    const reward = STREAK_REWARDS[dailyStreak - 1];
    set({
      coins: coins + reward.coins,
      energy: Math.min(maxEnergy, energy + reward.energy),
      materials: materials + reward.mats,
      shields: reward.shield ? Math.min(maxShields, shields + reward.shield) : shields,
      streakClaimedToday: true,
      activeModal: null,
      toast: `🔥 DAY ${dailyStreak} STREAK CLAIMED! +${reward.coins.toLocaleString()} Coins!`
    });
  },

  cycleMultiplier: () => {
    const cur = get().multiplier;
    const next = cur === 1 ? 2 : cur === 2 ? 3 : cur === 3 ? 5 : 1;
    set({ multiplier: next });
  },

  toggleTurbo: () => set(state => ({ isTurbo: !state.isTurbo })),

  openModal: (modal: string) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  showToast: (msg: string) => {
    set({ toast: msg });
    setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 3000);
  },

  rollDice: () => {
    const { isRolling, energy, multiplier, currentTile, maxEnergy, isTurbo } = get();
    if (isRolling || energy < multiplier) return;

    // 1. FOCUS CAMERA ONTO ROLLING DICE
    set({
      isRolling: true,
      energy: energy - multiplier,
      cameraMode: 'DICE_FOCUS',
      dicePopup: null
    });

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalSteps = d1 + d2;
    const isDoubles = d1 === d2;

    const rollDuration = isTurbo ? 500 : 900;

    setTimeout(() => {
      // 2. SHOW POP-UP WITH NUMBERS
      set({
        dicePopup: { d1, d2, total: totalSteps, isDoubles }
      });

      // Pause before following character
      setTimeout(() => {
        // 3. CAMERA FOLLOWS TOKEN AROUND THE BOARD
        set({
          cameraMode: 'TOKEN_FOLLOW',
          dicePopup: null
        });

        // Step-by-step movement simulation
        const nextTile = (currentTile + totalSteps) % 32;
        let bonusEnergy = isDoubles ? 10 : 0;
        let newCoins = get().coins;
        let toastMsg = `🎲 Moved ${totalSteps} spaces!`;

        if (nextTile === 0) {
          newCoins += 30000 * multiplier;
          bonusEnergy += 10;
          toastMsg = `🏁 LANDED ON START! +${(30000 * multiplier).toLocaleString()} Coins!`;
        } else if (nextTile % 4 === 0) {
          const reward = 15000 * multiplier;
          newCoins += reward;
          toastMsg = `💰 +${reward.toLocaleString()} Gold Loot!`;
        }

        setTimeout(() => {
          set(state => ({
            isRolling: false,
            currentTile: nextTile,
            coins: newCoins,
            energy: Math.min(maxEnergy, state.energy + bonusEnergy),
            toast: toastMsg,
            cameraMode: 'OVERVIEW' // Reset camera back to overview
          }));
        }, isTurbo ? 600 : 1200);

      }, isTurbo ? 600 : 850);

    }, rollDuration);
  },

  upgradeBuilding: (plotIdx: number) => {
    const { coins, materials, districts, currentDistrict } = get();
    const dist = districts[currentDistrict];
    const b = dist.buildings[plotIdx];
    const cost = Math.floor(b.baseCost * (1 + b.tier * 1.5));
    const mats = b.baseMats + b.tier * 2;

    if (coins >= cost && materials >= mats && b.tier < 4 && !b.damaged) {
      const updatedBuildings = [...dist.buildings];
      updatedBuildings[plotIdx] = { ...b, tier: b.tier + 1 };
      const updatedDistricts = [...districts];
      updatedDistricts[currentDistrict] = { ...dist, buildings: updatedBuildings };

      set({
        coins: coins - cost,
        materials: materials - mats,
        districts: updatedDistricts,
        toast: `🔨 UPGRADED ${b.name.toUpperCase()} TO TIER ${b.tier + 1}!`
      });
    }
  },

  repairBuilding: (plotIdx: number) => {
    const { coins, districts, currentDistrict } = get();
    const dist = districts[currentDistrict];
    const b = dist.buildings[plotIdx];
    if (coins >= 2500 && b.damaged) {
      const updatedBuildings = [...dist.buildings];
      updatedBuildings[plotIdx] = { ...b, damaged: false };
      const updatedDistricts = [...districts];
      updatedDistricts[currentDistrict] = { ...dist, buildings: updatedBuildings };

      set({
        coins: coins - 2500,
        districts: updatedDistricts,
        toast: `✨ REPAIRED ${b.name.toUpperCase()}!`
      });
    }
  }
}));
