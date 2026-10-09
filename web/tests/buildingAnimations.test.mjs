import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

await import('./setup-ts.mjs');

test('VoxelScene.tsx features glowing windows with night/theme responsiveness and idle flicker', () => {
  const voxelScenePath = resolve(process.cwd(), 'src/components/VoxelScene.tsx');
  const code = readFileSync(voxelScenePath, 'utf8');

  // Must export or define GlowingWindows / WindowSet component
  assert.ok(
    code.includes('GlowingWindows') || code.includes('BuildingWindows'),
    'VoxelScene defines GlowingWindows or BuildingWindows component'
  );

  // Must include night/ambient responsive emissive color or intensity calculation
  assert.ok(
    code.includes('isNight') || code.includes('nightIntensity') || code.includes('windowGlow'),
    'VoxelScene has night-sensitive window glow calculation'
  );

  // Must include organic idle flicker or pulse in useFrame
  assert.ok(
    code.includes('window') && code.includes('flicker'),
    'VoxelScene incorporates subtle flicker or pulse on glowing windows'
  );
});

test('VoxelScene.tsx spins windmill blades from tier 1 with wind gusts and damage handling', () => {
  const voxelScenePath = resolve(process.cwd(), 'src/components/VoxelScene.tsx');
  const code = readFileSync(voxelScenePath, 'utf8');

  // Windmill blades must render starting at tier >= 1 instead of tier >= 2
  assert.ok(
    code.includes('isWindmill && tier >= 1'),
    'Windmill blades are rendered starting from Tier 1'
  );

  // WindmillBlades must handle damaged state (stall/creak)
  assert.ok(
    code.includes('damaged') && code.includes('WindmillBlades'),
    'WindmillBlades accepts or handles damaged state'
  );

  // WindmillBlades must have wind gust variation or speed modulation
  assert.ok(
    code.includes('sin(') || code.includes('Math.sin'),
    'Windmill rotation incorporates dynamic wind variation'
  );
});

test('VoxelScene.tsx includes town idle micro-animations (clock, bakery hearth, fountain)', () => {
  const voxelScenePath = resolve(process.cwd(), 'src/components/VoxelScene.tsx');
  const code = readFileSync(voxelScenePath, 'utf8');

  // Town Hall clock hands or idle weathervane
  assert.ok(
    code.includes('ClockHands') || code.includes('ClockTower') || code.includes('clockHand'),
    'VoxelScene includes Town Hall clock/tower idle animation'
  );

  // Bakery hearth glow or oven warmth
  assert.ok(
    code.includes('BakeryHearth') || code.includes('hearthGlow') || code.includes('OvenGlow'),
    'VoxelScene includes Bakery hearth/oven idle glow'
  );

  // Central park fountain water animation
  assert.ok(
    code.includes('FountainWater') || code.includes('fountainGeyser') || code.includes('waterPulse'),
    'VoxelScene includes Central Park animated fountain'
  );

  // Reduced motion guard
  assert.ok(
    code.includes('reducedMotion()'),
    'VoxelScene safeguards idle animations with reducedMotion'
  );
});
