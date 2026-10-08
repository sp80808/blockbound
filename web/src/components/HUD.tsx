import React from 'react';
import { useGameStore, STREAK_REWARDS } from '../store/gameStore';

export function HUD() {
  const {
    coins,
    materials,
    energy,
    maxEnergy,
    shields,
    maxShields,
    multiplier,
    isRolling,
    isTurbo,
    toast,
    dailyStreak,
    streakClaimedToday,
    dicePopup,
    activeModal,
    rollDice,
    cycleMultiplier,
    toggleTurbo,
    openModal,
    closeModal,
    claimStreakReward
  } = useGameStore();

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 'calc(env(safe-area-inset-top, 24px) + 16px) 16px calc(env(safe-area-inset-bottom, 16px) + 12px) 16px',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: 'rgba(30,41,59,0.92)', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', color: '#fbbf24', fontWeight: 800, fontSize: '13px' }}>
            🪙 {coins.toLocaleString()}
          </div>
          <div style={{ background: 'rgba(30,41,59,0.92)', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', color: '#f472b6', fontWeight: 800, fontSize: '13px' }}>
            🧱 {materials}
          </div>
          <div style={{ background: 'rgba(8,47,73,0.92)', padding: '6px 10px', borderRadius: '14px', border: '1px solid #0284c7', display: 'flex', gap: '4px' }}>
            {Array.from({ length: maxShields }).map((_, i) => (
              <span key={i} style={{ filter: i < shields ? 'none' : 'grayscale(100%)', opacity: i < shields ? 1 : 0.4 }}>🛡️</span>
            ))}
          </div>

          {/* Daily Streak Badge */}
          <button
            onClick={() => openModal('streak')}
            style={{
              background: 'linear-gradient(135deg, #ea580c, #f97316)',
              border: '1px solid #fdba74',
              borderRadius: '14px',
              padding: '6px 10px',
              color: '#fff',
              fontWeight: 900,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔥 Day {dailyStreak}
          </button>

          <button
            onClick={() => openModal('upgrade')}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
          >
            🔨 BUILD
          </button>
        </div>

        {toast && (
          <div style={{ background: '#312e81', border: '1.5px solid #fbbf24', borderRadius: '12px', padding: '8px 14px', textAlign: 'center', color: '#fde68a', fontWeight: 900, fontSize: '13px' }}>
            {toast}
          </div>
        )}
      </div>

      {/* Dynamic Dice Outcome Pop-up Overlay */}
      {dicePopup && (
        <div style={{
          alignSelf: 'center',
          background: 'rgba(15, 23, 42, 0.94)',
          border: '2px solid #fbbf24',
          borderRadius: '24px',
          padding: '16px 26px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 16px 45px rgba(0,0,0,0.65)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ background: '#1e1b4b', border: '1.5px solid #f59e0b', borderRadius: '12px', padding: '4px 10px', fontSize: '20px', fontWeight: 900, color: '#fde047' }}>
              ⚀ {dicePopup.d1}
            </span>
            <span style={{ fontWeight: 900, color: '#94a3b8' }}>+</span>
            <span style={{ background: '#1e1b4b', border: '1.5px solid #f59e0b', borderRadius: '12px', padding: '4px 10px', fontSize: '20px', fontWeight: 900, color: '#fde047' }}>
              ⚀ {dicePopup.d2}
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
            = {dicePopup.total} STEPS
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
            {dicePopup.isDoubles ? '🔥 DOUBLES BONUS! +10 ROLLS!' : 'CAMERA TRACKING TOKEN'}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', fontSize: '11px', fontWeight: 800, padding: '0 8px' }}>
          <span>⚡ DICE ENERGY: {energy}/{maxEnergy}</span>
          <span>{energy < maxEnergy ? '+1 in 00:45' : 'FULL'}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={cycleMultiplier}
            style={{ width: '56px', height: '60px', borderRadius: '16px', background: '#1e1b4b', border: '2px solid #fbbf24', color: '#fbbf24', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          >
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>BET</span>
            <span style={{ fontSize: '16px' }}>{multiplier}X</span>
          </button>

          <button
            onClick={rollDice}
            disabled={isRolling || energy < multiplier}
            style={{ flex: 1, height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: '#fff', fontSize: '22px', fontWeight: 900, cursor: isRolling ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isRolling || energy < multiplier ? 0.6 : 1 }}
          >
            <span>{isRolling ? 'ROLLING...' : 'ROLL'}</span>
            <span style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '10px', fontSize: '13px', color: '#facc15' }}>⚡ -{multiplier}</span>
          </button>

          <button
            onClick={toggleTurbo}
            style={{ width: '56px', height: '60px', borderRadius: '16px', background: isTurbo ? '#064e3b' : '#1e1b4b', border: `2px solid ${isTurbo ? '#10b981' : '#64748b'}`, color: isTurbo ? '#34d399' : '#94a3b8', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          >
            <span>⚡</span>
            <span style={{ fontSize: '9px' }}>FAST</span>
          </button>
        </div>
      </div>

      {/* Daily Streak Modal */}
      {activeModal === 'streak' && (
        <div
          onClick={closeModal}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 65,
            padding: '16px',
            pointerEvents: 'auto'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '360px',
              background: '#0f172a',
              border: '2px solid #f97316',
              borderRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fb923c' }}>🔥 Daily Login Streak</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Claim consecutive day bonuses!</p>
              </div>
              <button onClick={closeModal} style={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {STREAK_REWARDS.map(r => {
                const isPast = r.day < dailyStreak || (r.day === dailyStreak && streakClaimedToday);
                const isCurrent = r.day === dailyStreak && !streakClaimedToday;
                return (
                  <div
                    key={r.day}
                    style={{
                      background: isCurrent ? '#1e1b4b' : isPast ? '#064e3b' : '#1e293b',
                      border: `1.5px solid ${isCurrent ? '#f59e0b' : isPast ? '#10b981' : '#334155'}`,
                      borderRadius: '12px',
                      padding: '8px 4px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>{r.label}</div>
                    <div style={{ fontSize: '20px', margin: '2px 0' }}>{r.icon}</div>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#fde047' }}>
                      {isPast ? 'CLAIMED' : r.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={claimStreakReward}
              disabled={streakClaimedToday}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                border: 'none',
                background: streakClaimedToday ? '#334155' : 'linear-gradient(135deg, #ea580c, #f97316)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 900,
                cursor: streakClaimedToday ? 'not-allowed' : 'pointer',
                opacity: streakClaimedToday ? 0.6 : 1
              }}
            >
              {streakClaimedToday ? `DAY ${dailyStreak} CLAIMED` : `CLAIM DAY ${dailyStreak} REWARD!`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
