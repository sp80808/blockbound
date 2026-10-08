import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

await import('./setup-ts.mjs');

const { useGameStore, initialDistricts } = await import('../src/store/gameStore.ts');
const {
  DISTRICT_BOARD_THEMES,
  getDistrictBoardTheme
} = await import('../src/components/VoxelScene.tsx');

test('defines 3 visually distinct 3D board themes for all districts', () => {
  assert.equal(DISTRICT_BOARD_THEMES.length, 3);

  const [suburb, candy, neon] = DISTRICT_BOARD_THEMES;

  // Ground colors should be distinctly tailored to each district theme
  assert.equal(suburb.groundColor, '#7bb6a0', 'Sunny Suburb has green manicured grass');
  assert.equal(candy.groundColor, '#f48db6', 'Candy Harbour has strawberry icing ground');
  assert.equal(neon.groundColor, '#1a1738', 'Neon Metropolis has dark tech plaza ground');

  // Foundation chassis colors should differ
  assert.notEqual(suburb.foundationColor, candy.foundationColor);
  assert.notEqual(candy.foundationColor, neon.foundationColor);
  assert.notEqual(suburb.foundationColor, neon.foundationColor);

  // Tree foliage colors should be themed (evergreen vs candy floss vs holographic)
  assert.equal(suburb.treeFoliageLower, '#3aa885');
  assert.equal(candy.treeFoliageLower, '#f472b6');
  assert.equal(neon.treeFoliageLower, '#06b6d4');

  // Lamp posts should be themed
  assert.equal(suburb.lampPost, '#334155');
  assert.equal(candy.lampPost, '#e11d48');
  assert.equal(neon.lampPost, '#0b0a14');

  // Atmosphere fog & ambient lighting should be themed
  assert.equal(suburb.fogColor, '#101f3a');
  assert.equal(candy.fogColor, '#4a044e');
  assert.equal(neon.fogColor, '#060412');
});

test('getDistrictBoardTheme gracefully wraps modulo for any district index', () => {
  assert.deepEqual(getDistrictBoardTheme(0), DISTRICT_BOARD_THEMES[0]);
  assert.deepEqual(getDistrictBoardTheme(1), DISTRICT_BOARD_THEMES[1]);
  assert.deepEqual(getDistrictBoardTheme(2), DISTRICT_BOARD_THEMES[2]);
  assert.deepEqual(getDistrictBoardTheme(3), DISTRICT_BOARD_THEMES[0]);
  assert.deepEqual(getDistrictBoardTheme(4), DISTRICT_BOARD_THEMES[1]);
  assert.deepEqual(getDistrictBoardTheme(5), DISTRICT_BOARD_THEMES[2]);
});

test('GameFeel.css declares dynamic CSS variables for all three districts and consumes them', () => {
  const cssPath = resolve(process.cwd(), 'src/components/GameFeel.css');
  const css = readFileSync(cssPath, 'utf8');

  // Check selectors exist
  assert.ok(css.includes('.bb-shell[data-district="0"]'), 'District 0 styling exists');
  assert.ok(css.includes('.bb-shell[data-district="1"]'), 'District 1 styling exists');
  assert.ok(css.includes('.bb-shell[data-district="2"]'), 'District 2 styling exists');

  // Check accents match districts
  assert.ok(css.includes('--district-accent: #10b981'), 'District 0 emerald accent');
  assert.ok(css.includes('--district-accent: #f472b6'), 'District 1 candy pink accent');
  assert.ok(css.includes('--district-accent: #06b6d4'), 'District 2 neon cyan accent');

  // Check resource and controls inherit district variables
  assert.ok(css.includes('background:var(--district-card-bg)'), 'Resources consume district card bg');
  assert.ok(css.includes('background:var(--district-controls-bg)'), 'Controls consume district controls bg');
  assert.ok(css.includes('background:var(--district-roll-btn-bg)'), 'Roll button consumes district roll btn bg');
});

test('gameStore travel and setDistrict update the currentDistrict', () => {
  useGameStore.setState({
    currentDistrict: 0,
    unlockedDistricts: [0, 1, 2],
    isRolling: false,
    districts: structuredClone(initialDistricts)
  });

  assert.equal(useGameStore.getState().currentDistrict, 0);

  // Switch to Candy Harbour
  useGameStore.getState().setDistrict(1);
  assert.equal(useGameStore.getState().currentDistrict, 1);

  // Switch to Neon Metropolis
  useGameStore.getState().setDistrict(2);
  assert.equal(useGameStore.getState().currentDistrict, 2);

  // Switching to 0 returns back
  useGameStore.getState().setDistrict(0);
  assert.equal(useGameStore.getState().currentDistrict, 0);
});
