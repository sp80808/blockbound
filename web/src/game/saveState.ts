/** Offline-only, versioned save protocol for the Blockbound web prototype.
 * Store gameplay checkpoints, never animation timers, running auto-play, or derived visuals.
 */
export const SAVE_KEY = 'blockbound.web.progress.v1';
export const SAVE_VERSION = 1 as const;
export const REGEN_INTERVAL_MS = 45_000;
export const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1_000;

export interface SavedBuilding {
  id: string; name: string; icon: string; tier: number;
  baseCost: number; baseMats: number; damaged: boolean;
}
export interface SavedDistrict {
  id: number; name: string; subtitle: string; buildings: SavedBuilding[];
}
export interface SavedEncounter {
  id: number; kind: 'raid' | 'heist'; multiplier: number;
  options: { label: string; coins: number }[];
}
export interface ProgressData {
  coins: number; materials: number; energy: number; maxEnergy: number;
  shields: number; maxShields: number; currentTile: number; multiplier: number;
  currentDistrict: number; districts: SavedDistrict[];
  dailyStreak: number; lastLoginDate: string; streakClaimedToday: boolean;
  totalRolls: number; momentum: number;
  pendingEncounter: SavedEncounter | null;
  pendingReward: { title: string; detail: string } | null;
  autoOkay: boolean; autoAdjustMultiplier: boolean; autoBatchSize: 5 | 10 | 25;
  isTurbo: boolean;
}
export interface SaveEnvelope { version: 1; lastEnergyAt: number; data: ProgressData }

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const integer = (n: unknown, max: number, min = 0): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const text = (n: unknown, max = 200): n is string =>
  typeof n === 'string' && n.length > 0 && n.length <= max;
const record = (n: unknown): n is Record<string, unknown> =>
  typeof n === 'object' && n !== null && !Array.isArray(n);
const flag = (n: unknown): n is boolean => typeof n === 'boolean';
const date = (n: unknown): n is string =>
  typeof n === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(n) &&
  !Number.isNaN(Date.parse(n + 'T00:00:00Z'));
const multiplier = (n: unknown) => [1, 2, 3, 5, 10, 20, 50, 100].includes(n as number);

function validDistrict(d: unknown): d is SavedDistrict {
  if (!record(d) || !integer(d.id, 100) || !text(d.name) || !text(d.subtitle, 400) || !Array.isArray(d.buildings) || d.buildings.length !== 5) return false;
  const ids = new Set<string>();
  return d.buildings.every((b: unknown) => {
    if (!record(b) || !text(b.id) || ids.has(b.id) || !text(b.name) ||
        !text(b.icon, 32) || !integer(b.tier, 4) || !integer(b.baseCost, 1e9, 1) ||
        !integer(b.baseMats, 10000) || !flag(b.damaged)) return false;
    ids.add(b.id); return true;
  });
}

function validEncounter(e: unknown): e is SavedEncounter {
  if (!record(e) || !integer(e.id, 1e9, 1) ||
      (e.kind !== 'raid' && e.kind !== 'heist') || !multiplier(e.multiplier) ||
      !Array.isArray(e.options) || e.options.length < 2 || e.options.length > 9) return false;
  return e.options.every((o: unknown) => record(o) && text(o.label) && integer(o.coins, 1e10));
}

export function validProgress(d: unknown): d is ProgressData {
  if (!record(d) || !integer(d.coins, 1e12) || !integer(d.materials, 1e8) ||
      !integer(d.maxEnergy, 10000, 1) || !integer(d.energy, d.maxEnergy as number) ||
      !integer(d.maxShields, 100, 1) || !integer(d.shields, d.maxShields as number) ||
      !integer(d.currentTile, 31) || !multiplier(d.multiplier) ||
      !integer(d.currentDistrict, 100) || !Array.isArray(d.districts) ||
      d.districts.length < 1 || d.districts.length > 30 ||
      !d.districts.every(validDistrict) || d.currentDistrict >= d.districts.length ||
      !integer(d.dailyStreak, 7, 1) || !date(d.lastLoginDate) ||
      !flag(d.streakClaimedToday) || !integer(d.totalRolls, 1e9) ||
      !integer(d.momentum, 4) || !flag(d.autoOkay) || !flag(d.autoAdjustMultiplier) ||
      ![5, 10, 25].includes(d.autoBatchSize as number) || !flag(d.isTurbo)) return false;
  const encounter = d.pendingEncounter;
  const reward = d.pendingReward;
  return (encounter === null || validEncounter(encounter)) &&
    (reward === null || (record(reward) && text(reward.title) && text(reward.detail, 1000))) &&
    !(encounter !== null && reward !== null);
}

/** Rehydrate only a settled checkpoint; energy replenishes while offline. */
export function readProgress(storage: KeyValueStorage | undefined, now = Date.now()): SaveEnvelope | null {
  if (!storage) return null;
  try {
    const serialized = storage.getItem(SAVE_KEY);
    if (!serialized || serialized.length > 200_000) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (!record(parsed) || parsed.version !== SAVE_VERSION ||
        !integer(parsed.lastEnergyAt, Number.MAX_SAFE_INTEGER) || !validProgress(parsed.data)) return null;
    const d = parsed.data;
    const elapsed = Math.min(MAX_OFFLINE_MS, Math.max(0, now - parsed.lastEnergyAt));
    const ticks = Math.floor(elapsed / REGEN_INTERVAL_MS);
    const energy = Math.min(d.maxEnergy, d.energy + ticks);
    const lastEnergyAt = energy >= d.maxEnergy ? now : parsed.lastEnergyAt + ticks * REGEN_INTERVAL_MS;
    const today = new Date(now).toISOString().slice(0, 10);
    const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);
    const claimedToday = d.streakClaimedToday && d.lastLoginDate === today;
    const canContinue = d.streakClaimedToday && d.lastLoginDate === yesterday;
    const streak = claimedToday ? d.dailyStreak : canContinue ? (d.dailyStreak % 7) + 1 : 1;
    return {
      version: SAVE_VERSION, lastEnergyAt,
      data: {
        ...d, energy, dailyStreak: streak,
        streakClaimedToday: claimedToday, lastLoginDate: claimedToday ? d.lastLoginDate : today
      }
    };
  } catch {
    return null; // blocked localStorage, malformed JSON or future schema
  }
}

/** Caller must omit intermediate isRolling state; only settled states are checkpoints. */
export function writeProgress(storage: KeyValueStorage | undefined, data: ProgressData, lastEnergyAt: number): boolean {
  if (!storage || !validProgress(data) || !integer(lastEnergyAt, Number.MAX_SAFE_INTEGER)) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, lastEnergyAt, data }));
    return true;
  } catch {
    return false; // quota exceeded / privacy restrictions
  }
}
