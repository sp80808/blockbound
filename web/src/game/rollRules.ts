/**
 * Board/reward rules shared by manual rolls and bounded auto-roll batches.
 * Rendering and timers must never decide the economic outcome.
 */
export const MULTIPLIERS = [1, 2, 3, 5, 10, 20, 50, 100] as const;
export type TileKind =
  | 'go' | 'coin-small' | 'coin-medium' | 'coin-large' | 'materials'
  | 'shield' | 'raid' | 'heist' | 'mystery' | 'energy'
  | 'district' | 'jackpot';

export const BOARD_TILES: readonly TileKind[] = [
  'go', 'coin-small', 'materials', 'coin-medium', 'shield', 'coin-small', 'raid', 'energy',
  'heist', 'coin-medium', 'mystery', 'materials', 'coin-large', 'shield', 'coin-small', 'district',
  'jackpot', 'coin-medium', 'raid', 'materials', 'coin-small', 'energy', 'heist', 'coin-large',
  'mystery', 'coin-medium', 'shield', 'materials', 'coin-small', 'raid', 'district', 'coin-large'
];

export interface DicePair {
  die1: number;
  die2: number;
  total: number;
  doubles: boolean;
}

/** Inject an RNG in tests; animations must not make additional gameplay rolls. */
export function rollPair(rng: () => number): DicePair {
  const next = () => {
    const draw = rng();
    if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new Error('Invalid RNG draw');
    return 1 + Math.floor(draw * 6);
  };
  const die1 = next();
  const die2 = next();
  return { die1, die2, total: die1 + die2, doubles: die1 === die2 };
}

export type EncounterKind = 'raid' | 'heist';

export interface TileReward {
  kind: TileKind;
  label: string;
  coins: number;
  materials: number;
  energy: number;
  shields: number;
  encounter: EncounterKind | null;
}

export function allowedMultipliers(energy: number): number[] {
  const spendable = Math.max(0, Math.floor(Number.isFinite(energy) ? energy : 0));
  return MULTIPLIERS.filter(value => value <= spendable);
}

export function nextMultiplier(current: number, energy: number): number {
  const allowed = allowedMultipliers(energy);
  if (allowed.length === 0) return 1;
  return allowed.find(value => value > current) ?? allowed[0];
}

export function affordableAutoMultiplier(preferred: number, energy: number, adapt: boolean): number | null {
  const allowed = allowedMultipliers(energy);
  if (allowed.length === 0) return null;
  if (allowed.includes(preferred)) return preferred;
  if (!adapt) return null;
  return allowed[allowed.length - 1];
}

export function boardPath(from: number, steps: number, length = BOARD_TILES.length): number[] {
  if (!Number.isInteger(steps) || steps < 0 || !Number.isInteger(length) || length < 1) {
    throw new Error('Invalid board steps or board length');
  }
  return Array.from({ length: steps }, (_, i) => ((from + i + 1) % length + length) % length);
}

export function tileReward(index: number, multiplier: number, die1: number, die2: number): TileReward {
  const kind = BOARD_TILES[index];
  if (!kind) throw new Error('Unknown tile index');
  if (!Number.isInteger(multiplier) || multiplier < 1) throw new Error('Invalid multiplier');
  const reward: TileReward = { kind, label: '', coins: 0, materials: 0, energy: 0, shields: 0, encounter: null };

  switch (kind) {
    case 'go': reward.coins = 25000 * multiplier; reward.energy = 10; reward.label = '🏁 Start bonus'; break;
    case 'coin-small': reward.coins = 3500 * multiplier; reward.label = '🪙 Coin pouch'; break;
    case 'coin-medium': reward.coins = 8500 * multiplier; reward.label = '💰 Coin chest'; break;
    case 'coin-large': reward.coins = 20000 * multiplier; reward.label = '👑 Gold vault'; break;
    case 'jackpot': reward.coins = 50000 * multiplier; reward.label = '✨ Jackpot!'; break;
    case 'materials': reward.materials = 4 * multiplier; reward.label = '🧱 Building blocks'; break;
    case 'shield': reward.shields = 1; reward.label = '🛡️ Shield'; break;
    case 'energy': reward.energy = 8; reward.label = '⚡ Dice charge'; break;
    case 'district': reward.materials = 3; reward.coins = 5000 * multiplier; reward.label = '🏡 District bonus'; break;
    case 'raid': reward.encounter = 'raid'; reward.label = '⚔️ Town raid'; break;
    case 'heist': reward.encounter = 'heist'; reward.label = '🗝️ Vault heist'; break;
    case 'mystery': {
      // Deterministic from the already-committed dice: lucky totals pay
      // energy/shields, middling totals pay mixed caches, extremes pay big.
      const outcome = mysteryOutcome(die1, die2, multiplier);
      reward.coins = outcome.coins;
      reward.materials = outcome.materials;
      reward.energy = outcome.energy;
      reward.shields = outcome.shields;
      reward.label = outcome.label;
      break;
    }
  }
  return reward;
}

/** Deterministic mystery table driven only by committed dice + stake. */
export interface MysteryOutcome {
  label: string;
  coins: number;
  materials: number;
  energy: number;
  shields: number;
}

export function mysteryOutcome(die1: number, die2: number, multiplier: number): MysteryOutcome {
  if (!Number.isInteger(multiplier) || multiplier < 1) throw new Error('Invalid multiplier');
  const total = die1 + die2;
  if (total === 2 || total === 12) {
    return { label: '🎁 Mystery JACKPOT', coins: 22000 * multiplier, materials: 0, energy: 0, shields: 0 };
  }
  if (total === 7) {
    return { label: '🎁 Lucky seven surge', coins: 0, materials: 0, energy: 12, shields: 0 };
  }
  if (total === 3 || total === 4) {
    return { label: '🎁 Mystery bricks', coins: 0, materials: 6 * multiplier, energy: 0, shields: 0 };
  }
  if (total === 10 || total === 11) {
    return { label: '🎁 Mystery aegis', coins: 4000 * multiplier, materials: 0, energy: 0, shields: 1 };
  }
  if (total === 5 || total === 6) {
    return { label: '🎁 Mystery coins', coins: 12000 * multiplier, materials: 0, energy: 0, shields: 0 };
  }
  return { label: '🎁 Mystery cache', coins: 6000 * multiplier, materials: 2 * multiplier, energy: 0, shields: 0 };
}

/** How many times a stepwise path passes (not merely lands on) GO. */
export function passGoCount(path: number[]): number {
  let passes = 0;
  for (let i = 1; i < path.length; i++) {
    if (path[i] <= path[i - 1] && !(path[i - 1] === 31 && path[i] === 0 && i === path.length - 1 && path[i] === 0)) {
      // Any wrap-around is a pass; a final landing exactly on GO counts as
      // the landing bonus instead, so only count it when the path continues.
      if (i < path.length - 1 || path[i] !== 0) passes += 1;
      else if (path[i] === 0 && i === path.length - 1) {
        // Landed on GO: the tile itself pays; still count earlier wraps only.
      }
    }
  }
  // Simpler robust rule: count index decreases, excluding a final landing on 0.
  passes = 0;
  for (let i = 1; i < path.length; i++) {
    if (path[i] < path[i - 1] && !(i === path.length - 1 && path[i] === 0)) passes += 1;
  }
  return passes;
}

export function passGoReward(passes: number, multiplier: number): { coins: number; energy: number } {
  if (!Number.isInteger(passes) || passes < 0) throw new Error('Invalid pass count');
  if (!Number.isInteger(multiplier) || multiplier < 1) throw new Error('Invalid multiplier');
  return { coins: 5000 * passes * multiplier, energy: 2 * passes };
}

export interface RollProgressReward {
  materials: number;
  energy: number;
  shields: number;
}

/** Guaranteed build progress, with the existing five/ten-roll bonuses folded in. */
export function rollProgressReward(rollNumber: number): RollProgressReward {
  if (!Number.isInteger(rollNumber) || rollNumber < 1) throw new Error('Invalid roll number');
  return {
    materials: 1 + (rollNumber % 5 === 0 ? 3 : 0),
    energy: rollNumber % 10 === 0 ? 8 : 0,
    shields: rollNumber % 10 === 0 ? 1 : 0
  };
}

export interface UpgradeCostSource {
  baseCost: number;
  baseMats: number;
  tier: number;
}

/** One upgrade-price authority for the build menu and store transaction. */
export function buildingUpgradeCost(building: UpgradeCostSource): { coins: number; materials: number } {
  if (!Number.isFinite(building.baseCost) || building.baseCost < 0 ||
      !Number.isInteger(building.baseMats) || building.baseMats < 0 ||
      !Number.isInteger(building.tier) || building.tier < 0 || building.tier > 4) {
    throw new Error('Invalid building cost');
  }
  return {
    coins: Math.floor(building.baseCost * (1 + building.tier * 1.5)),
    materials: building.baseMats + building.tier * 2
  };
}

/**
 * Shielded engines charge dice on GO: each held shield converts into bonus
 * energy whenever the token passes or lands on GO. Shields stay purely
 * positive — nothing in the game spends or breaks them.
 */
export function goShieldCharge(shields: number, passesGo: boolean): number {
  if (!Number.isInteger(shields) || shields < 0) throw new Error('Invalid shield count');
  return passesGo ? 2 * shields : 0;
}

/** Escalating doubles-streak bonus. Pure: streak counts consecutive doubles. */
export function doublesBonus(streak: number, multiplier: number): { coins: number; energy: number; shields: number } {
  if (!Number.isInteger(streak) || streak < 0) throw new Error('Invalid streak');
  if (!Number.isInteger(multiplier) || multiplier < 1) throw new Error('Invalid multiplier');
  if (streak <= 0) return { coins: 0, energy: 0, shields: 0 };
  if (streak === 1) return { coins: 0, energy: 10, shields: 0 };
  if (streak === 2) return { coins: 8000 * multiplier, energy: 10, shields: 0 };
  return { coins: 12000 * multiplier, energy: 10, shields: 1 };
}

export interface EncounterOption {
  label: string;
  coins: number;
  materials: number;
  energy: number;
  /** Presentation hint only — never affects the committed payout. */
  variant?: 'brass' | 'steel' | 'crystal';
  /** Raid only: host-supplied shield state for a transparent blocked-hit visual. */
  shielded?: boolean;
}

/**
 * Host-committed encounter choices. Raid offers 3 targets (pick 1); heist
 * offers a 3×3 board of 9 safes (pick 3). Deterministic rotation from the
 * roll id moves the best seat around — a real choice, same EV family.
 * Rewards are shown up front in this offline prototype.
 */
export function encounterOptions(kind: EncounterKind, multiplier: number, seed: number): EncounterOption[] {
  if (!Number.isInteger(multiplier) || multiplier < 1) throw new Error('Invalid multiplier');
  if (!Number.isFinite(seed)) throw new Error('Invalid seed');
  const rotation = Math.abs(Math.floor(seed)) % 3;
  if (kind === 'raid') {
    const table: EncounterOption[] = [
      { label: '🛡️ Safe Workshop', coins: 6000 * multiplier, materials: 2 * multiplier, energy: 0, shielded: false },
      { label: '⚔️ Bold Market', coins: 10000 * multiplier, materials: 0, energy: 4, shielded: false },
      { label: '👑 Tower Jackpot', coins: 16000 * multiplier, materials: 0, energy: 0, shielded: false }
    ];
    // One target per raid is shielded by its NPC crew: transparent before
    // the pick (barred-door badge), halved loot, shield-pop instead of damage.
    table[rotation] = { ...table[rotation], shielded: true, coins: Math.floor(table[rotation].coins / 2) };
    return table;
  }
  const variants: Array<'brass' | 'steel' | 'crystal'> = ['brass', 'steel', 'crystal'];
  const coinTable = [1500, 2000, 2500, 3000, 4000, 5000, 7000, 9000, 12000];
  const matsTable = [2, 0, 3, 0, 2, 0, 4, 0, 2];
  const rotated = coinTable.map((_, i) => (i + rotation * 3) % 9);
  return rotated.map((sourceIdx, i) => ({
    label: (variants[i % 3] === 'brass' ? '🥉' : variants[i % 3] === 'steel' ? '🥈' : '💎') +
      ' Vault ' + (i + 1),
    coins: coinTable[sourceIdx] * multiplier,
    materials: matsTable[sourceIdx] * multiplier,
    energy: sourceIdx === 7 ? 4 : 0,
    variant: variants[i % 3]
  }));
}
