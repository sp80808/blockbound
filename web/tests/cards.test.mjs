import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./setup-ts.mjs');

const {
  CARD_SETS,
  CARD_DEFS,
  CARD_PITY_LIMIT,
  rollCardDrop,
  setProgress,
  allSetProgress,
  claimableSetRewards,
  sanitizeOwnedCards,
  sanitizeClaimedSets,
  getCard,
  getCardSet
} = await import('../src/game/cards.ts');

/** Deterministic LCG so drop distribution assertions are reproducible. */
function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('defines 3 district-matched sets of 4 unique cards with art paths and fallback glyphs', () => {
  assert.equal(CARD_SETS.length, 3);
  assert.equal(CARD_DEFS.length, 12);

  const ids = new Set(CARD_DEFS.map(c => c.id));
  assert.equal(ids.size, 12, 'card ids are unique');

  for (const set of CARD_SETS) {
    assert.equal(set.cards.length, 4);
    for (const id of set.cards) {
      const card = getCard(id);
      assert.ok(card, `${id} exists`);
      assert.equal(card.setId, set.id);
      assert.ok(card.art.endsWith('.png'));
      assert.ok(card.glyph.length > 0);
      assert.ok(card.palette.length === 3);
    }
  }

  // Exactly one epic and one rare per set, two commons.
  for (const set of CARD_SETS) {
    const rarities = set.cards.map(id => getCard(id).rarity).sort();
    assert.deepEqual(rarities, ['common', 'common', 'epic', 'rare']);
  }
});

test('rollCardDrop never awards an already owned card', () => {
  const owned = ['suburb-baker', 'suburb-gardener', 'candy-gummy', 'neon-ramen'];
  const rng = seededRng(42);
  for (let i = 0; i < 400; i++) {
    const { cardId } = rollCardDrop(rng, owned, i);
    if (cardId === null) continue;
    assert.ok(!owned.includes(cardId), 'no duplicates in drops');
  }
});

test('rollCardDrop respects the pity limit: a guaranteed card after CARD_PITY_LIMIT misses', () => {
  const rng = seededRng(7);
  const result = rollCardDrop(rng, [], CARD_PITY_LIMIT);
  assert.ok(result.cardId !== null, 'pity forces a drop');
  assert.equal(result.forced, true);
});

test('rollCardDrop stays silent before the pity limit when rng misses', () => {
  // rng always draws high: chance check fails, pity not reached.
  const always = () => 0.999;
  assert.equal(rollCardDrop(always, [], 0).cardId, null);
  assert.equal(rollCardDrop(always, [], CARD_PITY_LIMIT - 1).cardId, null);
});

test('rollCardDrop returns null when every card is owned', () => {
  const all = CARD_DEFS.map(c => c.id);
  const result = rollCardDrop(() => 0, all, 999);
  assert.equal(result.cardId, null);
});

test('epic cards are rarer than commons over many seeded drops', () => {
  const rng = seededRng(1234);
  const counts = { common: 0, rare: 0, epic: 0 };
  let owned = [];
  for (let i = 0; i < 3000; i++) {
    const { cardId } = rollCardDrop(rng, owned, 0);
    if (!cardId) continue;
    // Only count first-observation moments; re-own after each drop to keep the pool full.
    counts[getCard(cardId).rarity]++;
    owned = [];
  }
  assert.ok(counts.common > counts.rare, `common ${counts.common} > rare ${counts.rare}`);
  assert.ok(counts.rare > counts.epic, `rare ${counts.rare} > epic ${counts.epic}`);
  assert.ok(counts.common > counts.epic * 2, 'commons at least twice epics');
});

test('setProgress and claimableSetRewards track completion and one-shot claims', () => {
  const set = CARD_SETS[0];
  assert.deepEqual(setProgress(set.id, []), { setId: set.id, owned: 0, total: 4, complete: false });
  assert.deepEqual(setProgress(set.id, set.cards.slice(0, 3)).owned, 3);
  assert.equal(setProgress(set.id, set.cards).complete, true);

  const owned = [...set.cards];
  assert.equal(claimableSetRewards(owned, []).length, 1);
  assert.equal(claimableSetRewards(owned, [set.id]).length, 0);
});

test('allSetProgress covers every set', () => {
  const progress = allSetProgress(['suburb-baker']);
  assert.equal(progress.length, 3);
  assert.deepEqual(progress.map(p => p.owned), [1, 0, 0]);
});

test('sanitizers reject unknown ids, duplicates and non-arrays', () => {
  assert.deepEqual(sanitizeOwnedCards(['suburb-baker', 'suburb-baker', 'nope', 42, null]), ['suburb-baker']);
  assert.deepEqual(sanitizeOwnedCards('baker'), []);
  assert.deepEqual(sanitizeClaimedSets(['candy-harbour', 'candy-harbour', 'ghost']), ['candy-harbour']);
  assert.deepEqual(sanitizeClaimedSets(undefined), []);
});

test('unknown id lookups return null', () => {
  assert.equal(getCard('suburb-nope'), null);
  assert.equal(getCardSet('suburb-nope'), null);
});
