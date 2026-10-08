// Hotkey matcher tests: shortcuts fire on plain keypresses, never inside
// modals, buttons or editable fields, and never double-handle native input.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/hotkeys.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const hotkeys = {};
runInNewContext(compiled.outputText, { exports: hotkeys }, { timeout: 1000 });

const press = (key, extra = {}) => ({ key, targetTag: 'BODY', modalOpen: false, ...extra });

test('space, enter and R roll; M mutes', () => {
  assert.equal(hotkeys.matchHotkey(press(' ')), 'roll');
  assert.equal(hotkeys.matchHotkey(press('Enter')), 'roll');
  assert.equal(hotkeys.matchHotkey(press('r')), 'roll');
  assert.equal(hotkeys.matchHotkey(press('R')), 'roll');
  assert.equal(hotkeys.matchHotkey(press('m')), 'mute');
  assert.equal(hotkeys.matchHotkey(press('M')), 'mute');
  assert.equal(hotkeys.matchHotkey(press('x')), null);
  assert.equal(hotkeys.matchHotkey(press('1')), null);
});

test('modals, buttons and editable fields swallow every shortcut', () => {
  for (const key of [' ', 'Enter', 'r', 'm']) {
    assert.equal(hotkeys.matchHotkey(press(key, { modalOpen: true })), null);
    assert.equal(hotkeys.matchHotkey(press(key, { targetTag: 'BUTTON' })), null);
    assert.equal(hotkeys.matchHotkey(press(key, { targetTag: 'INPUT' })), null);
    assert.equal(hotkeys.matchHotkey(press(key, { targetTag: 'TEXTAREA' })), null);
    assert.equal(hotkeys.matchHotkey(press(key, { targetTag: 'SELECT' })), null);
    // Canvas and body targets keep working.
    assert.notEqual(hotkeys.matchHotkey(press(key, { targetTag: 'CANVAS' })), null);
  }
});
