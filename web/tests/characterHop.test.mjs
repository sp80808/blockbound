// Tests verifying the tactile 4-phase locomotion progression loop and hop mechanics
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

await import('./setup-ts.mjs');

const { useGameStore, initialDistricts } = await import('../src/store/gameStore.ts');
const { playHop, playTileLand } = await import('../src/services/audio/sfx.ts');
const { TILE_POSITIONS } = await import('../src/components/VoxelScene.tsx');

const state = () => useGameStore.getState();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function resetStore(overrides = {}) {
  localStorage.clear();
  useGameStore.setState({
    coins: 35000, materials: 16, energy: 35, maxEnergy: 50,
    shields: 2, maxShields: 3, currentTile: 0, visualTile: 0,
    multiplier: 1, isRolling: false, isDiceAnimating: false, isTurbo: true,
    currentDistrict: 0, districts: structuredClone(initialDistricts),
    toast: null, activeModal: null, dailyStreak: 1, lastLoginDate: '2026-10-08',
    streakClaimedToday: false, cameraMode: 'OVERVIEW', dicePopup: null,
    pendingEncounter: null, pendingReward: null, rewardPresentation: null, lastRoll: null,
    totalRolls: 0, momentum: 0, doublesStreak: 0, doublesTotal: 0,
    upgradesBuilt: 0, raidsCompleted: 0, heistsCompleted: 0, jackpotsHit: 0,
    claimedQuests: [], unlockedDistricts: [0], soundEnabled: true,
    celebration: null, buildPulse: null, landingPulse: null, hopStep: null,
    autoRolling: false, autoOkay: true, autoAdjustMultiplier: true,
    autoBatchSize: 5, autoRollsRemaining: 0, autoEnergyBudget: 0, autoEnergySpent: 0,
    energyUpdatedAt: Date.now(), hydrated: true, saveError: false,
    ...overrides
  });
}

beforeEach(() => {
  resetStore();
});

test('TILE_POSITIONS defines coordinates for all 32 perimeter diorama spaces', () => {
  assert.equal(TILE_POSITIONS.length, 32);
  // Tile 0 corner starts at (-halfBoard, 0, -halfBoard) = (-9.6, 0, -9.6)
  assert.equal(TILE_POSITIONS[0][0], -9.6);
  assert.equal(TILE_POSITIONS[0][2], -9.6);
  // Tile 8 corner is (9.6, 0, -9.6)
  assert.equal(TILE_POSITIONS[8][0], 9.6);
  assert.equal(TILE_POSITIONS[8][2], -9.6);
});

test('hopStep sequences tile-by-tile transitions during roll locomotion and clears on arrival', async () => {
  resetStore({ isTurbo: true });
  // Deterministic 1 + 1 = 2 roll (step from 0 -> 1 -> 2)
  const origRandom = Math.random;
  let call = 0;
  Math.random = () => {
    call += 1;
    return call % 2 === 1 ? 0.05 : 0.05; // produces die1 = 1, die2 = 1
  };

  const stepsObserved = [];
  const unsubscribe = useGameStore.subscribe(s => {
    if (s.hopStep) {
      const last = stepsObserved[stepsObserved.length - 1];
      if (!last || last.key !== s.hopStep.key) {
        stepsObserved.push({ ...s.hopStep });
      }
    }
  });

  try {
    state().rollDice();
    assert.equal(state().isRolling, true);

    // Wait through motion delay + 2 turbo steps + margin
    await sleep(750);

    const s = state();
    assert.equal(s.isRolling, false);
    assert.equal(s.currentTile, 2);
    assert.equal(s.visualTile, 2);
    assert.equal(s.hopStep, null);
    assert.deepEqual({ ...s.landingPulse }, { tile: 2, key: 1 });

    // Verify each tile step was recorded with accurate sequence metadata
    assert.equal(stepsObserved.length, 2);
    assert.deepEqual(stepsObserved[0], { step: 1, total: 2, from: 0, to: 1, key: 100 });
    assert.deepEqual(stepsObserved[1], { step: 2, total: 2, from: 1, to: 2, key: 101 });
  } finally {
    unsubscribe();
    Math.random = origRandom;
  }
});

test('sfx playHop and playTileLand execute safely without audio exceptions', () => {
  assert.doesNotThrow(() => {
    playHop(0);
    playHop(0.5);
    playHop(1.0);
    playTileLand();
  });
});
