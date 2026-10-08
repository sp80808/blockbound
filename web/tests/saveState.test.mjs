// Test the production TypeScript persistence module without adding a second runner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const file = fileURLToPath(new URL('../src/game/saveState.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const save = {};
runInNewContext(compiled.outputText, { exports: save }, { timeout: 1000 });
const NOW = Date.UTC(2026, 9, 8, 12);

function fixture(overrides = {}) {
  return {
    coins: 35000, materials: 16, energy: 35, maxEnergy: 50,
    shields: 2, maxShields: 3, currentTile: 0, multiplier: 1,
    currentDistrict: 0,
    districts: [{
      id: 0, name: 'Sunny Suburb', subtitle: 'Village',
      buildings: Array.from({ length: 5 }, (_, i) => ({
        id: 'b' + i, name: 'Building', icon: '🏠',
        tier: 0, baseCost: 100, baseMats: 2, damaged: false
      }))
    }],
    dailyStreak: 1, lastLoginDate: '2026-10-08', streakClaimedToday: false,
    totalRolls: 0, momentum: 0, pendingEncounter: null, pendingReward: null,
    autoOkay: true, autoAdjustMultiplier: true, autoBatchSize: 5, isTurbo: false,
    ...overrides
  };
}
function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

test('settled checkpoint roundtrips without roll animation or auto-spend state', () => {
  const mem = storage();
  const data = fixture();
  assert.equal(save.writeProgress(mem, data, NOW), true);
  const restored = save.readProgress(mem, NOW);
  assert.equal(restored.data.coins, 35000);
  assert.equal(restored.data.districts[0].buildings.length, 5);
  assert.equal(restored.data.streakClaimedToday, false);
  assert.ok(!mem.getItem(save.SAVE_KEY).includes('isRolling'));
  assert.ok(!mem.getItem(save.SAVE_KEY).includes('autoRolling'));
});

test('offline energy increments at 45 seconds and caps at max', () => {
  const mem = storage();
  save.writeProgress(mem, fixture({ energy: 20 }), NOW - 90_000);
  assert.equal(save.readProgress(mem, NOW).data.energy, 22);
  assert.equal(save.readProgress(mem, NOW + 10_000_000).data.energy, 50);
});

test('partial regeneration remainder survives rehydration', () => {
  const mem = storage();
  save.writeProgress(mem, fixture({ energy: 20 }), NOW - 70_000);
  const result = save.readProgress(mem, NOW);
  assert.equal(result.data.energy, 21);
  assert.equal(result.lastEnergyAt, NOW - 25_000);
});

test('rejects corrupted, overcap and invalid transaction-like encounter data', () => {
  assert.equal(save.validProgress(fixture({ coins: -1 })), false);
  assert.equal(save.validProgress(fixture({ energy: 999 })), false);
  assert.equal(save.validProgress(fixture({ currentTile: 33 })), false);
  assert.equal(save.validProgress(fixture({ pendingEncounter: { id: 1, kind: 'raid', multiplier: 1, options: [] } })), false);
  const mem = storage();
  mem.setItem(save.SAVE_KEY, '{');
  assert.equal(save.readProgress(mem, NOW), null);
});

test('streak claim resumes once per UTC day and resets after missed days', () => {
  const mem = storage();
  save.writeProgress(mem, fixture({ dailyStreak: 3, lastLoginDate: '2026-10-07', streakClaimedToday: true }), NOW);
  const next = save.readProgress(mem, NOW);
  assert.equal(next.data.dailyStreak, 4);
  assert.equal(next.data.streakClaimedToday, false);
  save.writeProgress(mem, fixture({ dailyStreak: 3, lastLoginDate: '2026-10-08', streakClaimedToday: true }), NOW);
  assert.equal(save.readProgress(mem, NOW).data.streakClaimedToday, true);
});

test('storage is optional and quota/permission errors are safe', () => {
  const bad = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  assert.equal(save.readProgress(bad, NOW), null);
  assert.equal(save.writeProgress(bad, fixture(), NOW), false);
  assert.equal(save.readProgress(undefined, NOW), null);
});
