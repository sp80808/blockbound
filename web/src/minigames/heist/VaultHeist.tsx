import { useRef, useState } from 'react';
import { tallyPicks, validPicks, type MinigameProps } from '../contracts';
import {
  playVaultDial,
  playVaultUnlock,
  playVaultReward,
  playFanfare,
  playCoins,
  playClick
} from '../../services/audio/sfx';

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
    const safe = encounter.options[index];

    if (reducedMotion) {
      setRevealed(next);
      playVaultUnlock();
      playVaultReward(safe?.variant);
      if (next.length >= limit) {
        window.setTimeout(() => playFanfare(), 180);
      }
    } else {
      playVaultDial();
      window.setTimeout(() => {
        setRevealed(prev => {
          if (prev.includes(index)) return prev;
          const updated = [...prev, index];
          playVaultUnlock();
          playVaultReward(safe?.variant);
          if (updated.length >= limit) {
            window.setTimeout(() => playFanfare(), 320);
          }
          return updated;
        });
      }, 420);
    }
  };

  const quickPick = () => {
    if (finished) return;
    const missing: number[] = [];
    for (let i = 0; i < encounter.options.length && picks.length + missing.length < limit; i++) {
      if (!picks.includes(i) && !missing.includes(i)) missing.push(i);
    }
    if (missing.length === 0) return;

    if (reducedMotion) {
      const next = [...picks, ...missing];
      setPicks(next);
      setRevealed(next);
      playVaultUnlock();
      playCoins();
      playFanfare();
      return;
    }

    const next = [...picks, ...missing];
    setPicks(next);
    playVaultDial();

    missing.forEach((idx, offset) => {
      window.setTimeout(() => {
        setRevealed(prev => {
          if (prev.includes(idx)) return prev;
          const updated = [...prev, idx];
          const s = encounter.options[idx];
          playVaultUnlock();
          playVaultReward(s?.variant);
          if (updated.length >= limit) {
            window.setTimeout(() => playFanfare(), 320);
          }
          return updated;
        });
      }, 340 + offset * 180);
    });
  };

  const collect = () => {
    if (completedRef.current || finished) return;
    if (!validPicks('heist', encounter.options.length, picks)) return;
    completedRef.current = true;
    setFinished(true);
    playClick();
    playCoins();
    onComplete([...picks]);
  };

  const tally = tallyPicks(encounter.options, picks);
  const done = picks.length >= limit;
  const allRevealed = done && picks.every(p => revealed.includes(p));

  return (
    <div className="bb-mini bb-heist-modal" role="group" aria-label="Vault heist: open three safes">
      <div className="bb-mini-head">
        <div className="bb-heist-badge-icon" aria-hidden="true">🗝️</div>
        <h2 className="bb-mini-title">Vault Heist</h2>
        <p className="bb-mini-sub">
          Crack <strong>three</strong> of nine voxel safes. Loot is fixed up front — pick the seats you like.
          {picks.length < limit ? ` ${limit - picks.length} left to crack.` : ' All cracked! Ready to collect.'}
        </p>
      </div>

      <div className="bb-safe-grid">
        {encounter.options.map((safe, i) => {
          const picked = picks.includes(i);
          const shown = revealed.includes(i);
          const cracking = picked && !shown;
          const order = picks.indexOf(i) + 1;
          const variant = safe.variant ?? 'brass';

          return (
            <button
              key={i}
              type="button"
              className="bb-safe"
              data-variant={variant}
              data-picked={picked}
              data-revealed={shown}
              data-cracking={cracking}
              disabled={finished || (!picked && done)}
              onClick={() => pick(i)}
              aria-label={`${safe.label}${picked ? `, cracked vault ${order} of 3` : ', unopened vault safe'}`}
              aria-pressed={picked}
            >
              <div className="bb-safe-stage" aria-hidden="true">
                <div className="bb-voxel-safe">
                  {/* Stepped corner voxel rivets */}
                  <span className="bb-safe-bolt tl" />
                  <span className="bb-safe-bolt tr" />
                  <span className="bb-safe-bolt bl" />
                  <span className="bb-safe-bolt br" />

                  {/* Recessed safe interior chamber */}
                  <div className="bb-safe-chamber">
                    <div className="bb-chamber-glow" />
                    <div className="bb-chamber-loot">
                      {safe.coins > 0 && (
                        <div className="bb-voxel-coins" title={`${safe.coins} coins`}>
                          <span className="bb-coin-disc c1" />
                          <span className="bb-coin-disc c2" />
                          <span className="bb-coin-disc c3" />
                        </div>
                      )}
                      {safe.materials > 0 && (
                        <div className="bb-voxel-bricks" title={`${safe.materials} materials`}>
                          <span className="bb-brick-block b1" />
                          <span className="bb-brick-block b2" />
                        </div>
                      )}
                      {safe.energy > 0 && (
                        <div className="bb-voxel-battery" title={`${safe.energy} energy`}>
                          <span className="bb-energy-spark" />
                        </div>
                      )}
                    </div>
                    {shown && (
                      <div className="bb-sparkle-burst">
                        <span className="bb-sparkle sp1" />
                        <span className="bb-sparkle sp2" />
                        <span className="bb-sparkle sp3" />
                        <span className="bb-sparkle sp4" />
                      </div>
                    )}
                  </div>

                  {/* 3D Voxel Vault Door with Hinge and Combination Dial */}
                  <div className="bb-safe-door">
                    <div className="bb-safe-hinges">
                      <span className="bb-hinge top" />
                      <span className="bb-hinge bottom" />
                    </div>
                    <div className="bb-door-plate">
                      <div className="bb-door-inner-rim">
                        <div className="bb-vault-dial">
                          <div className="bb-dial-ring">
                            <span className="bb-dial-tick t-0" />
                            <span className="bb-dial-tick t-90" />
                            <span className="bb-dial-tick t-180" />
                            <span className="bb-dial-tick t-270" />
                          </div>
                          <div className="bb-dial-wheel">
                            <span className="bb-wheel-spoke spk-h" />
                            <span className="bb-wheel-spoke spk-v" />
                            <span className="bb-wheel-hub" />
                          </div>
                        </div>
                      </div>
                      <span className="bb-door-bolt-bar" />
                    </div>
                  </div>
                </div>

                {picked && <span className="bb-safe-order">{order}</span>}
              </div>

              <span className="bb-safe-label">{safe.label}</span>
              <span className="bb-safe-loot" aria-live="polite">
                {shown ? (
                  <span className="bb-loot-revealed">
                    🪙 {safe.coins.toLocaleString()}
                    {safe.materials ? ` · 🧱 ${safe.materials}` : ''}
                    {safe.energy ? ` · ⚡ ${safe.energy}` : ''}
                  </span>
                ) : cracking ? (
                  <span className="bb-loot-cracking">CRACKING…</span>
                ) : (
                  <span className="bb-loot-unopened">???</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`bb-mini-tally ${allRevealed ? 'bb-tally-complete' : ''}`} role="status" aria-live="polite">
        <span>🪙 {tally.coins.toLocaleString()}</span>
        <span>🧱 {tally.materials}</span>
        <span>⚡ {tally.energy}</span>
        <span className="bb-tally-count">{picks.length}/3 safes</span>
      </div>

      <div className="bb-mini-actions">
        {!done && (
          <button type="button" className="bb-control bb-secondary-action" onClick={quickPick}>
            ⚡ Quick crack
          </button>
        )}
        <button
          type="button"
          className={`bb-control bb-mini-collect ${allRevealed ? 'bb-collect-ready' : ''}`}
          disabled={!done || finished}
          onClick={collect}
        >
          {finished ? '✓ Collected' : done ? `COLLECT ${tally.coins.toLocaleString()} 🪙` : `Pick ${limit - picks.length} more`}
        </button>
      </div>
    </div>
  );
}
