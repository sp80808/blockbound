import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

// We load rotationEngine and questDispatcher
const rotEnginePath = fileURLToPath(new URL('../src/game/rotationEngine.ts', import.meta.url));
const rotEngineCompiled = ts.transpileModule(readFileSync(rotEnginePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const rotEngine = {};
runInNewContext(rotEngineCompiled.outputText, { exports: rotEngine }, { timeout: 1000 });

const dispatcherPath = fileURLToPath(new URL('../src/game/questDispatcher.ts', import.meta.url));
const dispatcherCompiled = ts.transpileModule(readFileSync(dispatcherPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const dispatcher = {};
runInNewContext(dispatcherCompiled.outputText, {
  exports: dispatcher,
  require: (mod) => {
    if (mod.includes('rotationEngine')) return rotEngine;
    throw new Error(`Unexpected require: ${mod}`);
  }
}, { timeout: 1000 });

test('initial rotation state creates valid flash, daily, and weekly windows', () => {
  const t = 1791460800000;
  const state = dispatcher.createInitialRotationState(t, 0);

  assert.equal(state.lastSeenTimestamp, t);
  assert.equal(state.windows.flash.quests.length, 2);
  assert.equal(state.windows.daily.quests.length, 3);
  assert.equal(state.windows.weekly.quests.length, 1);
  assert.equal(dispatcher.countClaimableQuests(state), 0);
});

test('dispatching quest action advances matching active quests and clamps at goal', () => {
  const t = 1791460800000;
  let state = dispatcher.createInitialRotationState(t, 0);

  // Find a quest that requires 'roll' or force one
  state.windows.flash.quests[0].actionType = 'roll';
  state.windows.flash.quests[0].current = 0;
  state.windows.flash.quests[0].goal = 10;
  state.windows.flash.quests[0].claimed = false;

  state = dispatcher.dispatchQuestAction(state, 'roll', 4);
  assert.equal(state.windows.flash.quests[0].current, 4);

  // Dispatch more than remaining to ensure clamping at goal
  state = dispatcher.dispatchQuestAction(state, 'roll', 10);
  assert.equal(state.windows.flash.quests[0].current, 10);

  // Completed quest is now claimable
  assert.equal(dispatcher.countClaimableQuests(state), 1);
});

test('claiming a completed quest pays reward once and sets claimed flag', () => {
  const t = 1791460800000;
  let state = dispatcher.createInitialRotationState(t, 0);
  const targetQuest = state.windows.flash.quests[0];
  targetQuest.current = targetQuest.goal;

  const claimResult = dispatcher.claimQuest(state, 'flash', targetQuest.id);
  assert.ok(claimResult);
  assert.ok(claimResult.reward.coins > 0);
  assert.equal(claimResult.state.windows.flash.quests[0].claimed, true);

  // Repeat claim is rejected
  const repeat = dispatcher.claimQuest(claimResult.state, 'flash', targetQuest.id);
  assert.equal(repeat, null);
});

test('window turnover auto-collects completed unclaimed rewards and refreshes quests', () => {
  const t = 1791460800000;
  let state = dispatcher.createInitialRotationState(t, 0);

  // Complete flash quest 0 without claiming it
  state.windows.flash.quests[0].current = state.windows.flash.quests[0].goal;
  state.windows.flash.quests[0].claimed = false;
  const expectedRewardCoins = state.windows.flash.quests[0].reward.coins;

  // Incomplete flash quest 1 has 50% progress
  state.windows.flash.quests[1].current = Math.floor(state.windows.flash.quests[1].goal / 2);

  // Advance time by 4 hours + 1 ms to trigger flash turnover
  const nextTime = t + (4 * 3600 * 1000) + 1;
  const turnover = dispatcher.checkAndTurnoverWindows(state, nextTime, 0);

  assert.ok(turnover.autoCollectedReward);
  assert.equal(turnover.autoCollectedReward.coins, expectedRewardCoins);

  // Flash window stepped forward and generated fresh quests
  assert.equal(turnover.state.windows.flash.windowId, state.windows.flash.windowId + 1);
  assert.equal(turnover.state.windows.flash.quests.length, 2);
  assert.ok(turnover.state.windows.flash.quests.every(q => q.current === 0 && !q.claimed));

  // Daily window did not turn over (24h has not elapsed)
  assert.equal(turnover.state.windows.daily.windowId, state.windows.daily.windowId);
});

test('clock rollback does not cause turnover or regress lastSeenTimestamp', () => {
  const t = 1791460800000;
  let state = dispatcher.createInitialRotationState(t, 0);

  // Attempt time travel backwards by 1 hour
  const turnover = dispatcher.checkAndTurnoverWindows(state, t - 3600000, 0);
  assert.equal(turnover.autoCollectedReward, null);
  assert.equal(turnover.state.lastSeenTimestamp, t);
});
