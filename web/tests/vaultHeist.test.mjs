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
  runInNewContext(compiled.outputText, { exports, window: {}, navigator: {} }, { timeout: 1000 });
  return exports;
}

const contracts = load('../src/minigames/contracts.ts');
const rules = load('../src/game/rollRules.ts');
const sfx = load('../src/services/audio/sfx.ts');

test('vault heist rules generate 9 voxel safes with brass, steel, and crystal tiers', () => {
  const options = rules.encounterOptions('heist', 1, 42);
  assert.equal(options.length, 9);

  // Each tier variant should be present
  const variants = options.map(o => o.variant);
  assert.ok(variants.includes('brass'));
  assert.ok(variants.includes('steel'));
  assert.ok(variants.includes('crystal'));

  // Labels match the vault format
  assert.ok(options.every(o => o.label.includes('Vault')));
  assert.ok(options.every(o => o.coins > 0));
});

test('contracts properly tally combinations of brass, steel and crystal safes', () => {
  const options = rules.encounterOptions('heist', 2, 0);
  const picks = [0, 4, 8];
  const tally = contracts.tallyPicks(options, picks);

  const expectedCoins = options[0].coins + options[4].coins + options[8].coins;
  const expectedMats = options[0].materials + options[4].materials + options[8].materials;
  const expectedEnergy = options[0].energy + options[4].energy + options[8].energy;

  assert.equal(tally.coins, expectedCoins);
  assert.equal(tally.materials, expectedMats);
  assert.equal(tally.energy, expectedEnergy);
});

test('procedural vault audio calls execute cleanly without exceptions in headless environment', () => {
  assert.doesNotThrow(() => sfx.playVaultDial());
  assert.doesNotThrow(() => sfx.playVaultUnlock());
  assert.doesNotThrow(() => sfx.playVaultReward('brass'));
  assert.doesNotThrow(() => sfx.playVaultReward('steel'));
  assert.doesNotThrow(() => sfx.playVaultReward('crystal'));
});
