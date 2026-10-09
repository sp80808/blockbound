import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

await import('./setup-ts.mjs');

const { DistrictGroundMaterial, ShockwaveMaterial } = await import('../src/game/shaders.ts');
const confettiService = await import('../src/services/fx/confetti.ts');

test('DistrictGroundMaterial and ShockwaveMaterial export correctly with valid uniforms', () => {
  assert.ok(DistrictGroundMaterial, 'DistrictGroundMaterial is exported');
  assert.ok(ShockwaveMaterial, 'ShockwaveMaterial is exported');

  // Instantiate materials to verify constructor and uniform initialization
  const groundMat = new DistrictGroundMaterial();
  assert.ok(groundMat.uniforms, 'groundMat has uniforms map');
  assert.ok('uTime' in groundMat.uniforms, 'groundMat has uTime uniform');
  assert.ok('uDistrict' in groundMat.uniforms, 'groundMat has uDistrict uniform');
  assert.ok('uBaseColor' in groundMat.uniforms, 'groundMat has uBaseColor uniform');
  assert.ok('uAccentColor' in groundMat.uniforms, 'groundMat has uAccentColor uniform');
  assert.ok('uReducedMotion' in groundMat.uniforms, 'groundMat has uReducedMotion uniform');

  const shockMat = new ShockwaveMaterial();
  assert.ok(shockMat.uniforms, 'shockMat has uniforms map');
  assert.ok('uProgress' in shockMat.uniforms, 'shockMat has uProgress uniform');
  assert.ok('uColor' in shockMat.uniforms, 'shockMat has uColor uniform');
  assert.ok('uGlowColor' in shockMat.uniforms, 'shockMat has uGlowColor uniform');
});

test('confetti service functions execute without crashing in headless environment', () => {
  assert.doesNotThrow(() => {
    confettiService.fireConfettiBurst({ x: 0.5, y: 0.5, particleCount: 10 });
  });

  assert.doesNotThrow(() => {
    confettiService.fireJackpotCelebration();
  });

  assert.doesNotThrow(() => {
    confettiService.fireDistrictCompleteCelebration();
  });
});

test('VoxelScene.tsx wires procedural shaders and instanced particles', () => {
  const voxelScenePath = resolve(process.cwd(), 'src/components/VoxelScene.tsx');
  const code = readFileSync(voxelScenePath, 'utf8');

  assert.ok(code.includes('DistrictGroundMaterial'), 'VoxelScene uses DistrictGroundMaterial');
  assert.ok(code.includes('ShockwaveMaterial'), 'VoxelScene uses ShockwaveMaterial');
  assert.ok(code.includes('instancedMesh'), 'VoxelScene uses instancedMesh for HopLandingParticles');
  assert.ok(code.includes('ProceduralGround'), 'VoxelScene renders ProceduralGround');
});
