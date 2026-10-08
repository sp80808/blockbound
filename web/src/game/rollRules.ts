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
    case 'mystery':
      // A known, reproducible choice from the already committed dice outcome.
      // Replace with injected RNG when the full content/event model is ported.
      if ((die1 + die2) % 2 === 0) reward.materials = 6 * multiplier;
      else reward.coins = 12000 * multiplier;
      reward.label = '🎁 Mystery surprise';
      break;
  }
  return reward;
}
