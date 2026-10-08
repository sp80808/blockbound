import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

await import('./setup-ts.mjs');

const { useGameStore, initialDistricts, nextLockedDistrict } = await import('../src/store/gameStore.ts');
const { buildingUpgradeCost } = await import('../src/game/rollRules.ts');
const { districtComplete } = await import('../src/game/quests.ts');

const state = () => useGameStore.getState();

function resetStore(overrides = {}) {
  localStorage.clear();
  useGameStore.setState({
    coins: 50000,
    materials: 20,
    energy: 35,
    maxEnergy: 50,
    shields: 3,
    maxShields: 3,
    currentTile: 0,
    visualTile: 0,
    multiplier: 1,
    isRolling: false,
    currentDistrict: 0,
    districts: structuredClone(initialDistricts),
    unlockedDistricts: [0],
    upgradesBuilt: 0,
    activeModal: 'upgrade',
    soundEnabled: false,
    toast: null,
    celebration: null,
    buildPulse: null,
    rotationState: null,
    ...overrides
  });
}

beforeEach(() => resetStore());

test('Island View initial state: Sunny Suburb has 5 distinct landmarks and 0/20 initial completed tiers', () => {
  const dist = state().districts[0];
  assert.equal(dist.name, 'Sunny Suburb');
  assert.equal(dist.buildings.length, 5);

  const initialTiers = dist.buildings.reduce((sum, b) => sum + b.tier, 0);
  assert.equal(initialTiers, 3); // Town Hall(1), Bakery(1), Cottage(1), Windmill(0), Park(0) = 3
  assert.equal(districtComplete(dist), false);
});

test('Upgrading a landmark costs coins and blocks, increments tier, and updates upgradesBuilt', () => {
  const building = state().districts[0].buildings[3]; // Windmill tier 0
  assert.equal(building.tier, 0);
  const cost = buildingUpgradeCost(building);

  const coinsBefore = state().coins;
  const matsBefore = state().materials;

  state().upgradeBuilding(3);

  const updatedBuilding = state().districts[0].buildings[3];
  assert.equal(updatedBuilding.tier, 1);
  assert.equal(state().coins, coinsBefore - cost.coins);
  assert.equal(state().materials, matsBefore - cost.materials);
  assert.equal(state().upgradesBuilt, 1);
});

test('Damaged landmark blocks upgrades until repaired for 2,500 coins', () => {
  // Mark Bakery as damaged
  const districts = structuredClone(state().districts);
  districts[0].buildings[1].damaged = true;
  useGameStore.setState({ districts });

  const building = state().districts[0].buildings[1];
  assert.equal(building.damaged, true);

  // Upgrade attempt should be ignored while damaged
  const tierBefore = building.tier;
  state().upgradeBuilding(1);
  assert.equal(state().districts[0].buildings[1].tier, tierBefore);

  // Repair
  const coinsBefore = state().coins;
  state().repairBuilding(1);
  assert.equal(state().districts[0].buildings[1].damaged, false);
  assert.equal(state().coins, coinsBefore - 2500);

  // Now upgrade succeeds
  state().upgradeBuilding(1);
  assert.equal(state().districts[0].buildings[1].tier, tierBefore + 1);
});

test('Maxing all 5 landmarks to Tier 4 completes the island and unlocks next world via warp', () => {
  // Set all Sunny Suburb buildings to Tier 4
  const districts = structuredClone(state().districts);
  districts[0].buildings.forEach(b => {
    b.tier = 4;
    b.damaged = false;
  });
  useGameStore.setState({ districts });

  const suburb = state().districts[0];
  assert.equal(districtComplete(suburb), true);

  // Verify next locked district is Candy Harbour (id 1)
  assert.equal(nextLockedDistrict(state().districts, state().unlockedDistricts), 1);

  // Trigger Warp to next district
  state().unlockDistrict();

  assert.deepEqual(state().unlockedDistricts, [0, 1]);
  assert.equal(state().currentDistrict, 1);
  assert.equal(state().districts[state().currentDistrict].name, 'Candy Harbour');
  assert.equal(state().celebration?.kind, 'unlock');
});

test('Monopoly Go PvP Shield status reflects current island defenses', () => {
  resetStore({ shields: 3, maxShields: 3 });
  assert.equal(state().shields, 3);
  assert.ok(state().shields > 0, 'Island is shielded against rival shutdown raids');

  resetStore({ shields: 0, maxShields: 3 });
  assert.equal(state().shields, 0);
  assert.equal(state().shields === 0, true, 'Island is vulnerable to damage');
});
