// Quest board logic: progress derivation, claim validation, district gating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/quests.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const quests = {};
runInNewContext(compiled.outputText, { exports: quests }, { timeout: 1000 });

const fresh = () => ({
  totalRolls: 0, doublesTotal: 0, upgradesBuilt: 0,
  raidsCompleted: 0, heistsCompleted: 0, jackpotsHit: 0
});

test('new players see six locked quests with zero progress', () => {
  const views = quests.questViews(fresh(), []);
  assert.equal(views.length, 6);
  assert.ok(views.every(v => v.state === 'locked' && v.have === 0 && !v.complete));
});

test('progress derives from lifetime counters and claims validate once', () => {
  const counters = { ...fresh(), totalRolls: 25, doublesTotal: 3, upgradesBuilt: 3,
    raidsCompleted: 1, heistsCompleted: 0, jackpotsHit: 1 };
  const states = Object.fromEntries(quests.questViews(counters, []).map(v => [v.def.id, v.state]));
  assert.equal(states.q_warm_dice, 'claimable');
  assert.equal(states.q_high_roller, 'claimable');
  assert.equal(states.q_lucky_pair, 'claimable');
  assert.equal(states.q_builder, 'claimable');
  assert.equal(states.q_raider_robber, 'locked');
  assert.equal(states.q_jackpot_joy, 'claimable');

  const def = quests.validateClaim('q_warm_dice', counters, []);
  assert.equal(def.id, 'q_warm_dice');
  assert.equal(def.reward.coins, 5000);
  // Unknown ids, incomplete goals and repeat claims are all rejected.
  assert.equal(quests.validateClaim('q_nope', counters, []), null);
  assert.equal(quests.validateClaim('q_raider_robber', counters, []), null);
  assert.equal(quests.validateClaim('q_warm_dice', counters, ['q_warm_dice']), null);
});

test('raider quest needs both a raid and a heist', () => {
  const one = { ...fresh(), raidsCompleted: 2, heistsCompleted: 0 };
  const both = { ...fresh(), raidsCompleted: 1, heistsCompleted: 1 };
  assert.equal(quests.validateClaim('q_raider_robber', one, []), null);
  assert.equal(quests.validateClaim('q_raider_robber', both, [])?.id, 'q_raider_robber');
});

test('claimable list drives the HUD badge', () => {
  const counters = { ...fresh(), totalRolls: 5 };
  assert.deepEqual(
    Array.from(quests.claimableQuests(counters, []).map(q => q.id)),
    ['q_warm_dice']
  );
  assert.deepEqual(Array.from(quests.claimableQuests(counters, ['q_warm_dice'])), []);
});

test('districts complete only when every plot hits max tier', () => {
  assert.equal(quests.districtComplete({ buildings: [] }), false);
  assert.equal(quests.districtComplete({ buildings: [{ tier: 4 }, { tier: 4 }] }), true);
  assert.equal(quests.districtComplete({ buildings: [{ tier: 4 }, { tier: 3 }] }), false);
  assert.equal(quests.districtComplete({ buildings: [{ tier: 0 }] }), false);
});
