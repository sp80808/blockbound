/**
 * Portable encounter contracts (v1) for Blockbound minigames.
 *
 * The host (gameStore) commits every reward up front. A minigame only
 * presents choices, animates them, and returns the player's seat picks.
 * It never writes coins, dice, saves or global stores, and it fires
 * onComplete at most once per encounter.
 */

export type MinigameCurrency = 'coins' | 'materials' | 'energy';

export interface MinigameOption {
  label: string;
  coins: number;
  materials: number;
  energy: number;
  variant?: 'brass' | 'steel' | 'crystal';
  shielded?: boolean;
}

export interface MinigameEncounter {
  id: number;
  kind: 'raid' | 'heist';
  multiplier: number;
  options: MinigameOption[];
}

export type MinigameExitReason = 'cancel' | 'close';

export interface MinigameProps {
  encounter: MinigameEncounter;
  reducedMotion?: boolean;
  onComplete: (choiceIndices: number[]) => void;
  onExit?: (reason: MinigameExitReason) => void;
}

/** Sum the committed rewards behind a set of seat picks (display only). */
export function tallyPicks(options: MinigameOption[], picks: number[]): { coins: number; materials: number; energy: number } {
  return picks.reduce(
    (sum, i) => {
      const o = options[i];
      if (!o) return sum;
      return {
        coins: sum.coins + o.coins,
        materials: sum.materials + (o.materials ?? 0),
        energy: sum.energy + (o.energy ?? 0)
      };
    },
    { coins: 0, materials: 0, energy: 0 }
  );
}

/** Validate a pick set before the single completion callback fires. */
export function validPicks(kind: 'raid' | 'heist', optionCount: number, picks: number[]): boolean {
  const want = kind === 'raid' ? 1 : 3;
  const unique = [...new Set(picks)];
  return unique.length === want && unique.every(i => Number.isInteger(i) && i >= 0 && i < optionCount);
}
