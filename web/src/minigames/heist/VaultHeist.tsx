import { useRef, useState } from 'react';
import { tallyPicks, validPicks, type MinigameProps } from '../contracts';

/**
 * Vault Heist — 3×3 grid of nine distinct voxel safes, pick three.
 * Portable: no store imports, no balance writes. Rewards were precommitted
 * by the host and are revealed on choice, never rerolled. Exactly one
 * onComplete call per encounter; repeat taps and double-collects are inert.
 */
export function VaultHeist({ encounter, reducedMotion, onComplete }: MinigameProps) {
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const completedRef = useRef(false);
  const limit = 3;

  const pick = (index: number) => {
    if (finished || picks.includes(index) || picks.length >= limit) return;
    const next = [...picks, index];
    setPicks(next);
    if (reducedMotion) {
      setRevealed(next);
    } else {
      window.setTimeout(() => setRevealed(prev => (prev.includes(index) ? prev : [...prev, index])), 380);
    }
  };

  const quickPick = () => {
    if (finished) return;
    const missing: number[] = [];
    for (let i = 0; i < encounter.options.length && picks.length + missing.length < limit; i++) {
      if (!picks.includes(i) && !missing.includes(i)) missing.push(i);
    }
    const next = [...picks, ...missing];
    setPicks(next);
    setRevealed(next);
  };

  const collect = () => {
    if (completedRef.current || finished) return;
    if (!validPicks('heist', encounter.options.length, picks)) return;
    completedRef.current = true;
    setFinished(true);
    onComplete([...picks]);
  };

  const tally = tallyPicks(encounter.options, picks);
  const done = picks.length >= limit;

  return (
    <div className="bb-mini" role="group" aria-label="Vault heist: open three safes">
      <div className="bb-mini-head">
        <div style={{ fontSize: 44 }} aria-hidden="true">🗝️</div>
        <h2 className="bb-mini-title">Vault Heist</h2>
        <p className="bb-mini-sub">
          Crack <strong>three</strong> of nine safes. Loot is fixed up front — pick the seats you like.
          {picks.length < limit ? ` ${limit - picks.length} left.` : ' Ready to collect!'}
        </p>
      </div>
      <div className="bb-safe-grid">
        {encounter.options.map((safe, i) => {
          const picked = picks.includes(i);
          const shown = revealed.includes(i);
          const order = picks.indexOf(i) + 1;
          return (
            <button
              key={i}
              className="bb-safe"
              data-variant={safe.variant ?? 'brass'}
              data-picked={picked}
              data-revealed={shown}
              disabled={finished || (!picked && done)}
              onClick={() => pick(i)}
              aria-label={safe.label + (picked ? `, picked ${order} of 3` : ', unopened safe')}
              aria-pressed={picked}
            >
              <span className="bb-safe-door" aria-hidden="true">
                <span className="bb-safe-handle" />
                {picked && <span className="bb-safe-order">{order}</span>}
              </span>
              <span className="bb-safe-label">{safe.label}</span>
              <span className="bb-safe-loot" aria-live="polite">
                {shown
                  ? `🪙 ${safe.coins.toLocaleString()}` +
                    (safe.materials ? ` · 🧱 ${safe.materials}` : '') +
                    (safe.energy ? ` · ⚡ ${safe.energy}` : '')
                  : picked ? 'cracking…' : '???'}
              </span>
            </button>
          );
        })}
      </div>
      <div className="bb-mini-tally" role="status" aria-live="polite">
        <span>🪙 {tally.coins.toLocaleString()}</span>
        <span>🧱 {tally.materials}</span>
        <span>⚡ {tally.energy}</span>
        <span style={{ opacity: 0.75 }}>{picks.length}/3 safes</span>
      </div>
      <div className="bb-mini-actions">
        {!done && (
          <button className="bb-control bb-secondary-action" onClick={quickPick}>
            ⚡ Quick pick
          </button>
        )}
        <button
          className="bb-control bb-mini-collect"
          disabled={!done || finished}
          onClick={collect}
        >
          {finished ? '✓ Collected' : done ? `COLLECT ${tally.coins.toLocaleString()} 🪙` : `Pick ${limit - picks.length} more`}
        </button>
      </div>
    </div>
  );
}
