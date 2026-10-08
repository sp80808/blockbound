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

  rollDice: () => void;
  cycleMultiplier: () => void;
  toggleTurbo: () => void;
  upgradeBuilding: (plotIdx: number) => void;
  repairBuilding: (plotIdx: number) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  showToast: (msg: string) => void;
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
    const { isRolling, energy, multiplier, currentTile, maxEnergy } = get();
    if (isRolling || energy < multiplier) return;

    set({ isRolling: true, energy: energy - multiplier });

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const totalSteps = d1 + d2;
    const isDoubles = d1 === d2;

    setTimeout(() => {
      const nextTile = (currentTile + totalSteps) % 32;
      let bonusEnergy = isDoubles ? 10 : 0;
      let newCoins = get().coins;
      let toastMsg = `🎲 Rolled ${d1} + ${d2} = ${totalSteps}!`;

      // Reward tile
      if (nextTile === 0) {
        newCoins += 30000 * multiplier;
        bonusEnergy += 10;
        toastMsg = `🏁 LANDED ON GO! +${(30000 * multiplier).toLocaleString()} Coins!`;
      } else if (nextTile % 4 === 0) {
        const reward = 15000 * multiplier;
        newCoins += reward;
        toastMsg = `💰 +${reward.toLocaleString()} Gold Loot!`;
      }

      set(state => ({
        isRolling: false,
        currentTile: nextTile,
        coins: newCoins,
        energy: Math.min(maxEnergy, state.energy + bonusEnergy),
        toast: toastMsg
      }));
    }, get().isTurbo ? 500 : 900);
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
