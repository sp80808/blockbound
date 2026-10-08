// Built-in Node tests for the pure save schema; no browser, UI or extra test runner required.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/gameSave.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const saves = {};
runInNewContext(compiled.outputText, { exports: saves, Date, JSON, Number, Math }, { timeout: 1000 });

const startTime = Date.parse('2026-10-08T12:00:00.000Z');
const defaults = () => ({
  coins: 35000, materials: 16, energy: 35, maxEnergy: 50,
  shields: 2, maxShields: 3, currentTile: 0, multiplier: 1, currentDistrict: 0,
  districts: [{ id: 0, buildings: [
    { id: 'a', tier: 1, damaged: false }, { id: 'b', tier: 0, damaged: false }
  ] }],
  dailyStreak: 1, lastLoginDate: '2026-10-08', streakClaimedToday: false,
  totalRolls: 0, momentum: 0, lastRoll: null,
  pendingEncounter: null, pendingReward: null,
  autoOkay: true, autoAdjustMultiplier: true, autoBatchSize: 5,
  isTurbo: false, energyUpdatedAt: startTime
});
const copy = obj => JSON.parse(JSON.stringify(obj));

test('round-trip preserves earned coins, building tiers, position and committed roll', () => {
  const state = defaults();
  state.coins = 148000; state.currentTile = 9; state.materials = 55;
  state.totalRolls = 1; state.momentum = 1;
  state.lastRoll = { id: 1, die1: 3, die2: 6, total: 9, multiplier: 5, doubles: false };
  state.districts[0].buildings[0].tier = 4;
  const result = saves.decodeSave(saves.encodeSave(state, startTime), defaults(), startTime);
  assert.equal(result?.coins, 148000);
  assert.equal(result?.currentTile, 9);
  assert.equal(result?.lastRoll?.total, 9);
  assert.equal(result?.districts[0].buildings[0].tier, 4);
});

test('encounter saved during a committed roll survives restart and cannot be recreated', () => {
  const state = defaults();
  state.totalRolls = 7;
  state.lastRoll = { id: 7, die1: 4, die2: 3, total: 7, multiplier: 2, doubles: false };
  state.pendingEncounter = { id: 7, kind: 'raid', multiplier: 2,
    options: [{ label: 'Workshop', coins: 12000 }, { label: 'Market', coins: 18000 },
      { label: 'Tower', coins: 24000 }] };
  const restored = saves.decodeSave(saves.encodeSave(state, startTime), defaults(), startTime);
  assert.equal(restored.pendingEncounter?.id, 7);
  assert.equal(restored.pendingEncounter?.options[2].coins, 24000);
});

test('truncated, unknown-version, oversized and untrusted fields cannot corrupt progress', () => {
  assert.equal(saves.decodeSave('{oops', defaults(), startTime), null);
  assert.equal(saves.decodeSave(JSON.stringify({ version: 999, progress: defaults() }), defaults(), startTime), null);
  assert.equal(saves.decodeSave(' '.repeat(64_001), defaults(), startTime), null);
  const saved = defaults(); saved.coins = -100; saved.materials = Number.POSITIVE_INFINITY;
  saved.currentTile = 400; saved.energy = -100; saved.multiplier = 600;
  saved.districts[0].buildings[0].tier = 99;
  saved.districts[0].buildings.push({ id: 'injected-unknown', tier: 4, damaged: true });
  const result = saves.restoreProgress(saved, defaults(), startTime);
  assert.equal(result.coins, 35000);
  assert.equal(result.currentTile, 0);
  assert.equal(result.energy, 35);
  assert.equal(result.multiplier, 1);
  assert.equal(result.districts[0].buildings.length, 2);
  assert.equal(result.districts[0].buildings[0].tier, 1);
});

test('refill advances once per complete 45 seconds, carries partial elapsed time', () => {
  const initial = saves.refillEnergy(30, 50, startTime, startTime + 110_000);
  assert.equal(initial.energy, 32);
  assert.equal(initial.energyUpdatedAt, startTime + 90_000);
  const later = saves.refillEnergy(initial.energy, 50, initial.energyUpdatedAt, startTime + 135_000);
  assert.equal(later.energy, 33);
  assert.equal(later.energyUpdatedAt, startTime + 135_000);
});

test('energy never exceeds cap and wall-clock rollback does not grant energy', () => {
  const maxed = saves.refillEnergy(49, 50, startTime, startTime + 2_000_000);
  assert.equal(maxed.energy, 50);
  assert.equal(maxed.energyUpdatedAt, startTime + 2_000_000);
  const rollback = saves.refillEnergy(15, 50, startTime, startTime - 100_000);
  assert.equal(rollback.energy, 15);
});

test('reload after 90 seconds earns 2 energy, within the cap', () => {
  const state = defaults(); state.energy = 4;
  const restored = saves.decodeSave(saves.encodeSave(state, startTime),
    defaults(), startTime + 90_000);
  assert.equal(restored.energy, 6);
});

test('streak progresses only if yesterday reward was claimed, else resets', () => {
  const claimed = defaults(); claimed.lastLoginDate = '2026-10-07';
  claimed.dailyStreak = 3; claimed.streakClaimedToday = true;
  const today = saves.restoreProgress(claimed, defaults(), startTime);
  assert.equal(today.dailyStreak, 4);
  assert.equal(today.streakClaimedToday, false);
  const unclaimed = copy(claimed); unclaimed.streakClaimedToday = false;
  assert.equal(saves.restoreProgress(unclaimed, defaults(), startTime).dailyStreak, 1);
});

test('missed days reset streak, even after previous claim', () => {
  const state = defaults(); state.dailyStreak = 5;
  state.streakClaimedToday = true; state.lastLoginDate = '2026-10-05';
  const newState = saves.restoreProgress(state, defaults(), startTime);
  assert.equal(newState.dailyStreak, 1);
  assert.equal(newState.streakClaimedToday, false);
});

test('an invalid pending encounter is not restored as a claimable prize', () => {
  const state = defaults(); state.totalRolls = 2;
  state.lastRoll = { id: 2, die1: 1, die2: 1, total: 2, multiplier: 1, doubles: true };
  state.pendingEncounter = { id: 999, kind: 'raid', multiplier: 1,
    options: [{ label: 'cheat', coins: 99999999999 }] };
  const hydrated = saves.restoreProgress(state, defaults(), startTime);
  assert.equal(hydrated.pendingEncounter, null);
});


test('future/corrupt save is backed up once before using defaults', () => {
  const values = new Map([[saves.SAVE_KEY, '{"version":999,"progress":{"coins":100}}']]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const module = {};
  runInNewContext(compiled.outputText, {
    exports: module, Date, JSON, Number, Math, localStorage: storage
  }, { timeout: 1000 });
  assert.equal(module.loadFromStorage(defaults(), startTime), null);
  assert.equal(values.get(module.SAVE_BACKUP_KEY), '{"version":999,"progress":{"coins":100}}');
  assert.equal(module.saveToStorage(defaults(), startTime), true);
  assert.equal(values.get(module.SAVE_BACKUP_KEY), '{"version":999,"progress":{"coins":100}}');
  assert.ok(module.decodeSave(values.get(module.SAVE_KEY), defaults(), startTime));
});

test('blocked corrupt-save backup refuses unsafe overwrite', () => {
  const values = new Map([[saves.SAVE_KEY, '{broken']]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      if (key === saves.SAVE_BACKUP_KEY) throw new Error('Storage quota exceeded');
      values.set(key, value);
    }
  };
  const module = {};
  runInNewContext(compiled.outputText, {
    exports: module, Date, JSON, Number, Math, localStorage: storage
  }, { timeout: 1000 });
  assert.equal(module.saveToStorage(defaults(), startTime), false);
  assert.equal(values.get(saves.SAVE_KEY), '{broken');
});

test('day-seven reward cycle restarts at day one', () => {
  const state = defaults();
  state.lastLoginDate = '2026-10-07';
  state.dailyStreak = 7;
  state.streakClaimedToday = true;
  const restored = saves.restoreProgress(state, defaults(), startTime);
  assert.equal(restored.dailyStreak, 1);
});

test('saves without rotationState are safely upgraded without breaking', () => {
  const legacy = defaults();
  delete legacy.rotationState;
  const restored = saves.restoreProgress(legacy, defaults(), startTime);
  assert.equal(restored.rotationState, null);
  assert.equal(restored.coins, legacy.coins);
});

test('round-trip preserves rotationState windows, quest progress and claims', () => {
  const state = defaults();
  state.rotationState = {
    lastSeenTimestamp: startTime,
    windows: {
      flash: {
        windowId: 10,
        quests: [{
          id: 'q_f_1', templateId: 't1', cadence: 'flash', windowId: 10,
          title: 'Speedy', icon: '⚡', desc: 'Roll 5', actionType: 'roll',
          current: 3, goal: 5, claimed: false, reward: { coins: 1000, materials: 1, energy: 2 }
        }]
      },
      daily: { windowId: 5, quests: [] },
      weekly: { windowId: 1, quests: [] }
    }
  };
  const encoded = saves.encodeSave(state, startTime);
  const restored = saves.decodeSave(encoded, defaults(), startTime);
  assert.ok(restored?.rotationState);
  assert.equal(restored.rotationState.windows.flash.windowId, 10);
  assert.equal(restored.rotationState.windows.flash.quests[0].current, 3);
});

