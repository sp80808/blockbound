import React, { useEffect, useState } from 'react';
import { VoxelScene } from './components/VoxelScene';
import { HUD } from './components/HUD';
import { SplashScreen } from './components/SplashScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const {
    activeModal, closeModal, districts, currentDistrict, coins, materials,
    pendingEncounter, pendingReward, resolveEncounter, acknowledgeReward,
    upgradeBuilding, repairBuilding
  } = useGameStore();

  // No unattended dice spending in background tabs or after switching apps.
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) useGameStore.getState().stopAutoRoll();
    };
    const stopOnPageExit = () => useGameStore.getState().stopAutoRoll();
    document.addEventListener('visibilitychange', stopWhenHidden);
    window.addEventListener('pagehide', stopOnPageExit);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      window.removeEventListener('pagehide', stopOnPageExit);
    };
  }, []);

  const dist = districts[currentDistrict];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <>
          <VoxelScene />
          <HUD />

          {/* Upgrade Modal */}
          {activeModal === 'upgrade' && (
            <div
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.75)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 60,
                padding: '16px',
                boxSizing: 'border-box'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  background: '#0f172a',
                  border: '2px solid #6366f1',
                  borderRadius: '24px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#fff' }}>{dist.name}</h3>
                  <button onClick={closeModal} style={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                </div>
                {dist.buildings.map((b, idx) => {
                  const cost = Math.floor(b.baseCost * (1 + b.tier * 1.5));
                  const mats = b.baseMats + b.tier * 2;
                  const canAfford = coins >= cost && materials >= mats && b.tier < 4 && !b.damaged;
                  return (
                    <div key={b.id} style={{ background: b.damaged ? '#450a0a' : '#1e293b', padding: '10px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{b.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{b.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tier {b.tier}/4 • 🪙 {cost.toLocaleString()}</div>
                        </div>
                      </div>
                      {b.damaged ? (
                        <button onClick={() => repairBuilding(idx)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>REPAIR</button>
                      ) : b.tier >= 4 ? (
                        <span style={{ color: '#34d399', fontWeight: 800, fontSize: '11px' }}>MAXED</span>
                      ) : (
                        <button onClick={() => upgradeBuilding(idx)} disabled={!canAfford} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', opacity: canAfford ? 1 : 0.5 }}>UPGRADE</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional acknowledgement for players who turn Auto-OK off. */}
          {activeModal === 'reward' && pendingReward && (
            <div role="dialog" aria-modal="true" aria-label="Reward collected"
              style={{
                position: 'absolute', inset: 0, zIndex: 80,
                background: 'rgba(2,6,23,.76)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', padding: 18
              }}>
              <div style={{ width: '100%', maxWidth: 360, border: '2px solid #fbbf24',
                borderRadius: 24, background: '#172554', color: '#fff', textAlign: 'center',
                padding: 24, boxShadow: '0 16px 45px rgba(0,0,0,.3)' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎁</div>
                <h2 style={{ margin: '0 0 12px', color: '#fde68a' }}>{pendingReward.title}</h2>
                <p style={{ margin: '0 0 20px', color: '#cbd5e1' }}>{pendingReward.detail}</p>
                <button className="bb-control" onClick={acknowledgeReward}
                  style={{ width: '100%', background: '#10b981', borderColor: '#34d399',
                    color: '#fff', fontSize: 18, padding: 15 }}>OKAY ✓</button>
              </div>
            </div>
          )}

          {/* Encounters require a choice; auto-roll always stops here. */}
          {activeModal === 'encounter' && pendingEncounter && (
            <div role="dialog" aria-modal="true" aria-label="Choose encounter target"
              style={{ position: 'absolute', inset: 0, zIndex: 80,
                background: 'rgba(2,6,23,.82)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', padding: 18 }}>
              <div style={{ width: '100%', maxWidth: 380, borderRadius: 24,
                background: '#0f172a', border: '2px solid #a78bfa', color: '#fff',
                padding: 22, textAlign: 'center', boxShadow: '0 16px 45px rgba(0,0,0,.35)' }}>
                <div style={{ fontSize: 46 }}>{pendingEncounter.kind === 'raid' ? '⚔️' : '🗝️'}</div>
                <h2 style={{ margin: '8px 0', color: '#fef08a' }}>
                  {pendingEncounter.kind === 'raid' ? 'Town Raid' : 'Vault Heist'}
                </h2>
                <p style={{ margin: '0 0 18px', color: '#cbd5e1', fontSize: 13 }}>
                  Choose a {pendingEncounter.kind === 'raid' ? 'building' : 'vault'}.
                  This event pauses Auto Roll. Rewards are shown up front in this prototype.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {pendingEncounter.options.map((choice, i) => (
                    <button key={i} className="bb-control" onClick={() => resolveEncounter(i)}
                      style={{ width: '100%', padding: '13px 12px',
                        background: '#312e81', borderColor: '#818cf8', color: '#fff',
                        display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                      <span>{choice.label}</span><span style={{ color: '#fde68a' }}>
                        🪙 {choice.coins.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
