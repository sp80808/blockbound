import { useEffect, useState } from 'react';
import { allowedMultipliers } from '../game/rollRules';
import { useGameStore } from '../store/gameStore';
import './GameFeel.css';

export function HUD() {
  const {
    coins, materials, energy, maxEnergy, shields, maxShields, multiplier,
    isRolling, isTurbo, toast, lastRoll, momentum, autoRolling, autoBatchSize,
    autoRollsRemaining, autoEnergyBudget, autoEnergySpent, autoOkay,
    autoAdjustMultiplier, districts, currentDistrict, rollDice, cycleMultiplier,
    toggleTurbo, openModal, startAutoRoll, stopAutoRoll, setAutoBatchSize,
    toggleAutoOkay, toggleAutoAdjust
  } = useGameStore();

  const [showOptions, setShowOptions] = useState(false);
  const [showRollSummary, setShowRollSummary] = useState(false);
  useEffect(() => {
    if (!lastRoll) return;
    setShowRollSummary(true);
    const timer = window.setTimeout(() => setShowRollSummary(false), 2400);
    return () => window.clearTimeout(timer);
  }, [lastRoll?.id]);

  const district = districts[currentDistrict];
  const completed = district?.buildings.reduce((sum, b) => sum + b.tier, 0) ?? 0;
  const total = (district?.buildings.length ?? 0) * 4;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const canRoll = !isRolling && !autoRolling && energy >= multiplier;
  const possibleMultiplier = allowedMultipliers(energy).slice(-1)[0] ?? 0;
  const remainingBudget = Math.max(0, autoEnergyBudget - autoEnergySpent);

  return (
    <div className="bb-hud">
      <header className="bb-top" aria-label="Player resources and district progress">
        <div className="bb-resource-row">
          <div key={'coins-' + coins} data-flash="true" className="bb-resource"
            style={{ color: '#ffe07f' }} aria-label={coins.toLocaleString() + ' coins'}>
            <span aria-hidden="true">🪙</span> {coins.toLocaleString()}
          </div>
          <div key={'materials-' + materials} data-flash="true" className="bb-resource"
            style={{ color: '#ffc0d9' }} aria-label={materials + ' building blocks'}>
            <span aria-hidden="true">🧱</span> {materials.toLocaleString()}
          </div>
          <div className="bb-resource" style={{ color: '#c8efff' }}
            aria-label={shields + ' of ' + maxShields + ' shields'}>
            {Array.from({ length: maxShields }, (_, i) => (
              <span key={i} aria-hidden="true" style={{ opacity: i < shields ? 1 : 0.28 }}>
                🛡️
              </span>
            ))}
          </div>
          <button className="bb-control bb-build" onClick={() => openModal('upgrade')}
            title="Upgrade or repair buildings in your district">🔨 BUILD</button>
        </div>

        <div className="bb-district">
          <div className="bb-district-row">
            <div style={{ minWidth: 0 }}>
              <div className="bb-district-caption">BLOCKBOUND · DISTRICT {currentDistrict + 1}</div>
              <div className="bb-district-title">🏡 {district?.name ?? 'My District'}</div>
            </div>
            <span className="bb-pill" aria-label={'Building progress ' + completed + ' out of ' + total}>
              ⭐ {completed}/{total}
            </span>
          </div>
          <div className="bb-progress-track" style={{ marginTop: 8 }}
            role="progressbar" aria-label="District building progress" aria-valuenow={completed}
            aria-valuemin={0} aria-valuemax={total}>
            <div className="bb-progress-fill" style={{ width: progress + '%' }} />
          </div>
        </div>
        {toast && <div className="bb-toast" key={toast} role="status" aria-live="polite">{toast}</div>}
      </header>

      {showRollSummary && lastRoll && (
        <div className="bb-roll-chip" aria-live="polite" role="status">
          <span aria-hidden="true">🎲</span>
          {lastRoll.die1} + {lastRoll.die2} = {lastRoll.total}
          <span style={{ color: '#fce787' }}>×{lastRoll.multiplier}</span>
          {lastRoll.doubles && <span style={{ color: '#86efac' }}>✦ DOUBLES!</span>}
        </div>
      )}

      {showOptions && (
        <div className="bb-options" role="group" aria-label="Automatic rolling preferences"
          style={{
            position: 'absolute',
            bottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 202px)',
            left: 'max(12px, env(safe-area-inset-left))',
            right: 'max(12px, env(safe-area-inset-right))',
            background: 'rgba(23, 35, 67, .98)', border: '1px solid #94a3b8a3',
            borderRadius: 15, padding: 12, boxShadow: '0 12px 34px #0008',
            pointerEvents: 'auto', zIndex: 7
          }}>
          <span className="bb-prompt" style={{ width: '100%' }}>AUTOMATIC ROLL SETTINGS</span>
          <button className="bb-control bb-secondary-action" onClick={toggleAutoOkay}
            aria-pressed={autoOkay}>
            {autoOkay ? '✓' : '○'} Auto-acknowledge rewards
          </button>
          <button className="bb-control bb-secondary-action" onClick={toggleAutoAdjust}
            aria-pressed={autoAdjustMultiplier} disabled={autoRolling || isRolling}>
            {autoAdjustMultiplier ? '✓' : '○'} Lower multiplier if needed
          </button>
          <span className="bb-auto-note">Auto-play never chooses raid/heist targets.</span>
        </div>
      )}

      <footer className="bb-controls" aria-label="Dice rolling controls">
        <div className="bb-activity">
          <div className="bb-energy-summary">
            <div className="bb-energy-title">⚡ {energy}<span style={{ color: '#a4c5d7' }}>/{maxEnergy}</span> DICE</div>
            <div className="bb-energy-track" role="progressbar" aria-label="Dice energy"
              aria-valuenow={energy} aria-valuemin={0} aria-valuemax={maxEnergy}>
              <div className="bb-energy-fill" style={{ width: (maxEnergy ? energy / maxEnergy * 100 : 0) + '%' }} />
            </div>
          </div>
          <div className="bb-momentum">
            <div className="bb-momentum-label">
              <span>🏗️ BUILD STREAK</span><span>{momentum}/5 · +3 🧱</span>
            </div>
            <div className="bb-progress-track" role="progressbar"
              aria-label="Rolls until three bonus building blocks"
              aria-valuemin={0} aria-valuemax={5} aria-valuenow={momentum}>
              <div className="bb-progress-fill" style={{ width: (momentum / 5 * 100) + '%' }} />
            </div>
          </div>
        </div>

        <div className="bb-roll-row">
          <button className="bb-control bb-multiplier"
            disabled={isRolling || autoRolling}
            onClick={cycleMultiplier}
            aria-label={'Dice multiplier ' + multiplier + ', tap to change; maximum affordable ' + possibleMultiplier}
            title="Cycle affordable dice multipliers">
            <span style={{ display: 'block', fontSize: 9, color: '#d1c3ff', letterSpacing: '.07em' }}>DICE</span>
            <span style={{ fontSize: 21, fontWeight: 950 }}>×{multiplier}</span>
          </button>
          <button className="bb-control bb-roll-button" onClick={() => rollDice()}
            disabled={!canRoll} aria-label={'Roll two dice for ' + multiplier + ' energy'}>
            <span>{isRolling ? 'ROLLING…' : '🎲 ROLL'}</span>
            <span className="bb-micro" style={{ color: '#fff1c4', marginTop: 5 }}>⚡ {multiplier} ENERGY</span>
          </button>
          <button className="bb-control bb-auto-main" data-running={autoRolling ? 'true' : 'false'}
            onClick={autoRolling ? stopAutoRoll : startAutoRoll}
            disabled={!autoRolling && (isRolling || energy < 1)}
            aria-pressed={autoRolling}
            title={autoRolling ? 'Stop after the current roll' : 'Start a limited batch of automatic dice rolls'}>
            <div style={{ fontSize: 18 }}>{autoRolling ? '■' : '▶'}</div>
            <div style={{ fontSize: 11 }}>{autoRolling ? 'STOP' : 'AUTO'}</div>
          </button>
        </div>

        <div className="bb-secondary-row">
          <div className="bb-segmented" aria-label="Auto-roll batch size" role="group">
            {([5, 10, 25] as const).map(count => (
              <button key={count} className="bb-control bb-segment"
                onClick={() => setAutoBatchSize(count)}
                disabled={autoRolling || isRolling} aria-pressed={autoBatchSize === count}
                title={'Auto roll up to ' + count + ' times'}>{count}×</button>
            ))}
          </div>
          <button className="bb-control bb-secondary-action"
            onClick={toggleTurbo} aria-pressed={isTurbo}
            title="Faster dice and token movement">⚡ QUICK</button>
          <button className="bb-control bb-secondary-action"
            aria-expanded={showOptions} aria-controls="bb-auto-options"
            onClick={() => setShowOptions(v => !v)}>
            ⚙ AUTO OPTIONS
          </button>
        </div>
        <div className="bb-auto-note" style={{ textAlign: 'center' }} aria-live="polite">
          {autoRolling
            ? 'AUTO: ' + autoRollsRemaining + ' remaining · ⚡ ' + remainingBudget + ' maximum to spend · pause at choices'
            : 'Auto uses a limited batch and pauses at choices. No endless spending.'}
        </div>
      </footer>
    </div>
  );
}
