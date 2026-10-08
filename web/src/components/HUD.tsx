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
    districts,
    currentDistrict,
    rollDice,
    cycleMultiplier,
    toggleTurbo,
    openModal
  } = useGameStore();

  const buildings = districts[currentDistrict].buildings;
  const questTotal = buildings.length * 4;
  const questProgress = buildings.reduce((total, building) => total + building.tier, 0);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px', boxSizing: 'border-box' }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.92)', border: '1px solid rgba(148, 163, 184, 0.28)', boxShadow: '0 8px 24px rgba(2, 6, 23, 0.28)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 900, letterSpacing: '0.12em' }}>SUNNY SUBURB</div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 900, marginTop: '2px' }}>District 01</div>
          </div>
          <div style={{ display: 'flex', gap: '5px', color: '#fbbf24', fontWeight: 900, fontSize: '11px' }}><span style={{ color: '#64748b' }}>G</span>{coins.toLocaleString()}</div>
          <div style={{ display: 'flex', gap: '5px', color: '#f472b6', fontWeight: 900, fontSize: '11px' }}><span style={{ color: '#64748b' }}>M</span>{materials}</div>
          <div style={{ display: 'flex', gap: '3px', padding: '5px 7px', borderRadius: '9px', background: 'rgba(14, 116, 144, 0.25)', color: '#67e8f9', fontSize: '12px' }}>
            {Array.from({ length: maxShields }).map((_, i) => <span key={i} style={{ color: i < shields ? '#67e8f9' : '#334155' }}>◆</span>)}
          </div>
          <button onClick={() => openModal('upgrade')} aria-label="Open build menu" style={{ background: '#10b981', color: '#052e16', border: 0, padding: '9px 11px', borderRadius: '11px', fontWeight: 950, fontSize: '10px', letterSpacing: '0.04em', cursor: 'pointer' }}>BUILD</button>
        </div>

        <div style={{ pointerEvents: 'auto', padding: '9px 11px', borderRadius: '14px', background: 'rgba(30, 27, 75, 0.94)', border: '1px solid rgba(129, 140, 248, 0.55)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e0e7ff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em' }}><span>QUEST · RESTORE THE DISTRICT</span><span>{questProgress}/{questTotal}</span></div>
          <div style={{ height: '6px', marginTop: '7px', borderRadius: '999px', background: 'rgba(15, 23, 42, 0.8)', overflow: 'hidden' }}><div style={{ width: `${(questProgress / questTotal) * 100}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg, #818cf8, #34d399)' }} /></div>
          <div style={{ color: '#a5b4fc', fontSize: '10px', marginTop: '5px' }}>Upgrade every building to unlock the next district</div>
        </div>

        {toast && <div style={{ background: '#312e81', border: '1.5px solid #fbbf24', borderRadius: '12px', padding: '8px 14px', textAlign: 'center', color: '#fde68a', fontWeight: 900, fontSize: '13px' }}>{toast}</div>}
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
