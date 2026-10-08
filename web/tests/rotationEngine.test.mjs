import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/rotationEngine.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const engine = {};
runInNewContext(compiled.outputText, { exports: engine }, { timeout: 1000 });

test('epoch window calculation aligns to 4h, 24h, and 7d boundaries', () => {
  // 2026-10-08 12:00:00 UTC = 1791460800000
  const t = 1791460800000;
  const flashId = engine.getWindowId('flash', t);
  const dailyId = engine.getWindowId('daily', t);
  const weeklyId = engine.getWindowId('weekly', t);

  assert.equal(typeof flashId, 'number');
  assert.equal(typeof dailyId, 'number');
  assert.equal(typeof weeklyId, 'number');

  // Advancing 3 hours keeps the same daily and weekly, but advancing 4 hours steps flash
  assert.equal(engine.getWindowId('daily', t + 3 * 3600 * 1000), dailyId);
  assert.equal(engine.getWindowId('flash', t + 4 * 3600 * 1000), flashId + 1);
  assert.equal(engine.getWindowId('daily', t + 24 * 3600 * 1000), dailyId + 1);
  assert.equal(engine.getWindowId('weekly', t + 7 * 86400 * 1000), weeklyId + 1);
});

test('window expiry and time remaining format accurately', () => {
  const t = 10000;
  const expiry = engine.getWindowExpiry('flash', 0);
  assert.equal(expiry, 4 * 3600 * 1000);

  const remaining = engine.getTimeRemaining('flash', t, 0);
  assert.equal(remaining.remainingMs, 4 * 3600 * 1000 - 10000);
  assert.match(remaining.formatted, /\d{2}h \d{2}m \d{2}s/);
});

test('deterministic generation produces identical quests for identical inputs', () => {
  const t = 1791460800000;
  const flashId = engine.getWindowId('flash', t);

  const questsA = engine.generateQuestsForWindow('flash', flashId, 0);
  const questsB = engine.generateQuestsForWindow('flash', flashId, 0);

  assert.equal(questsA.length, 2);
  assert.deepEqual(questsA, questsB);
});

test('quests within an active window have unique templates', () => {
  const dailyQuests = engine.generateQuestsForWindow('daily', 100, 0);
  assert.equal(dailyQuests.length, 3);
  const templateIds = dailyQuests.map(q => q.templateId);
  const uniqueTemplates = new Set(templateIds);
  assert.equal(uniqueTemplates.size, 3);
});

test('district scaling increases target and rewards without altering energy', () => {
  const district0 = engine.generateQuestsForWindow('flash', 42, 0);
  const district1 = engine.generateQuestsForWindow('flash', 42, 1);

  assert.equal(district0.length, district1.length);
  for (let i = 0; i < district0.length; i++) {
    const q0 = district0[i];
    const q1 = district1[i];
    assert.equal(q0.templateId, q1.templateId);
    assert.ok(q1.goal >= q0.goal);
    assert.ok(q1.reward.coins >= q0.reward.coins);
    // Energy remains stable to preserve dice pacing
    assert.equal(q1.reward.energy, q0.reward.energy);
  }
});
