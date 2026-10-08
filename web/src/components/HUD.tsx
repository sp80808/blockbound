import React from 'react';
import { allowedMultipliers } from '../game/rollRules';
import { useGameStore } from '../store/gameStore';
import './GameFeel.css';

const chip: React.CSSProperties = {
  borderRadius: 13, background: 'rgba(15,23,42,.91)', padding: '8px 10px',
  border: '1px solid rgba(255,255,255,.18)', fontWeight: 900,
  fontSize: 12, whiteSpace: 'nowrap'
};

const smallButton: React.CSSProperties = {
  background: '#1e293b', color: '#e2e8f0',
  padding: '7px 10px', fontSize: 12
};

export function HUD() {
  const {
    coins, materials, energy, maxEnergy, shields, maxShields, multiplier, isRolling,
    isTurbo, toast, lastRoll, totalRolls, momentum, autoRolling, autoBatchSize,
    autoRollsRemaining, autoEnergyBudget, autoEnergySpent, autoOkay,
    autoAdjustMultiplier, rollDice, cycleMultiplier, toggleTurbo, openModal,
    cycleAutoBatch, startAutoRoll, stopAutoRoll, toggleAutoOkay, toggleAutoAdjust
  } = useGameStore();

  const highestAffordable = allowedMultipliers(energy).slice(-1)[0] ?? 0;
  const canRoll = !isRolling && !autoRolling && energy >= multiplier;
  const automaticSpendLeft = Math.max(0, autoEnergyBudget - autoEnergySpent);

  return (
    <div className="bb-hud">
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 5, flexWrap: 'wrap'
        }}>
          <div key={'coins-' + coins} className="bb-resource" data-flash="true" style={{ ...chip, color: '#fbbf24' }}>
            🪙 {coins.toLocaleString()}
          </div>
          <div key={'blocks-' + materials} className="bb-resource" data-flash="true" style={{ ...chip, color: '#f472b6' }}>
            🧱 {materials}
          </div>
          <div className="bb-resource" style={{ ...chip, color: '#67e8f9' }} aria-label={shields + ' out of ' + maxShields + ' shields'}>
            {Array.from({ length: maxShields }, (_, i) =>
              <span key={i} style={{ opacity: i < shields ? 1 : 0.3 }}>🛡️</span>
            )}
          </div>
          <button className="bb-control" onClick={() => openModal('upgrade')}
            style={{ padding: '8px 12px', background: '#059669', color: '#fff', borderColor: '#34d399' }}>
            🔨 BUILD
          </button>
        </div>

        {toast && (
          <div key={toast + totalRolls} role="status" aria-live="polite" className="bb-toast"
            style={{ alignSelf: 'center', maxWidth: '94%', background: 'rgba(49,46,129,.96)',
              border: '1.5px solid #fbbf24', borderRadius: 13, padding: '9px 13px',
              textAlign: 'center', color: '#fde68a', fontWeight: 850, fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,.28)' }}>
            {toast}
          </div>
        )}
      </div>

      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lastRoll && (
          <div key={'roll-' + lastRoll.id} className="bb-toast" aria-live="polite"
            style={{ alignSelf: 'center', padding: '6px 14px', borderRadius: 20,
              background: 'rgba(30,41,59,.92)', border: '1px solid #fbbf24',
              fontWeight: 900, color: '#fff', fontSize: 13 }}>
            🎲 {lastRoll.die1} + {lastRoll.die2} = {lastRoll.total}
            {lastRoll.doubles ? ' · ✨ DOUBLES!' : ''} <span style={{ color: '#fbbf24' }}>×{lastRoll.multiplier}</span>
          </div>
        )}

        <div style={{
          display: 'flex', gap: 9, alignItems: 'center', padding: '6px 11px',
          background: 'rgba(15,23,42,.88)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,.10)'
        }}>
          <span className="bb-mini" style={{ whiteSpace: 'nowrap' }}>🏗️ BUILD MOMENTUM</span>
          <div role="progressbar" aria-label="Rolls until 3 bonus construction blocks"
            aria-valuenow={momentum} aria-valuemin={0} aria-valuemax={5}
            style={{ height: 7, flex: 1, background: '#334155', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: (momentum / 5 * 100) + '%', height: '100%',
              background: 'linear-gradient(90deg, #10b981, #fbbf24)',
              transition: 'width .25s ease' }} />
          </div>
          <span className="bb-mini">{momentum}/5 · +3 🧱</span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 3px', color: '#fde68a', fontSize: 12, fontWeight: 850
        }}>
          <span>⚡ ENERGY {energy}/{maxEnergy}</span>
          <span style={{ color: autoRolling ? '#86efac' : '#cbd5e1', fontSize: 11 }}>
            {autoRolling
              ? 'AUTO: ' + autoRollsRemaining + ' LEFT · ⚡ ' + automaticSpendLeft + ' MAX'
              : 'MAX AFFORDABLE ×' + highestAffordable}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button className="bb-control" onClick={cycleMultiplier} disabled={autoRolling || isRolling}
            aria-label={'Dice cost multiplier, currently ' + multiplier + '. Tap to cycle affordable multipliers'}
            style={{ width: 64, minHeight: 62, background: '#1e1b4b', color: '#facc15',
              border: '2px solid #fbbf24', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#cbd5e1' }}>DICE</span>
            <span style={{ fontSize: 20 }}>×{multiplier}</span>
          </button>

          <button className={'bb-control' + (canRoll ? ' bb-roll-ready' : '')}
            onClick={() => rollDice()} disabled={!canRoll}
            style={{ flex: 1, minHeight: 64,
              background: 'linear-gradient(135deg, #fb7185, #e11d48)',
              color: '#fff', border: '1px solid #fda4af', fontSize: 22, fontWeight: 950 }}>
            {isRolling ? '🎲 ROLLING…' : '🎲 ROLL'}
            <span style={{ display: 'block', fontSize: 11, color: '#fef08a' }}>⚡ {multiplier} ENERGY</span>
          </button>

          <button className="bb-control" onClick={toggleTurbo} aria-pressed={isTurbo}
            aria-label={isTurbo ? 'Turn quick rolls off' : 'Turn quick rolls on'}
            style={{ width: 62, minHeight: 62, background: isTurbo ? '#064e3b' : '#1e1b4b',
              color: isTurbo ? '#86efac' : '#cbd5e1', borderColor: isTurbo ? '#34d399' : '#64748b',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: 21 }}>⚡</span><span style={{ fontSize: 11 }}>FAST</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 7 }}>
          <button className="bb-control" onClick={cycleAutoBatch} disabled={autoRolling || isRolling}
            aria-label={'Set auto-roll batch count, currently ' + autoBatchSize}
            style={{ ...smallButton, flex: '0 0 72px' }}>
            {autoBatchSize} ROLLS
          </button>
          <button className="bb-control"
            onClick={autoRolling ? stopAutoRoll : startAutoRoll}
            disabled={!autoRolling && (isRolling || energy < 1)}
            aria-pressed={autoRolling}
            style={{ flex: 1, color: '#fff', background: autoRolling ? '#b91c1c' : '#4338ca',
              borderColor: autoRolling ? '#fca5a5' : '#a5b4fc', fontSize: 14,
              boxShadow: autoRolling ? '0 4px 15px rgba(239,68,68,.20)' : '0 4px 15px rgba(99,102,241,.25)' }}>
            {autoRolling ? '■ STOP AUTO' : '▶ AUTO ROLL'}
          </button>
          <button className="bb-control" onClick={toggleAutoOkay} aria-pressed={autoOkay}
            title="Automatically acknowledge ordinary rewards. Choices still pause."
            style={{ ...smallButton, flex: '0 0 75px',
              color: autoOkay ? '#86efac' : '#cbd5e1',
              borderColor: autoOkay ? '#34d399' : '#64748b' }}>
            {autoOkay ? '✓ AUTO OK' : 'AUTO OK'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 8, fontSize: 10, color: '#cbd5e1', padding: '0 4px' }}>
          <span>
            {autoRolling
              ? 'Up to ' + autoBatchSize + ' rolls; spending capped at ⚡ ' + autoEnergyBudget
              : 'Auto stops at choices, budget or low energy'}
          </span>
          <button className="bb-control" onClick={toggleAutoAdjust}
            disabled={autoRolling || isRolling} aria-pressed={autoAdjustMultiplier}
            style={{ padding: '4px 9px', minHeight: 34,
              background: 'rgba(30,41,59,.9)', color: autoAdjustMultiplier ? '#86efac' : '#cbd5e1',
              whiteSpace: 'nowrap', fontSize: 10 }}>
            {autoAdjustMultiplier ? '↘ ADAPT × ON' : 'ADAPT × OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
