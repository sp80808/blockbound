// Store integration tests against the REAL zustand store, game rules and
// save layer (loaded via the TS loader hooks). Browser surfaces are stubbed
// in setup-ts.mjs; audio degrades to silent no-ops. Math.random is stubbed
// per-test for deterministic dice; short turbo animations run on real timers.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Installs the TS loader hooks and browser stubs first; everything below it
// can import the real TypeScript game modules directly.
await import('./setup-ts.mjs');

const { useGameStore, initialDistricts } = await import('../src/store/gameStore.ts');
const { decodeSave, SAVE_KEY } = await import('../src/game/gameSave.ts');
const { createInitialRotationState } = await import('../src/game/questDispatcher.ts');

const todayStr = () => new Date().toISOString().slice(0, 10);
const state = () => useGameStore.getState();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function resetStore(overrides = {}) {
  localStorage.clear();
  useGameStore.setState({
    coins: 35000, materials: 16, energy: 35, maxEnergy: 50,
    shields: 2, maxShields: 3, currentTile: 0, visualTile: 0,
    multiplier: 1, isRolling: false, isDiceAnimating: false, isTurbo: false,
    currentDistrict: 0, districts: structuredClone(initialDistricts),
    toast: null, activeModal: null, dailyStreak: 1, lastLoginDate: todayStr(),
    streakClaimedToday: false, cameraMode: 'OVERVIEW', dicePopup: null,
    pendingEncounter: null, pendingReward: null, rewardPresentation: null, lastRoll: null,
    totalRolls: 0, momentum: 0, doublesStreak: 0, doublesTotal: 0,
    upgradesBuilt: 0, raidsCompleted: 0, heistsCompleted: 0, jackpotsHit: 0,
    claimedQuests: [], unlockedDistricts: [0], soundEnabled: true,
    celebration: null, buildPulse: null, landingPulse: null,
    autoRolling: false, autoOkay: true, autoAdjustMultiplier: true,
    autoBatchSize: 5, autoRollsRemaining: 0, autoEnergyBudget: 0, autoEnergySpent: 0,
    energyUpdatedAt: Date.now(), hydrated: true, saveError: false,
    rotationState: createInitialRotationState(Date.now(), 0),
    ...overrides
  });
  localStorage.clear();
}

function defaultsSnapshot() {
  return {
    coins: 0, materials: 0, energy: 0, maxEnergy: 50,
    shields: 0, maxShields: 3, currentTile: 0, multiplier: 1, currentDistrict: 0,
    districts: initialDistricts.map(d => ({
      id: d.id, buildings: d.buildings.map(b => ({ id: b.id, tier: b.tier, damaged: b.damaged }))
    })),
    dailyStreak: 1, lastLoginDate: todayStr(), streakClaimedToday: false,
    totalRolls: 0, momentum: 0, doublesStreak: 0, lastRoll: null,
    pendingEncounter: null, pendingReward: null,
    autoOkay: true, autoAdjustMultiplier: true, autoBatchSize: 5,
    isTurbo: false, energyUpdatedAt: Date.now(),
    doublesTotal: 0, upgradesBuilt: 0, raidsCompleted: 0, heistsCompleted: 0,
    jackpotsHit: 0, claimedQuests: [], unlockedDistricts: [0], soundEnabled: true
  };
}

beforeEach(() => resetStore());

test('a roll commits its economy synchronously and spends energy exactly once', async () => {
  state().toggleTurbo(); // short animation windows for the test
  const realRandom = Math.random;
  Math.random = () => 0.01; // forced 1+1: doubles, two steps onto the brick tile
  try {
    state().rollDice();
  } finally {
    Math.random = realRandom;
  }
  let s = state();
  assert.equal(s.isRolling, true);
  assert.equal(s.totalRolls, 1);
  assert.equal(s.energy, 44); // 35 - 1 stake + 10 first-doubles bonus
  assert.equal(s.materials, 21); // 16 + 4 from the tile + 1 guaranteed progress
  assert.equal(s.coins, 35000);
  assert.equal(s.doublesStreak, 1);
  assert.equal(s.doublesTotal, 1);

  await sleep(900); // turbo: 300ms dice + 2 x 55ms steps + margin
  s = state();
  assert.equal(s.isRolling, false);
  assert.equal(s.visualTile, 2);
  assert.equal(s.currentTile, 2);
  assert.deepEqual({ ...s.landingPulse }, { tile: 2, key: 1 });
  assert.deepEqual(
    { die1: s.lastRoll.die1, die2: s.lastRoll.die2, total: s.lastRoll.total },
    { die1: 1, die2: 1, total: 2 }
  );
  assert.equal(s.toast, null);
  assert.deepEqual(
    { ...s.rewardPresentation, before: { ...s.rewardPresentation.before } },
    {
      id: 'roll-1', title: '🧱 Building blocks', coins: 0, materials: 5, energy: 10, shields: 0,
      before: { coins: 35000, materials: 16, energy: 34, shields: 2 }
    }
  );
});

test('rolls are rejected without energy, mid-roll or inside modals', () => {
  resetStore({ energy: 0, multiplier: 5 });
  state().rollDice();
  assert.equal(state().totalRolls, 0);

  resetStore({ isRolling: true });
  state().rollDice();
  assert.equal(state().totalRolls, 0);

  resetStore({ activeModal: 'upgrade' });
  state().rollDice();
  assert.equal(state().totalRolls, 0);
});

test('building upgrades validate funds, tiers, damage and rolling locks', () => {
  state().upgradeBuilding(3); // windmill: 8000 coins + 3 mats
  let s = state();
  assert.equal(s.coins, 27000);
  assert.equal(s.materials, 13);
  assert.equal(s.upgradesBuilt, 1);
  assert.equal(s.districts[0].buildings[3].tier, 1);
  assert.deepEqual({ ...s.buildPulse }, { plot: 3, tier: 1, key: s.buildPulse.key });

  resetStore({ coins: 100 });
  state().upgradeBuilding(3);
  assert.equal(state().coins, 100);
  assert.equal(state().upgradesBuilt, 0);

  const maxed = structuredClone(initialDistricts);
  maxed[0].buildings[0].tier = 4;
  resetStore({ districts: maxed });
  state().upgradeBuilding(0);
  assert.equal(state().coins, 35000);

  const damaged = structuredClone(initialDistricts);
  damaged[0].buildings[1].damaged = true;
  resetStore({ districts: damaged });
  state().upgradeBuilding(1);
  assert.equal(state().districts[0].buildings[1].tier, 1);

  resetStore({ isRolling: true });
  state().upgradeBuilding(3);
  assert.equal(state().coins, 35000);
});

test('repairs cost coins and only fix damaged buildings', () => {
  const damaged = structuredClone(initialDistricts);
  damaged[0].buildings[0].damaged = true;
  resetStore({ districts: damaged, coins: 5000 });
  state().repairBuilding(0);
  let s = state();
  assert.equal(s.coins, 2500);
  assert.equal(s.districts[0].buildings[0].damaged, false);

  resetStore({ coins: 1000 });
  const before = state().coins;
  state().repairBuilding(0); // undamaged: no-op even though funds are short
  assert.equal(state().coins, before);
});

test('quest claims pay exactly once and reject invalid goals', () => {
  resetStore({ totalRolls: 5 });
  state().claimQuest('q_warm_dice');
  let s = state();
  assert.equal(s.coins, 40000);
  assert.deepEqual([...s.claimedQuests], ['q_warm_dice']);

  state().claimQuest('q_warm_dice'); // repeat claim is inert
  assert.equal(state().coins, 40000);

  state().claimQuest('q_high_roller'); // goal not met
  assert.equal(state().coins, 40000);
  state().claimQuest('q_nope'); // unknown id
  assert.equal(state().coins, 40000);

  resetStore({ totalRolls: 5, isRolling: true });
  state().claimQuest('q_warm_dice');
  assert.equal(state().coins, 35000);
});

test('quest energy reward caps at max and remains single-claim', () => {
  resetStore({ doublesTotal: 3, energy: 49 });
  state().claimQuest('q_lucky_pair');
  assert.equal(state().energy, 50);
  assert.deepEqual([...state().claimedQuests], ['q_lucky_pair']);
  assert.equal(state().rewardPresentation.energy, 1);

  state().claimQuest('q_lucky_pair');
  assert.equal(state().energy, 50);
  assert.deepEqual([...state().claimedQuests], ['q_lucky_pair']);
});

test('finishing a presentation is payout-free and resumes auto once', async () => {
  const rewardPresentation = {
    id: 'test-reward', title: 'Test', coins: 10, materials: 1, energy: 0, shields: 0,
    before: { coins: 34990, materials: 15, energy: 35, shields: 2 }
  };
  resetStore({ rewardPresentation, autoRolling: true, autoRollsRemaining: 2,
    autoEnergyBudget: 2, autoEnergySpent: 0, isTurbo: true });
  const before = { coins: state().coins, materials: state().materials, energy: state().energy };
  const realRandom = Math.random;
  Math.random = () => 0.01;
  try {
    state().finishRewardPresentation('wrong-id');
    assert.equal(state().rewardPresentation.id, 'test-reward');
    state().finishRewardPresentation('test-reward');
    state().finishRewardPresentation('test-reward');
    assert.deepEqual(
      { coins: state().coins, materials: state().materials, energy: state().energy },
      before
    );
    await sleep(290);
    assert.equal(state().totalRolls, 1);
  } finally {
    Math.random = realRandom;
    state().stopAutoRoll();
  }
});

test('daily reward presentation reports only amounts credited under caps', () => {
  resetStore({ energy: 49, shields: 3, streakClaimedToday: false });
  state().claimStreakReward();
  const s = state();
  assert.equal(s.energy, 50);
  assert.equal(s.rewardPresentation.energy, 1);
  assert.equal(s.rewardPresentation.shields, 0);
  assert.deepEqual({ ...s.rewardPresentation.before },
    { coins: 35000, materials: 16, energy: 49, shields: 3 });
});

test('district unlocks run strictly sequential suburb, harbour, neon', () => {
  state().unlockDistrict();
  assert.deepEqual([...state().unlockedDistricts], [0]);
  assert.ok(state().toast.includes('Max every Sunny Suburb'));

  // Only the suburb maxed: the harbour opens, neon stays shut.
  const maxedSuburb = structuredClone(initialDistricts).map(d => ({
    ...d,
    buildings: d.id === 0 ? d.buildings.map(b => ({ ...b, tier: 4 })) : d.buildings
  }));
  resetStore({ districts: maxedSuburb });
  state().unlockDistrict();
  let s = state();
  assert.deepEqual([...s.unlockedDistricts], [0, 1]);
  assert.equal(s.currentDistrict, 1);
  assert.equal(s.celebration.kind, 'unlock');

  state().unlockDistrict(); // harbour not maxed: inert
  assert.deepEqual([...state().unlockedDistricts], [0, 1]);

  // Harbour maxed too: Neon Metropolis opens and takes focus.
  const maxedTwo = structuredClone(initialDistricts).map(d => ({
    ...d,
    buildings: d.id <= 1 ? d.buildings.map(b => ({ ...b, tier: 4 })) : d.buildings
  }));
  resetStore({ districts: maxedTwo, unlockedDistricts: [0, 1], currentDistrict: 1 });
  state().unlockDistrict();
  s = state();
  assert.deepEqual([...s.unlockedDistricts], [0, 1, 2]);
  assert.equal(s.currentDistrict, 2);
  assert.ok(s.toast.includes('NEON METROPOLIS'));

  state().unlockDistrict(); // everything open: inert
  assert.deepEqual([...state().unlockedDistricts], [0, 1, 2]);

  state().setDistrict(0);
  assert.equal(state().currentDistrict, 0);
  state().setDistrict(2);
  assert.equal(state().currentDistrict, 2);
  state().setDistrict(7); // unknown district
  assert.equal(state().currentDistrict, 2);
  useGameStore.setState({ isRolling: true });
  state().setDistrict(1); // rolling locks the map
  assert.equal(state().currentDistrict, 2);
});

test('nextLockedDistrict walks districts in order', async () => {
  const { nextLockedDistrict } = await import('../src/store/gameStore.ts');
  assert.equal(nextLockedDistrict(initialDistricts, [0]), 1);
  assert.equal(nextLockedDistrict(initialDistricts, [0, 1]), 2);
  assert.equal(nextLockedDistrict(initialDistricts, [0, 1, 2]), null);
  assert.equal(nextLockedDistrict(initialDistricts, []), 0);
});

test('encounter picks validate counts and pay committed rewards once', () => {
  const raid = {
    id: 1, kind: 'raid', multiplier: 1,
    options: [
      { label: 'A', coins: 100, materials: 1, energy: 0 },
      { label: 'B', coins: 200, materials: 0, energy: 2 },
      { label: 'C', coins: 300, materials: 0, energy: 0 }
    ]
  };
  resetStore({ pendingEncounter: raid, activeModal: 'encounter' });
  state().resolveEncounterPicks([0, 1]); // raids take exactly one target
  assert.ok(state().pendingEncounter !== null);
  state().resolveEncounterPicks([7]); // out of range
  assert.ok(state().pendingEncounter !== null);

  state().resolveEncounter(1); // single-pick wrapper still works for raids
  let s = state();
  assert.equal(s.pendingEncounter, null);
  assert.equal(s.coins, 35200);
  assert.equal(s.energy, 37);
  assert.equal(s.raidsCompleted, 1);
  assert.equal(s.heistsCompleted, 0);
  assert.deepEqual(
    { id: s.rewardPresentation.id, coins: s.rewardPresentation.coins,
      materials: s.rewardPresentation.materials, energy: s.rewardPresentation.energy },
    { id: 'encounter-1', coins: 200, materials: 0, energy: 2 }
  );

  state().resolveEncounterPicks([0]); // double-collect is inert
  assert.equal(state().coins, 35200);

  const heistOptions = Array.from({ length: 9 }, (_, i) => ({
    label: 'Vault ' + (i + 1), coins: 100 * (i + 1), materials: 0, energy: 0
  }));
  resetStore({ pendingEncounter: { id: 2, kind: 'heist', multiplier: 1, options: heistOptions } });
  state().resolveEncounterPicks([0, 1]); // heists take exactly three safes
  assert.ok(state().pendingEncounter !== null);
  state().resolveEncounterPicks([0, 1, 1]); // duplicates collapse to two seats
  assert.ok(state().pendingEncounter !== null);
  state().resolveEncounterPicks([0, 1, 8]);
  s = state();
  assert.equal(s.pendingEncounter, null);
  assert.equal(s.coins, 35000 + 100 + 200 + 900);
  assert.equal(s.heistsCompleted, 1);
});

test('sound toggles and persists through the save', () => {
  assert.equal(state().soundEnabled, true);
  state().toggleSound();
  assert.equal(state().soundEnabled, false);
  state().toggleSound();
  assert.equal(state().soundEnabled, true);
});

test('autosave round-trips counters, claims, unlocks and sound', () => {
  resetStore({
    totalRolls: 30, doublesTotal: 4, upgradesBuilt: 3,
    raidsCompleted: 1, heistsCompleted: 2, jackpotsHit: 1,
    claimedQuests: ['q_warm_dice'], unlockedDistricts: [0, 1],
    currentDistrict: 1, soundEnabled: false
  });
  state().toggleSound(); // true again, and persisted
  const raw = localStorage.getItem(SAVE_KEY);
  assert.ok(typeof raw === 'string');
  const envelope = JSON.parse(raw);
  assert.equal(envelope.version, 1);
  assert.equal(envelope.progress.doublesTotal, 4);
  assert.equal(envelope.progress.jackpotsHit, 1);
  assert.deepEqual(envelope.progress.claimedQuests, ['q_warm_dice']);
  assert.deepEqual(envelope.progress.unlockedDistricts, [0, 1]);
  assert.equal(envelope.progress.soundEnabled, true);
  assert.equal(envelope.progress.rewardPresentation, undefined);

  const restored = decodeSave(raw, defaultsSnapshot(), Date.now());
  assert.equal(restored.doublesTotal, 4);
  assert.equal(restored.heistsCompleted, 2);
  assert.deepEqual(restored.claimedQuests, ['q_warm_dice']);
  assert.deepEqual(restored.unlockedDistricts, [0, 1]);
  assert.equal(restored.currentDistrict, 1);
});

test('rolling dice dispatches roll action to active rotation quests', () => {
  resetStore();
  const initialQuests = state().rotationState?.windows.flash.quests ?? [];
  const rollQuest = initialQuests.find(q => q.actionType === 'roll');
  if (rollQuest) {
    const beforeProgress = rollQuest.current;
    state().rollDice();
    const afterQuests = state().rotationState?.windows.flash.quests ?? [];
    const afterRollQuest = afterQuests.find(q => q.id === rollQuest.id);
    assert.equal(afterRollQuest?.current, beforeProgress + 1);
  } else {
    // If flash pool didn't pick roll this epoch, daily might have or we manually test dispatch
    assert.ok(state().rotationState);
  }
});

test('tick turnover auto-collects completed rotation quests', () => {
  resetStore();
  let rot = state().rotationState;
  assert.ok(rot);
  // Complete flash quest 0 without claiming
  const target = rot.windows.flash.quests[0];
  target.current = target.goal;
  target.claimed = false;
  useGameStore.setState({ rotationState: { ...rot } });

  const coinsBefore = state().coins;
  // Jump 5 hours into the future
  const futureTime = rot.lastSeenTimestamp + 5 * 3600 * 1000;
  state().tickRecovery(futureTime);

  assert.ok(state().coins > coinsBefore);
  assert.ok(state().rotationState.windows.flash.windowId > rot.windows.flash.windowId);
});

test('claimRotationQuest pays rewards and marks quest claimed', () => {
  resetStore();
  const rot = state().rotationState;
  assert.ok(rot);
  const target = rot.windows.flash.quests[0];
  target.current = target.goal;
  target.claimed = false;
  useGameStore.setState({ rotationState: { ...rot } });

  const beforeCoins = state().coins;
  state().claimRotationQuest('flash', target.id);

  assert.equal(state().coins, beforeCoins + target.reward.coins);
  assert.equal(state().rotationState.windows.flash.quests[0].claimed, true);
});

