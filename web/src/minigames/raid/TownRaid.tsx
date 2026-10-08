import { useEffect, useRef, useState } from 'react';
import { validPicks, type MinigameProps } from '../contracts';

type Phase = 'aim' | 'flying' | 'impact';

/**
 * Town Raid — pick one of three NPC landmarks, watch the strike, collect once.
 * Shield state is host-supplied: a barred-door target pops a shield instead
 * of taking damage and pays halved loot. Portable: no store imports, no
 * balance writes, exactly one onComplete per encounter.
 */
export function TownRaid({ encounter, reducedMotion, onComplete }: MinigameProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('aim');
  const [finished, setFinished] = useState(false);
  const completedRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const choose = (index: number) => {
    if (selected !== null || finished) return;
    setSelected(index);
    if (reducedMotion) {
      setPhase('impact');
      return;
    }
    setPhase('flying');
    timers.current.push(
      window.setTimeout(() => setPhase('impact'), 750)
    );
  };

  const collect = () => {
    if (completedRef.current || finished || selected === null || phase !== 'impact') return;
    if (!validPicks('raid', encounter.options.length, [selected])) return;
    completedRef.current = true;
    setFinished(true);
    onComplete([selected]);
  };

  const target = selected !== null ? encounter.options[selected] : null;

  return (
    <div className="bb-mini" role="group" aria-label="Town raid: strike one NPC landmark">
      <div className="bb-mini-head">
        <div style={{ fontSize: 44 }} aria-hidden="true">⚔️</div>
        <h2 className="bb-mini-title">Town Raid</h2>
        <p className="bb-mini-sub">
          Raid an <strong>NPC rival district</strong> (offline demo — no real players).
          One strike, one payout. Barred doors are shielded: half loot, no damage.
        </p>
      </div>

      <div className="bb-raid-stage" data-phase={phase}>
        <div className="bb-raid-sky" aria-hidden="true">
          <span className="bb-raid-projectile" />
        </div>
        <div className="bb-raid-targets">
          {encounter.options.map((option, i) => {
            const isTarget = selected === i;
            const showHit = isTarget && phase === 'impact';
            return (
              <button
                key={i}
                className="bb-raid-target"
                data-selected={isTarget}
                data-shielded={!!option.shielded && (!isTarget || phase === 'impact')}
                data-hit={showHit && !option.shielded}
                data-blocked={showHit && !!option.shielded}
                disabled={selected !== null || finished}
                onClick={() => choose(i)}
                aria-label={option.label + (option.shielded ? ', shielded, half loot' : '') + (isTarget ? ', targeted' : '')}
                aria-pressed={isTarget}
              >
                <span className="bb-raid-building" aria-hidden="true">
                  <span className="bb-raid-roof" />
                  {showHit && !option.shielded && <span className="bb-raid-cracks" />}
                  {showHit && option.shielded && <span className="bb-raid-shieldpop">🛡️</span>}
                  {option.shielded && !showHit && <span className="bb-raid-bar">🚧</span>}
                </span>
                <span className="bb-safe-label">{option.label}</span>
                <span className="bb-safe-loot">
                  🪙 {option.coins.toLocaleString()}
                  {option.materials ? ` · 🧱 ${option.materials}` : ''}
                  {option.energy ? ` · ⚡ ${option.energy}` : ''}
                  {option.shielded ? ' · 🛡️ halved' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bb-mini-tally" role="status" aria-live="polite">
        {selected === null && 'Choose your target…'}
        {selected !== null && phase === 'flying' && 'Striking…'}
        {selected !== null && phase === 'impact' && target && (
          target.shielded
            ? `🛡️ BLOCKED! ${target.label} holds — half loot: 🪙 ${target.coins.toLocaleString()}`
            : `💥 DIRECT HIT! ${target.label} — 🪙 ${target.coins.toLocaleString()}` +
              (target.materials ? ` · 🧱 ${target.materials}` : '') +
              (target.energy ? ` · ⚡ ${target.energy}` : '')
        )}
      </div>

      <div className="bb-mini-actions">
        <button
          className="bb-control bb-mini-collect"
          disabled={selected === null || phase !== 'impact' || finished}
          onClick={collect}
        >
          {finished ? '✓ Collected' : selected === null ? 'Pick a target first' : phase !== 'impact' ? 'Striking…' : 'COLLECT LOOT'}
        </button>
      </div>
    </div>
  );
}
