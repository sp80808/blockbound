/**
 * Collectible card album — pure, deterministic rules.
 * The store owns randomness (Math.random) and persistence; this module decides
 * *what* a drop means, how sets complete, and what completion pays out.
 * Rendering and timers never re-roll or rerank cards.
 */

export type CardRarity = 'common' | 'rare' | 'epic';

export interface CardDefinition {
  id: string;
  name: string;
  setId: string;
  rarity: CardRarity;
  /** PNG under web/public/cards/; missing art falls back to the voxel portrait. */
  art: string;
  /** Emoji glyph for the procedural fallback portrait and compact HUD chips. */
  glyph: string;
  blurb: string;
  /** Primary voxel palette, shared by fallback art, rarity glow and confetti. */
  palette: [string, string, string];
}

export interface CardSetDefinition {
  id: string;
  name: string;
  districtId: number;
  tagline: string;
  cards: string[];
  reward: { coins: number; materials: number; energy: number; shields: number };
  rewardLabel: string;
}

/** 3 sets of 4 — one per district. Completion pays a curated haul. */
export const CARD_SETS: readonly CardSetDefinition[] = [
  {
    id: 'sunny-suburb',
    name: 'Sunny Suburb Locals',
    districtId: 0,
    tagline: 'The friendly faces keeping the village sweet.',
    cards: ['suburb-baker', 'suburb-gardener', 'suburb-windmill', 'suburb-mayor'],
    reward: { coins: 120000, materials: 18, energy: 25, shields: 1 },
    rewardLabel: '🏡 Suburb Patron: +120k 🪙 · +18 🧱 · +25⚡ · +1 🛡️'
  },
  {
    id: 'candy-harbour',
    name: 'Candy Harbour Crew',
    districtId: 1,
    tagline: 'Chewy citizens of the pastel piers.',
    cards: ['candy-gummy', 'candy-lollipop', 'candy-choco', 'candy-cotton'],
    reward: { coins: 260000, materials: 30, energy: 35, shields: 1 },
    rewardLabel: '🍬 Sugar Baron: +260k 🪙 · +30 🧱 · +35⚡ · +1 🛡️'
  },
  {
    id: 'neon-metropolis',
    name: 'Neon Metropolis Bots',
    districtId: 2,
    tagline: 'Midnight-market machines with heart.',
    cards: ['neon-ramen', 'neon-dj', 'neon-turbo', 'neon-tagger'],
    reward: { coins: 480000, materials: 48, energy: 50, shields: 2 },
    rewardLabel: '🌃 Neon Legend: +480k 🪙 · +48 🧱 · +50⚡ · +2 🛡️'
  }
];

export const CARD_DEFS: readonly CardDefinition[] = [
  {
    id: 'suburb-baker', name: 'Bready Baker', setId: 'sunny-suburb', rarity: 'common',
    art: 'suburb-baker.jpg', glyph: '🥖',
    blurb: 'Opens the ovens before the rooster wakes.',
    palette: ['#fbbf24', '#f59e0b', '#78350f']
  },
  {
    id: 'suburb-gardener', name: 'Bloom Gardener', setId: 'sunny-suburb', rarity: 'common',
    art: 'suburb-gardener.jpg', glyph: '🌻',
    blurb: 'Talks to sunflowers. They answer.',
    palette: ['#a3e635', '#22c55e', '#14532d']
  },
  {
    id: 'suburb-windmill', name: 'Windmill Whiz', setId: 'sunny-suburb', rarity: 'rare',
    art: 'suburb-windmill.jpg', glyph: '🌾',
    blurb: 'Rides the wheat-field gusts on a paper pinwheel.',
    palette: ['#38bdf8', '#0ea5e9', '#0c4a6e']
  },
  {
    id: 'suburb-mayor', name: 'Mayor Blobsworth', setId: 'sunny-suburb', rarity: 'epic',
    art: 'suburb-mayor.jpg', glyph: '🎩',
    blurb: 'Officiates every ribbon-cutting with a brass band.',
    palette: ['#f472b6', '#db2777', '#831843']
  },
  {
    id: 'candy-gummy', name: 'Gummy Guard', setId: 'candy-harbour', rarity: 'common',
    art: 'candy-gummy.jpg', glyph: '🐻',
    blurb: 'Bounces the pier. Guards the gumdrop vault.',
    palette: ['#fca5a5', '#f43f5e', '#881337']
  },
  {
    id: 'candy-lollipop', name: 'Lolli Twirl', setId: 'candy-harbour', rarity: 'common',
    art: 'candy-lollipop.png', glyph: '🍭',
    blurb: 'Dances on the seaboard in a swirl of sugar.',
    palette: ['#f0abfc', '#d946ef', '#701a75']
  },
  {
    id: 'candy-choco', name: 'Choco Chef', setId: 'candy-harbour', rarity: 'rare',
    art: 'candy-choco.png', glyph: '🍫',
    blurb: 'Tempers fountains of dark couverture.',
    palette: ['#d97706', '#92400e', '#451a03']
  },
  {
    id: 'candy-cotton', name: 'Cotton Cloud', setId: 'candy-harbour', rarity: 'epic',
    art: 'candy-cotton.png', glyph: '☁️',
    blurb: 'Sleeps on the candy sunset, dreams in syrup.',
    palette: ['#fbcfe8', '#f472b6', '#9d174d']
  },
  {
    id: 'neon-ramen', name: 'Ramen Bot 3000', setId: 'neon-metropolis', rarity: 'common',
    art: 'neon-ramen.png', glyph: '🍜',
    blurb: 'Steams noodles and gossip in equal measure.',
    palette: ['#fb923c', '#ea580c', '#7c2d12']
  },
  {
    id: 'neon-dj', name: 'Deckz 9000', setId: 'neon-metropolis', rarity: 'rare',
    art: 'neon-dj.png', glyph: '🎧',
    blurb: 'Drops beats harder than the market drops prices.',
    palette: ['#a78bfa', '#8b5cf6', '#4c1d95']
  },
  {
    id: 'neon-turbo', name: 'Turbo Courier', setId: 'neon-metropolis', rarity: 'common',
    art: 'neon-turbo.png', glyph: '🛴',
    blurb: 'Delivers noodles across town in ninety seconds.',
    palette: ['#22d3ee', '#06b6d4', '#155e75']
  },
  {
    id: 'neon-tagger', name: 'Neon Tagger', setId: 'neon-metropolis', rarity: 'epic',
    art: 'neon-tagger.png', glyph: '🎨',
    blurb: 'Paints holograms the rain cannot wash away.',
    palette: ['#f0abfc', '#c026d3', '#4a044e']
  }
];

const CARDS_BY_ID = new Map(CARD_DEFS.map(card => [card.id, card]));
const SETS_BY_ID = new Map(CARD_SETS.map(set => [set.id, set]));

export function getCard(id: string): CardDefinition | null {
  return CARDS_BY_ID.get(id) ?? null;
}
export function getCardSet(id: string): CardSetDefinition | null {
  return SETS_BY_ID.get(id) ?? null;
}
export function totalCardCount(): number {
  return CARD_DEFS.length;
}

/** Rarity drop weights; dupe protection means only unowned cards are eligible. */
const RARITY_WEIGHTS: Record<CardRarity, number> = { common: 68, rare: 24, epic: 8 };

/** Rolls without a card before a guaranteed drop. Never punishes dry spells. */
export const CARD_PITY_LIMIT = 15;
/** Base chance a roll awards any card. */
export const CARD_ROLL_CHANCE = 0.1;

export interface CardDropDecision {
  /** Awarded card id, or null when nothing drops. */
  cardId: string | null;
  /** True when pity forced the drop. */
  forced: boolean;
}

/**
 * Decides a roll drop. Pure: pass an rng (tests inject a seeded LCG).
 * Never returns a card the player already owns; when the picked set is fully
 * owned the drop converts to nothing rather than repeating a dupe.
 */
export function rollCardDrop(
  rng: () => number,
  owned: readonly string[],
  rollsSinceDrop: number,
  chance: number = CARD_ROLL_CHANCE,
  pityLimit: number = CARD_PITY_LIMIT
): CardDropDecision {
  const ownedSet = new Set(owned);
  const unowned = CARD_DEFS.filter(card => !ownedSet.has(card.id));
  if (unowned.length === 0) return { cardId: null, forced: false };

  const missStreak = Math.max(0, Number.isFinite(rollsSinceDrop) ? Math.floor(rollsSinceDrop) : 0);
  const forced = missStreak >= Math.max(1, pityLimit);
  if (!forced && rng() >= chance) return { cardId: null, forced: false };

  // Pick a rarity by weight, then a random unowned card of that rarity.
  // If the chosen rarity is fully owned, cascade down to the next weight.
  const order: CardRarity[] = ['epic', 'rare', 'common'];
  const roll = rng() * 100;
  let acc = 0;
  let rarity: CardRarity = 'common';
  for (const candidate of order) {
    acc += RARITY_WEIGHTS[candidate];
    if (roll <= acc) { rarity = candidate; break; }
  }
  let pool = unowned.filter(card => card.rarity === rarity);
  if (pool.length === 0) {
    for (const candidate of order) {
      pool = unowned.filter(card => card.rarity === candidate);
      if (pool.length > 0) break;
    }
  }
  if (pool.length === 0) return { cardId: null, forced: false };
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return { cardId: pool[index].id, forced };
}

export interface SetProgress {
  setId: string;
  owned: number;
  total: number;
  complete: boolean;
}

export function setProgress(setId: string, owned: readonly string[]): SetProgress {
  const set = SETS_BY_ID.get(setId);
  if (!set) return { setId, owned: 0, total: 0, complete: false };
  const ownedSet = new Set(owned);
  const ownedCount = set.cards.filter(id => ownedSet.has(id)).length;
  return {
    setId,
    owned: ownedCount,
    total: set.cards.length,
    complete: ownedCount >= set.cards.length
  };
}

export function allSetProgress(owned: readonly string[]): SetProgress[] {
  return CARD_SETS.map(set => setProgress(set.id, owned));
}

/** Sets that are complete but whose reward has not been claimed yet. */
export function claimableSetRewards(owned: readonly string[], claimed: readonly string[]): CardSetDefinition[] {
  const claimedSet = new Set(claimed);
  return CARD_SETS.filter(set =>
    setProgress(set.id, owned).complete && !claimedSet.has(set.id)
  );
}

export function isKnownCardId(id: unknown): id is string {
  return typeof id === 'string' && CARDS_BY_ID.has(id);
}

/** Filters restored save data down to real, bounded card ids. */
export function sanitizeOwnedCards(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isKnownCardId))].slice(0, CARD_DEFS.length);
}
export function sanitizeClaimedSets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(CARD_SETS.map(set => set.id));
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))].slice(0, CARD_SETS.length);
}
