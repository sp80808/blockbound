import React, { useState } from 'react';
import { VoxelScene } from './components/VoxelScene';
import { HUD } from './components/HUD';
import { SplashScreen } from './components/SplashScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { activeModal, closeModal, districts, currentDistrict, coins, materials, upgradeBuilding, repairBuilding } = useGameStore();

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
        </>
      )}
    </div>
  );
}
