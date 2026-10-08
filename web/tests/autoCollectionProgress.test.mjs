import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

await import('./setup-ts.mjs');

const { useGameStore, initialDistricts } = await import('../src/store/gameStore.ts');
const state = () => useGameStore.getState();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function resetStore(overrides = {}) {
  localStorage.clear();
  useGameStore.setState({
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
    isTurbo: true,
    currentDistrict: 0,
    districts: structuredClone(initialDistricts),
    toast: null,
    activeModal: null,
    dailyStreak: 1,
    lastLoginDate: '2026-10-08',
    streakClaimedToday: false,
    cameraMode: 'OVERVIEW',
    dicePopup: null,
    pendingEncounter: null,
    pendingReward: null,
    rewardPresentation: null,
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
    hydrated: true,
    saveError: false,
    ...overrides
  });
}

beforeEach(() => {
  resetStore();
});

test('auto rolling state enables auto-collection and finishes presentations into next roll', async () => {
  const reward = {
    id: 'roll-auto-1',
    title: '🪙 Coins galore',
    coins: 1000,
    materials: 0,
    energy: 0,
    shields: 0,
    before: { coins: 34000, materials: 16, energy: 35, shields: 2 }
  };

  resetStore({
    autoRolling: true,
    autoRollsRemaining: 2,
    autoEnergyBudget: 10,
    autoEnergySpent: 1,
    rewardPresentation: reward
  });

  assert.equal(state().autoRolling, true);
  assert.equal(state().rewardPresentation?.id, 'roll-auto-1');

  // Finish presentation should clear rewardPresentation and resume auto roll
  state().finishRewardPresentation('roll-auto-1');
  assert.equal(state().rewardPresentation, null);
  assert.equal(state().autoRolling, true);
});

test('CSS files contain auto collection progress bar styles and keyframes', () => {
  const rewardCssPath = fileURLToPath(new URL('../src/components/RewardPresentation.css', import.meta.url));
  const rewardCss = readFileSync(rewardCssPath, 'utf8');

  assert.ok(rewardCss.includes('.bb-auto-progress-line'), 'RewardPresentation.css contains .bb-auto-progress-line');
  assert.ok(rewardCss.includes('.bb-auto-progress-fill'), 'RewardPresentation.css contains .bb-auto-progress-fill');
  assert.ok(rewardCss.includes('bb-auto-line-fill'), 'RewardPresentation.css contains bb-auto-line-fill keyframe animation');

  const gameFeelCssPath = fileURLToPath(new URL('../src/components/GameFeel.css', import.meta.url));
  const gameFeelCss = readFileSync(gameFeelCssPath, 'utf8');

  assert.ok(gameFeelCss.includes('.bb-celebration-card'), 'GameFeel.css contains .bb-celebration-card');
  assert.ok(gameFeelCss.includes('.bb-auto-progress-fill') || gameFeelCss.includes('.bb-auto-card-line'), 'GameFeel.css contains auto-collection progress line styles');
});
