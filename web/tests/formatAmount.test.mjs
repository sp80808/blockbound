import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';

const path = fileURLToPath(new URL('../src/game/formatAmount.ts', import.meta.url));
const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
const formatter = {};
runInNewContext(compiled.outputText, { exports: formatter }, { timeout: 1000 });

test('formatCompactAmount keeps useful precision with uppercase K/M/B suffixes', () => {
  const cases = [
    [950, '950'],
    [999, '999'],
    [1_000, '1K'],
    [12_500, '12.5K'],
    [13_750, '13.8K'],
    [125_000, '125K'],
    [999_999, '1M'],
    [1_276_500, '1.28M'],
    [10_000_000, '10M'],
    [125_000_000, '125M']
  ];

  for (const [value, expected] of cases) {
    assert.equal(formatter.formatCompactAmount(value), expected);
  }
});

test('formatCompactAmount preserves signs and truncates fractional resources', () => {
  assert.equal(formatter.formatCompactAmount(-13_750), '-13.8K');
  assert.equal(formatter.formatCompactAmount(999.9), '999');
});
