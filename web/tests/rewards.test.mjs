// Deterministic tests for the expanded reward layer and minigame contracts.
// Same lightweight harness as the other web tests: transpile TS, run in a VM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

function load(relativePath) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const exports = {};
  runInNewContext(compiled.outputText, { exports }, { timeout: 1000 });
  return exports;
}

const rules = load('../src/game/rollRules.ts');
const contracts = load('../src/minigames/contracts.ts');

test('mystery outcomes are deterministic from committed dice', () => {
  assert.equal(rules.mysteryOutcome(1, 1, 5).coins, 110000);
  assert.equal(rules.mysteryOutcome(6, 6, 2).coins, 44000);
  assert.equal(rules.mysteryOutcome(3, 4, 1).energy, 12);
  assert.equal(rules.mysteryOutcome(1, 2, 3).materials, 18);
  const aegis = rules.mysteryOutcome(5, 5, 2);
  assert.equal(aegis.shields, 1);
  assert.equal(aegis.coins, 8000);
  assert.equal(rules.mysteryOutcome(2, 3, 2).coins, 24000);
  const cache = rules.mysteryOutcome(4, 4, 2);
  assert.equal(cache.coins, 12000);
  assert.equal(cache.materials, 4);
  assert.throws(() => rules.mysteryOutcome(1, 1, 0));
});

test('passing GO pays a small bonus without double-paying the landing', () => {
  assert.deepEqual(Array.from(rules.boardPath(29, 6)), [30, 31, 0, 1, 2, 3]);
  // Passing through GO mid-path pays; landing exactly on GO is the tile bonus.
  assert.equal(rules.passGoCount([30, 31, 0, 1, 2, 3]), 1);
  assert.equal(rules.passGoCount([29, 30, 31, 0]), 0);
  assert.equal(rules.passGoCount([31, 0, 1, 2]), 1);
  assert.equal(rules.passGoCount([]), 0);
  const pass = rules.passGoReward(1, 5);
  assert.equal(pass.coins, 25000);
  assert.equal(pass.energy, 2);
  const none = rules.passGoReward(0, 5);
  assert.equal(none.coins, 0);
  assert.equal(none.energy, 0);
  assert.throws(() => rules.passGoReward(-1, 5));
});

test('shielded engines charge dice only when touching GO', () => {
  assert.equal(rules.goShieldCharge(0, true), 0);
  assert.equal(rules.goShieldCharge(2, true), 4);
  assert.equal(rules.goShieldCharge(3, true), 6);
  assert.equal(rules.goShieldCharge(3, false), 0);
  assert.equal(rules.goShieldCharge(0, false), 0);
  assert.throws(() => rules.goShieldCharge(-1, true));
});

test('doubles streaks escalate without RNG', () => {  const zero = rules.doublesBonus(0, 5);
  assert.equal(zero.coins + zero.energy + zero.shields, 0);
  const first = rules.doublesBonus(1, 5);
  assert.equal(first.energy, 10);
  assert.equal(first.coins, 0);
  const second = rules.doublesBonus(2, 5);
  assert.equal(second.coins, 40000);
  assert.equal(second.energy, 10);
  const third = rules.doublesBonus(3, 1);
  assert.equal(third.shields, 1);
  assert.equal(third.coins, 12000);
  assert.throws(() => rules.doublesBonus(-1, 1));
});

test('raid offers one shielded target; heist offers nine distinct safes', () => {
  const raid = rules.encounterOptions('raid', 2, 7);
  assert.equal(raid.length, 3);
  assert.equal(raid.filter(o => o.shielded).length, 1);
  const blocked = raid.find(o => o.shielded);
  assert.ok(blocked.coins < 32000);
  assert.ok(raid.every(o => o.coins > 0 && o.materials >= 0 && o.energy >= 0));

  const heistA = rules.encounterOptions('heist', 1, 0);
  const heistB = rules.encounterOptions('heist', 1, 1);
  assert.equal(heistA.length, 9);
  assert.equal(new Set(heistA.map(o => o.label)).size, 9);
  assert.deepEqual(
    Array.from(heistA.map(o => o.variant)),
    ['brass', 'steel', 'crystal', 'brass', 'steel', 'crystal', 'brass', 'steel', 'crystal']
  );
  // Rotation moves the best seat: same EV family, different layout.
  assert.notDeepEqual(heistA.map(o => o.coins), heistB.map(o => o.coins));
  assert.deepEqual(
    [...heistA.map(o => o.coins)].sort((a, b) => a - b),
    [...heistB.map(o => o.coins)].sort((a, b) => a - b)
  );
  assert.throws(() => rules.encounterOptions('raid', 0, 1));
});

test('minigame contracts tally once and enforce pick limits', () => {
  const options = [
    { label: 'A', coins: 1000, materials: 2, energy: 0 },
    { label: 'B', coins: 2000, materials: 0, energy: 4 },
    { label: 'C', coins: 3000, materials: 1, energy: 0 }
  ];
  const tally = contracts.tallyPicks(options, [0, 2]);
  assert.equal(tally.coins, 4000);
  assert.equal(tally.materials, 3);
  assert.equal(tally.energy, 0);
  assert.equal(contracts.validPicks('raid', 3, [1]), true);
  assert.equal(contracts.validPicks('raid', 3, [0, 1]), false);
  assert.equal(contracts.validPicks('heist', 9, [0, 4, 8]), true);
  assert.equal(contracts.validPicks('heist', 9, [0, 0, 4]), false);
  assert.equal(contracts.validPicks('heist', 9, [0, 4]), false);
  assert.equal(contracts.validPicks('heist', 9, [0, 4, 99]), false);
});
