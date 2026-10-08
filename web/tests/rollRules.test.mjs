// Lightweight tests using the installed TypeScript package and built-in node:test.
// Does not require a second test runner or compile the whole React application.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/rollRules.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const rules = {};
runInNewContext(compiled.outputText, { exports: rules }, { timeout: 1000 });

test('board is 32 tiles with the expected key event spaces', () => {
  assert.equal(rules.BOARD_TILES.length, 32);
  assert.equal(rules.BOARD_TILES[0], 'go');
  assert.equal(rules.BOARD_TILES[6], 'raid');
  assert.equal(rules.BOARD_TILES[8], 'heist');
  assert.equal(rules.BOARD_TILES[16], 'jackpot');
});

test('board movement wraps and never skips a step', () => {
  assert.deepEqual(Array.from(rules.boardPath(29, 6)), [30, 31, 0, 1, 2, 3]);
  assert.deepEqual(Array.from(rules.boardPath(0, 0)), []);
  assert.throws(() => rules.boardPath(0, -1));
});

test('multiplier list only offers affordable dice costs', () => {
  assert.deepEqual(Array.from(rules.allowedMultipliers(0)), []);
  assert.deepEqual(Array.from(rules.allowedMultipliers(5)), [1, 2, 3, 5]);
  assert.deepEqual(Array.from(rules.allowedMultipliers(11)), [1, 2, 3, 5, 10]);
  assert.equal(rules.nextMultiplier(5, 5), 1);
  assert.equal(rules.nextMultiplier(2, 11), 3);
});

test('auto multipliers adapt to remaining energy or spending budget', () => {
  assert.equal(rules.affordableAutoMultiplier(20, 5, false), null);
  assert.equal(rules.affordableAutoMultiplier(20, 5, true), 5);
  assert.equal(rules.affordableAutoMultiplier(20, 0, true), null);
  assert.equal(rules.affordableAutoMultiplier(10, 10, false), 10);
});

test('roll progress guarantees blocks and pays exact five/ten-roll milestones', () => {
  assert.deepEqual({ ...rules.rollProgressReward(1) }, { materials: 1, energy: 0, shields: 0 });
  assert.deepEqual({ ...rules.rollProgressReward(5) }, { materials: 4, energy: 0, shields: 0 });
  assert.deepEqual({ ...rules.rollProgressReward(10) }, { materials: 4, energy: 8, shields: 1 });
  assert.throws(() => rules.rollProgressReward(0));
});

test('building upgrade costs preserve tier boundaries in one shared rule', () => {
  const building = { baseCost: 8000, baseMats: 3, tier: 0 };
  assert.deepEqual({ ...rules.buildingUpgradeCost(building) }, { coins: 8000, materials: 3 });
  assert.deepEqual(
    { ...rules.buildingUpgradeCost({ ...building, tier: 3 }) },
    { coins: 44000, materials: 9 }
  );
  assert.throws(() => rules.buildingUpgradeCost({ ...building, tier: -1 }));
  assert.throws(() => rules.buildingUpgradeCost({ ...building, tier: 5 }));
});

test('tile rewards scale standard coin/material rewards, not shields/energy', () => {
  assert.equal(rules.tileReward(1, 5, 1, 2).coins, 17500);
  assert.equal(rules.tileReward(2, 5, 1, 2).materials, 20);
  assert.equal(rules.tileReward(4, 5, 1, 2).shields, 1);
  assert.equal(rules.tileReward(7, 5, 1, 2).energy, 8);
  assert.equal(rules.tileReward(16, 3, 1, 2).coins, 150000);
  assert.equal(rules.tileReward(6, 5, 1, 2).encounter, 'raid');
  assert.equal(rules.tileReward(8, 5, 1, 2).encounter, 'heist');
  assert.equal(rules.tileReward(10, 2, 2, 2).materials, 12);
  assert.throws(() => rules.tileReward(32, 1, 1, 2));
});

test('dice rolls can be deterministically replayed', () => {
  const draws = [0, 0.999999, 0.5, 0.5];
  const rng = () => draws.shift();
  const first = rules.rollPair(rng);
  assert.equal(first.die1, 1);
  assert.equal(first.die2, 6);
  assert.equal(first.total, 7);
  assert.equal(first.doubles, false);
  const second = rules.rollPair(rng);
  assert.equal(second.die1, 4);
  assert.equal(second.die2, 4);
  assert.equal(second.doubles, true);
  assert.throws(() => rules.rollPair(() => 1));
});
