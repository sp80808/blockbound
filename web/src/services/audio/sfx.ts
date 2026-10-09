/**
 * Procedural one-shot sound effects — no audio assets, no licences, no network.
 * A single lazy AudioContext; muted mode is truly silent. Callers in the
 * store/UI never await audio and gameplay never depends on it.
 */

let ctx: AudioContext | null = null;
let enabled = true;
let activeVoices = 0;
const lastPlay: Record<string, number> = {};

const MAX_VOICES = 6;
const MIN_INTERVAL_MS = 70;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    try {
      void ctx?.suspend();
    } catch {
      /* audio unavailable — gameplay continues silently */
    }
  } else {
    try {
      void ctx?.resume();
    } catch {
      /* ignore */
    }
  }
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Throttled single oscillator blip with an exponential decay envelope. */
function blip(
  name: string,
  frequency: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gain = 0.12,
  delaySec = 0,
  slideTo?: number
): void {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (now - (lastPlay[name] ?? -1000) < MIN_INTERVAL_MS) return;
  lastPlay[name] = now;
  if (activeVoices >= MAX_VOICES) return;
  const context = ac();
  if (!context) return;
  try {
    activeVoices += 1;
    const start = context.currentTime + delaySec;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, frequency), start);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + durationSec);
    }
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
    osc.connect(amp);
    amp.connect(context.destination);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
    osc.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1);
      osc.disconnect();
      amp.disconnect();
    };
  } catch {
    activeVoices = Math.max(0, activeVoices - 1);
  }
}

/** Vibration only fires when sound/buzz is on and the device supports it. */
export function buzz(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* haptics unavailable */
  }
}

export function playClick(): void {
  blip('click', 660, 0.05, 'square', 0.05);
}

export function playRoll(): void {
  blip('roll-a', 320, 0.07, 'triangle', 0.1, 0, 140);
  blip('roll-b', 260, 0.07, 'triangle', 0.1, 0.08, 110);
}

export function playDiceLand(): void {
  blip('land', 150, 0.09, 'triangle', 0.14, 0, 80);
}

export function playCoins(): void {
  blip('coin-a', 880, 0.1, 'sine', 0.11);
  blip('coin-b', 1318, 0.14, 'sine', 0.11, 0.07);
}

export function playBuild(): void {
  blip('build-a', 220, 0.06, 'square', 0.08);
  blip('build-b', 220, 0.06, 'square', 0.08, 0.09);
  blip('build-c', 330, 0.1, 'square', 0.08, 0.18);
}

export function playShield(): void {
  blip('shield', 420, 0.16, 'sawtooth', 0.07, 0, 240);
}

export function playError(): void {
  blip('error', 160, 0.12, 'square', 0.07);
}

/** Short rising arpeggio for jackpots, streaks and grand milestones. */
export function playFanfare(): void {
  const notes = [523, 659, 784, 1046];
  notes.forEach((frequency, i) => {
    blip('fanfare-' + i, frequency, 0.14, 'triangle', 0.12, i * 0.09);
  });
  buzz(35);
}

/** Tactile per-tile hop sound with gentle rising pitch progression across consecutive steps. */
export function playHop(stepRatio = 0): void {
  const baseFreq = 260 + Math.min(180, stepRatio * 180);
  blip('hop', baseFreq, 0.065, 'triangle', 0.09, 0, baseFreq * 1.35);
}

/** Subtle tactile thud when landing firmly on a diorama tile. */
export function playTileLand(): void {
  blip('tile-land', 130, 0.05, 'sine', 0.07, 0, 70);
}

/** Rapid ratchet/tumbler clicks while combination dial spins. */
export function playVaultDial(): void {
  blip('vault-dial-1', 940, 0.03, 'square', 0.06);
  blip('vault-dial-2', 1180, 0.03, 'square', 0.05, 0.07);
  blip('vault-dial-3', 1420, 0.03, 'square', 0.05, 0.15);
  buzz([15, 20, 15]);
}

/** Heavy mechanical clunk when safe bolt throws and latch opens. */
export function playVaultUnlock(): void {
  // Low metallic bolt thud
  blip('vault-thud', 90, 0.14, 'triangle', 0.18, 0, 42);
  // Metallic latch snap / release
  blip('vault-latch', 640, 0.08, 'square', 0.1, 0.03, 310);
  buzz(35);
}

/** Dopamine reward pop when loot erupts from an opened vault. */
export function playVaultReward(variant?: 'brass' | 'steel' | 'crystal'): void {
  if (variant === 'crystal') {
    blip('vault-loot-c1', 880, 0.1, 'sine', 0.12);
    blip('vault-loot-c2', 1174, 0.12, 'triangle', 0.12, 0.06);
    blip('vault-loot-c3', 1568, 0.18, 'sine', 0.14, 0.12);
    blip('vault-loot-c4', 2093, 0.22, 'sine', 0.15, 0.18);
    buzz([20, 30, 40]);
  } else if (variant === 'steel') {
    blip('vault-loot-s1', 784, 0.1, 'sine', 0.11);
    blip('vault-loot-s2', 1046, 0.14, 'triangle', 0.12, 0.07);
    blip('vault-loot-s3', 1318, 0.18, 'sine', 0.12, 0.14);
    buzz([20, 30]);
  } else {
    playCoins();
    buzz(25);
  }
}

