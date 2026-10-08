import React from 'react';
import { useGameStore } from '../store/gameStore';

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
    rollDice,
    cycleMultiplier,
    toggleTurbo,
    openModal
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
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: 'rgba(30,41,59,0.9)', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', color: '#fbbf24', fontWeight: 800, fontSize: '13px' }}>
            🪙 {coins.toLocaleString()}
          </div>
          <div style={{ background: 'rgba(30,41,59,0.9)', padding: '6px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', color: '#f472b6', fontWeight: 800, fontSize: '13px' }}>
            🧱 {materials}
          </div>
          <div style={{ background: 'rgba(8,47,73,0.9)', padding: '6px 10px', borderRadius: '14px', border: '1px solid #0284c7', display: 'flex', gap: '4px' }}>
            {Array.from({ length: maxShields }).map((_, i) => (
              <span key={i} style={{ filter: i < shields ? 'none' : 'grayscale(100%)', opacity: i < shields ? 1 : 0.4 }}>🛡️</span>
            ))}
          </div>
          <button
            onClick={() => openModal('upgrade')}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
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
    </div>
  );
}
