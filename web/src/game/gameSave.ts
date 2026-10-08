/**
 * Offline prototype save format.
 * No secrets, transactions for paid products or trusted online balances belong here.
 * The loader restores only known IDs and bounded primitive values.
 */
export const SAVE_KEY = 'blockbound:web:save:v1';
export const SAVE_VERSION = 1;
export const ENERGY_REFILL_MS = 45_000;

export interface SavedBuilding { id: string; tier: number; damaged: boolean }
export interface SavedDistrict { id: number; buildings: SavedBuilding[] }
export interface SavedRoll { id: number; die1: number; die2: number; total: number; multiplier: number; doubles: boolean }
export interface SavedEncounter {
  id: number; kind: 'raid' | 'heist'; multiplier: number;
  options: { label: string; coins: number }[];
}
export interface SavedReward { title: string; detail: string }
export interface ProgressSnapshot {
  coins: number; materials: number; energy: number; maxEnergy: number;
  shields: number; maxShields: number; currentTile: number; multiplier: number;
  currentDistrict: number;
  districts: SavedDistrict[];
  dailyStreak: number; lastLoginDate: string; streakClaimedToday: boolean;
  totalRolls: number; momentum: number; lastRoll: SavedRoll | null;
  pendingEncounter: SavedEncounter | null; pendingReward: SavedReward | null;
  autoOkay: boolean; autoAdjustMultiplier: boolean; autoBatchSize: 5 | 10 | 25;
  isTurbo: boolean; energyUpdatedAt: number;
}

type SaveEnvelope = { version: number; savedAt: number; progress: ProgressSnapshot };

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function numberIn(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
    ? value : fallback;
}
function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
function parseDay(s: unknown): number | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00.000Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? d.getTime() : null;
}
function today(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function refillEnergy(energy: number, cap: number, anchor: number, now: number):
  { energy: number; energyUpdatedAt: number } {
  if (!Number.isFinite(anchor) || anchor < 0 || anchor > now ||
      !Number.isFinite(now) || now < 0) return { energy, energyUpdatedAt: now };
  if (energy >= cap) return { energy: cap, energyUpdatedAt: now };
  const elapsed = Math.max(0, now - anchor);
  const gained = Math.min(cap - energy, Math.floor(elapsed / ENERGY_REFILL_MS));
  const next = energy + gained;
  return {
    energy: next,
    energyUpdatedAt: next === cap ? now : anchor + gained * ENERGY_REFILL_MS
  };
}

export function refreshStreak(progress: ProgressSnapshot, now: number): ProgressSnapshot {
  const current = today(now);
  if (current === progress.lastLoginDate) return progress;
  const previous = parseDay(progress.lastLoginDate);
  const currentDay = parseDay(current);
  if (previous === null || currentDay === null || previous > currentDay) {
    return { ...progress, lastLoginDate: current, dailyStreak: 1, streakClaimedToday: false };
  }
  const days = Math.floor((currentDay - previous) / 86_400_000);
  return {
    ...progress,
    dailyStreak: days === 1 && progress.streakClaimedToday ? (progress.dailyStreak === 7 ? 1 : progress.dailyStreak + 1) : 1,
    lastLoginDate: current,
    streakClaimedToday: false
  };
}

function checkedRoll(value: unknown): SavedRoll | null {
  const r = object(value);
  if (!r) return null;
  const die1 = numberIn(r.die1, 0, 1, 6);
  const die2 = numberIn(r.die2, 0, 1, 6);
  const id = numberIn(r.id, 0, 1, 100_000_000);
  const multiplier = numberIn(r.multiplier, 0, 1, 100);
  if (!id || !die1 || !die2 || !multiplier || r.total !== die1 + die2) return null;
  return { id, die1, die2, total: die1 + die2, multiplier, doubles: die1 === die2 };
}

function checkedEncounter(value: unknown, rollId: number | undefined): SavedEncounter | null {
  const e = object(value);
  if (!e || e.id !== rollId || (e.kind !== 'raid' && e.kind !== 'heist') ||
      !Array.isArray(e.options) || e.options.length !== 3) return null;
  const options = e.options.map(o => object(o)).filter((o): o is Record<string, unknown> => !!o);
  if (options.length !== 3 || !options.every(o => typeof o.label === 'string' &&
      o.label.length <= 64 && typeof o.coins === 'number' &&
      Number.isSafeInteger(o.coins) && o.coins >= 0 && o.coins <= 10_000_000)) return null;
  return {
    id: e.id as number, kind: e.kind as 'raid' | 'heist',
    multiplier: numberIn(e.multiplier, 1, 1, 100),
    options: options.map(o => ({ label: o.label as string, coins: o.coins as number }))
  };
}
function checkedReward(value: unknown): SavedReward | null {
  const r = object(value);
  if (!r || typeof r.title !== 'string' || r.title.length > 96 ||
      typeof r.detail !== 'string' || r.detail.length > 300) return null;
  return { title: r.title, detail: r.detail };
}

/** Pure validation and hydration; neither function reads the browser's storage. */
export function restoreProgress(raw: unknown, defaults: ProgressSnapshot, now: number): ProgressSnapshot {
  const source = object(raw);
  if (!source) return defaults;
  const cap = defaults.maxEnergy;
  const coins = numberIn(source.coins, defaults.coins, 0, 1_000_000_000_000);
  const materials = numberIn(source.materials, defaults.materials, 0, 1_000_000_000);
  const energy = numberIn(source.energy, defaults.energy, 0, cap);
  const shieldCap = defaults.maxShields;
  const totalRolls = numberIn(source.totalRolls, 0, 0, 100_000_000);
  const lastRoll = checkedRoll(source.lastRoll);
  const sourceDistricts = Array.isArray(source.districts) ? source.districts : [];
  const districts = defaults.districts.map(d => {
    const old = sourceDistricts.map(object).find(candidate => candidate?.id === d.id);
    const oldBuildings = Array.isArray(old?.buildings) ? old.buildings : [];
    return {
      id: d.id,
      buildings: d.buildings.map(b => {
        const previous = oldBuildings.map(object).find(o => o?.id === b.id);
        return {
          id: b.id,
          tier: numberIn(previous?.tier, b.tier, 0, 4),
          damaged: bool(previous?.damaged, b.damaged)
        };
      })
    };
  });
  const date = typeof source.lastLoginDate === 'string' && parseDay(source.lastLoginDate) !== null
    ? source.lastLoginDate : defaults.lastLoginDate;
  const maxEnergy = defaults.maxEnergy;
  const energyUpdatedAt = numberIn(source.energyUpdatedAt, now, 0, Number.MAX_SAFE_INTEGER);
  let result: ProgressSnapshot = {
    coins, materials, energy, maxEnergy,
    shields: numberIn(source.shields, defaults.shields, 0, shieldCap),
    maxShields: shieldCap,
    currentTile: numberIn(source.currentTile, defaults.currentTile, 0, 31),
    multiplier: [1, 2, 3, 5, 10, 20, 50, 100].includes(source.multiplier as number)
      ? source.multiplier as number : 1,
    currentDistrict: numberIn(source.currentDistrict, 0, 0, districts.length - 1),
    districts,
    dailyStreak: numberIn(source.dailyStreak, 1, 1, 7),
    lastLoginDate: date,
    streakClaimedToday: bool(source.streakClaimedToday, false),
    totalRolls,
    momentum: totalRolls % 5,
    lastRoll: lastRoll && lastRoll.id <= totalRolls ? lastRoll : null,
    pendingEncounter: checkedEncounter(source.pendingEncounter, lastRoll?.id),
    pendingReward: checkedReward(source.pendingReward),
    autoOkay: bool(source.autoOkay, defaults.autoOkay),
    autoAdjustMultiplier: bool(source.autoAdjustMultiplier, defaults.autoAdjustMultiplier),
    autoBatchSize: source.autoBatchSize === 5 || source.autoBatchSize === 10 || source.autoBatchSize === 25
      ? source.autoBatchSize : 5,
    isTurbo: bool(source.isTurbo, defaults.isTurbo),
    energyUpdatedAt
  };
  result = refreshStreak(result, now);
  const filled = refillEnergy(result.energy, cap, result.energyUpdatedAt, now);
  result.energy = filled.energy;
  result.energyUpdatedAt = filled.energyUpdatedAt;
  return result;
}

export function encodeSave(progress: ProgressSnapshot, now: number): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, progress };
  return JSON.stringify(envelope);
}
export function decodeSave(json: string, defaults: ProgressSnapshot, now: number): ProgressSnapshot | null {
  try {
    if (json.length > 64_000) return null;
    const parsed = object(JSON.parse(json));
    if (!parsed || parsed.version !== SAVE_VERSION || !object(parsed.progress)) return null;
    return restoreProgress(parsed.progress, defaults, now);
  } catch { return null; }
}

/** Browser-adapter wrappers; safe when unavailable (private browsing, storage quotas, SSR). */
export function loadFromStorage(defaults: ProgressSnapshot, now = Date.now()): ProgressSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_KEY);
    return raw === null ? null : decodeSave(raw, defaults, now);
  } catch { return null; }
}
export function saveToStorage(progress: ProgressSnapshot, now = Date.now()): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(SAVE_KEY, encodeSave(progress, now));
    return true;
  } catch { return false; }
}
