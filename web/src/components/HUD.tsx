import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { allowedMultipliers } from '../game/rollRules';
import { STREAK_REWARDS, useGameStore } from '../store/gameStore';
import './GameFeel.css';

/** One physical affordance for tap-roll, hold-to-auto, and tap-to-stop.
 * A long hold never produces a second click-roll on release.
 * An explicit Auto button in Options ensures keyboard/switch users can use auto-play.
 */
const HOLD_TO_AUTO_MS = 540;
const DRAG_TOLERANCE_PX = 12;

export function HUD() {
  const {
    coins, materials, energy, maxEnergy, shields, maxShields, multiplier,
    isRolling, isTurbo, toast, lastRoll, momentum, autoRolling, autoBatchSize,
    autoRollsRemaining, autoEnergyBudget, autoEnergySpent, autoOkay,
    autoAdjustMultiplier, districts, currentDistrict, dailyStreak, streakClaimedToday,
    activeModal, claimStreakReward, closeModal, rollDice, cycleMultiplier,
    toggleTurbo, openModal, startAutoRoll, stopAutoRoll, setAutoBatchSize,
    toggleAutoOkay, toggleAutoAdjust
  } = useGameStore();

  const [showOptions, setShowOptions] = useState(false);
  const [showRollSummary, setShowRollSummary] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const heldAt = useRef(0);

  useEffect(() => {
    if (!lastRoll) return;
    setShowRollSummary(true);
    const timer = window.setTimeout(() => setShowRollSummary(false), 2200);
    return () => window.clearTimeout(timer);
  }, [lastRoll?.id]);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdOrigin.current = null;
    setIsHolding(false);
  };
  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const beginHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || autoRolling || isRolling || energy < multiplier || activeModal) return;
    clearHold();
    holdOrigin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    setIsHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      const state = useGameStore.getState();
      if (!state.isRolling && !state.autoRolling && !state.activeModal) {
        heldAt.current = Date.now();
        state.startAutoRoll();
      }
      setIsHolding(false);
    }, HOLD_TO_AUTO_MS);
  };
  const trackHold = (event: PointerEvent<HTMLButtonElement>) => {
    const origin = holdOrigin.current;
    if (origin && origin.id === event.pointerId &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > DRAG_TOLERANCE_PX) {
      clearHold();
    }
  };
  const clickRoll = (event: MouseEvent<HTMLButtonElement>) => {
    // The native click following a long pointer hold must not roll or stop auto.
    if (Date.now() - heldAt.current < 1100 && event.detail !== 0) return;
    if (autoRolling) stopAutoRoll();
    else if (!isRolling && energy >= multiplier) rollDice();
  };
  const interruptAutoForOtherTouch = (event: PointerEvent<HTMLDivElement>) => {
    if (!useGameStore.getState().autoRolling) return;
    const target = event.target;
    if (target instanceof Element && !target.closest('[data-roll-trigger]')) stopAutoRoll();
  };
  const stopAutoForOtherAction = (event: MouseEvent<HTMLDivElement>) => {
    if (!useGameStore.getState().autoRolling) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (button && !button.hasAttribute('data-roll-trigger')) stopAutoRoll();
  };

  const district = districts[currentDistrict];
  const completed = district?.buildings.reduce((sum, b) => sum + b.tier, 0) ?? 0;
  const total = (district?.buildings.length ?? 0) * 4;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const canRoll = autoRolling || (!isRolling && energy >= multiplier && !activeModal);
  const maxAffordable = allowedMultipliers(energy).slice(-1)[0] ?? 0;
  const remainingBudget = Math.max(0, autoEnergyBudget - autoEnergySpent);

  return (
    <div className="bb-hud" onPointerDownCapture={interruptAutoForOtherTouch} onClickCapture={stopAutoForOtherAction}>
      <header className="bb-top" aria-label="Player resources and district progress">
        <div className="bb-resource-row">
          <div className="bb-resource" key={'coins-' + coins} data-flash="true"
            style={{ color: '#ffe07f' }} aria-label={coins.toLocaleString() + ' coins'}>
            🪙 {coins.toLocaleString()}
          </div>
          <div className="bb-resource" key={'materials-' + materials} data-flash="true"
            style={{ color: '#ffc0d9' }} aria-label={materials + ' building blocks'}>
            🧱 {materials.toLocaleString()}
          </div>
          <div className="bb-resource" style={{ color: '#c8efff' }}
            aria-label={shields + ' of ' + maxShields + ' shields'}>
            {Array.from({ length: maxShields }, (_, i) =>
              <span key={i} aria-hidden="true" style={{ opacity: i < shields ? 1 : 0.28 }}>🛡️</span>)}
          </div>
          <button className="bb-control bb-streak" onClick={() => openModal('streak')}
            aria-label={'Daily login reward, day ' + dailyStreak}>
            🔥 {dailyStreak}
            {!streakClaimedToday && <span className="bb-streak-dot" aria-label="Reward available" />}
          </button>
          <button className="bb-control bb-build" onClick={() => openModal('upgrade')}
            title="Upgrade or repair buildings">🔨 BUILD</button>
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
            role="progressbar" aria-label="District building progress"
            aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
            <div className="bb-progress-fill" style={{ width: progress + '%' }} />
          </div>
        </div>
        {toast && <div className="bb-toast" role="status" aria-live="polite" key={toast}>{toast}</div>}
      </header>

      {showRollSummary && lastRoll && (
        <div className="bb-roll-chip" role="status" aria-live="polite">
          🎲 {lastRoll.die1} + {lastRoll.die2} = {lastRoll.total}
          <span style={{ color: '#fce787' }}> ×{lastRoll.multiplier}</span>
          {lastRoll.doubles && <span style={{ color: '#86efac' }}>✦ DOUBLES!</span>}
        </div>
      )}

      {showOptions && (
        <div id="bb-auto-options" className="bb-options bb-options-sheet" role="group"
          aria-label="Dice roll preferences">
          <div className="bb-prompt">ROLL PREFERENCES</div>
          <div className="bb-options-line">
            <span>Auto batch</span>
            <div className="bb-segmented" role="group" aria-label="Auto Roll batch size">
              {([5, 10, 25] as const).map(count => (
                <button key={count} className="bb-control bb-segment"
                  disabled={autoRolling || isRolling} aria-pressed={autoBatchSize === count}
                  onClick={() => setAutoBatchSize(count)}>{count}</button>
              ))}
            </div>
          </div>
          <div className="bb-options-line">
            <span>Roll speed</span>
            <button className="bb-control bb-secondary-action" aria-pressed={isTurbo}
              onClick={toggleTurbo}>{isTurbo ? '⚡ QUICK' : '▶ NORMAL'}</button>
          </div>
          <div className="bb-options-line">
            <span>Standard reward popups</span>
            <button className="bb-control bb-secondary-action" aria-pressed={autoOkay}
              onClick={toggleAutoOkay}>{autoOkay ? '✓ AUTO OK' : 'MANUAL OK'}</button>
          </div>
          <div className="bb-options-line">
            <span>Auto adjust stake</span>
            <button className="bb-control bb-secondary-action" aria-pressed={autoAdjustMultiplier}
              disabled={autoRolling || isRolling} onClick={toggleAutoAdjust}>
              {autoAdjustMultiplier ? '✓ ADAPT ON' : 'ADAPT OFF'}
            </button>
          </div>
          <button className="bb-control bb-secondary-action bb-keyboard-auto"
            disabled={!autoRolling && (isRolling || energy < multiplier)}
            onClick={autoRolling ? stopAutoRoll : startAutoRoll}>
            {autoRolling ? '■ Stop Auto Roll' : '▶ Start Auto Roll (' + autoBatchSize + ' rolls)'}
          </button>
          <span className="bb-auto-note">Holding ROLL is optional. Auto never chooses raid or heist targets.</span>
        </div>
      )}

      {activeModal === 'streak' && (
        <div className="bb-streak-scrim" role="presentation" onClick={closeModal}>
          <div className="bb-streak-dialog" role="dialog" aria-modal="true"
            aria-label="Daily login streak rewards" onClick={e => e.stopPropagation()}>
            <div className="bb-streak-heading">
              <div><strong>🔥 Daily Rewards</strong>
                <div className="bb-auto-note">Claim once each day to build your streak.</div>
              </div>
              <button className="bb-control bb-secondary-action" onClick={closeModal}
                aria-label="Close daily rewards">✕</button>
            </div>
            <div className="bb-streak-rewards">
              {STREAK_REWARDS.map(reward => {
                const past = reward.day < dailyStreak || (reward.day === dailyStreak && streakClaimedToday);
                const today = reward.day === dailyStreak && !streakClaimedToday;
                return <div className="bb-streak-reward" key={reward.day}
                  data-today={today} data-claimed={past}>
                  <div className="bb-micro">DAY {reward.day}</div>
                  <div style={{ fontSize: 26 }}>{reward.icon}</div>
                  <div className="bb-micro">{past ? 'CLAIMED' : reward.desc}</div>
                </div>;
              })}
            </div>
            <button className="bb-control bb-build" disabled={streakClaimedToday}
              onClick={claimStreakReward} style={{ width: '100%', minHeight: 50 }}>
              {streakClaimedToday ? 'DAY ' + dailyStreak + ' CLAIMED ✓' : 'CLAIM DAY ' + dailyStreak}
            </button>
          </div>
        </div>
      )}

      <footer className="bb-controls" aria-label="Dice roll controls">
        <div className="bb-activity">
          <div className="bb-energy-summary">
            <div className="bb-energy-title">⚡ {energy}<span style={{ color: '#a4c5d7' }}>/{maxEnergy}</span> DICE</div>
            <div className="bb-energy-track" role="progressbar" aria-label="Dice energy"
              aria-valuemin={0} aria-valuemax={maxEnergy} aria-valuenow={energy}>
              <div className="bb-energy-fill" style={{ width: (maxEnergy ? 100 * energy / maxEnergy : 0) + '%' }} />
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
          <button className="bb-control bb-multiplier" onClick={cycleMultiplier}
            disabled={isRolling || autoRolling} title="Cycle available dice multipliers"
            aria-label={'Stake multiplier ' + multiplier + '; highest affordable is ' + maxAffordable}>
            <span style={{ display: 'block', fontSize: 9, color: '#d1c3ff' }}>STAKE</span>
            <span style={{ fontSize: 20, fontWeight: 950 }}>×{multiplier}</span>
          </button>

          <button className="bb-control bb-roll-button" data-roll-trigger="true"
            data-auto={autoRolling} data-holding={isHolding}
            disabled={!canRoll}
            onPointerDown={beginHold}
            onPointerMove={trackHold}
            onPointerUp={clearHold}
            onPointerCancel={clearHold}
            onPointerLeave={clearHold}
            onContextMenu={e => e.preventDefault()}
            onClick={clickRoll}
            title={autoRolling ? 'Tap to stop after current roll' : 'Tap once to roll; hold to start Auto Roll'}
            aria-label={autoRolling ? 'Stop Auto Roll after current roll' :
              'Roll two dice for ' + multiplier + ' energy. Hold to auto roll. Options provide accessible auto controls.'}>
            <span>{autoRolling ? '■ STOP AUTO' : isRolling ? '🎲 ROLLING…' : isHolding ? '⌛ HOLD FOR AUTO' : '🎲 ROLL'}</span>
            <span className="bb-micro" style={{ color: '#fff1c4', marginTop: 4 }}>
              {autoRolling ? autoRollsRemaining + ' LEFT · ⚡ ' + remainingBudget + ' BUDGET' :
                '⚡ ' + multiplier + ' · HOLD TO AUTO'}
            </span>
            {isHolding && <span className="bb-hold-progress" aria-hidden="true" />}
          </button>

          <button className="bb-control bb-settings-button" onClick={() => setShowOptions(v => !v)}
            aria-expanded={showOptions} aria-controls="bb-auto-options"
            aria-label={showOptions ? 'Close dice settings' : 'Open dice settings'}>
            <span style={{ fontSize: 22 }}>⚙</span>
            <span style={{ fontSize: 9 }}>MORE</span>
          </button>
        </div>
        <div className="bb-auto-note" style={{ textAlign: 'center' }} aria-live="polite">
          {autoRolling ? 'Auto Roll active · tap ROLL or another control to stop' :
            'Tap to roll · hold to auto · ' + autoBatchSize + '-roll cap'}
        </div>
      </footer>
    </div>
  );
}
