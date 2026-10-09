import confetti from 'canvas-confetti';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isReducedMotion(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Standard celebratory multi-color burst */
export function fireConfettiBurst(options?: { x?: number; y?: number; particleCount?: number }) {
  if (!isBrowser() || isReducedMotion()) return;
  const origin = {
    x: options?.x ?? 0.5,
    y: options?.y ?? 0.55
  };

  confetti({
    particleCount: options?.particleCount ?? 45,
    spread: 65,
    origin,
    colors: ['#ffd166', '#06b6d4', '#10b981', '#f472b6', '#6366f1'],
    disableForReducedMotion: true,
    zIndex: 9999
  });
}

/** High-energy golden shower for Jackpot landings and major heist payouts */
export function fireJackpotCelebration() {
  if (!isBrowser() || isReducedMotion()) return;
  const end = Date.now() + 850;
  const colors = ['#fde047', '#fbbf24', '#f59e0b', '#ffffff'];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
      zIndex: 9999
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
      zIndex: 9999
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

/** Grand finale burst when completing all landmarks on an island / district */
export function fireDistrictCompleteCelebration() {
  if (!isBrowser() || isReducedMotion()) return;
  // Side cannons
  confetti({
    particleCount: 60,
    angle: 60,
    spread: 70,
    origin: { x: 0.1, y: 0.6 },
    colors: ['#10b981', '#34d399', '#fde047', '#38bdf8'],
    zIndex: 9999
  });
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 70,
    origin: { x: 0.9, y: 0.6 },
    colors: ['#10b981', '#34d399', '#fde047', '#38bdf8'],
    zIndex: 9999
  });
  // Center blast after a slight delay
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#ffd166', '#f472b6', '#6366f1', '#06b6d4', '#ffffff'],
      zIndex: 9999
    });
  }, 180);
}
