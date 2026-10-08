import { useEffect, useMemo, useState } from 'react';
import { VoxelScene } from './components/VoxelScene';
import { HUD } from './components/HUD';
import { SplashScreen } from './components/SplashScreen';
import { VaultHeist } from './minigames/heist/VaultHeist';
import { TownRaid } from './minigames/raid/TownRaid';
import { useGameStore } from './store/gameStore';

const CONFETTI_COLORS = ['#fde047', '#f472b6', '#67e8f9', '#a3e635', '#fb923c', '#c4b5fd'];

function Celebration() {
  const celebration = useGameStore(s => s.celebration);
  const dismiss = useGameStore(s => s.dismissCelebration);
  const pieces = useMemo(() => {
    if (!celebration) return [];
    let seed = celebration.key * 2654435761;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    return Array.from({ length: 28 }, (_, i) => ({
      x: rand() * 100,
      delay: rand() * 0.7,
      duration: 1.4 + rand() * 1.2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    }));
  }, [celebration]);

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [celebration, dismiss]);

  if (!celebration) return null;
  const copy = celebration.kind === 'jackpot'
    ? { icon: '✨', title: 'JACKPOT!', sub: 'The golden vault bursts open. Keep rolling!' }
    : celebration.kind === 'doubles3'
      ? { icon: '🎲', title: 'DOUBLES STREAK!', sub: 'Three doubles in a row — the dice love you. Bonus shield earned!' }
      : { icon: '🏗️', title: 'GRAND MILESTONE!', sub: 'Ten rolls strong! Bonus shield and energy incoming.' };

  return (
    <div className="bb-celebration" aria-live="polite">
      <div className="bb-confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <i
            key={celebration.key + '-' + i}
            style={{ '--x': p.x + '%', '--delay': p.delay + 's', '--d': p.duration + 's', '--c': p.color } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="bb-celebration-card" role="status">
        <div style={{ fontSize: 46 }}>{copy.icon}</div>
        <h2>{copy.title}</h2>
        <p>{copy.sub}</p>
        <button className="bb-control bb-mini-collect" onClick={dismiss} style={{ width: '100%' }}>
          KEEP ROLLING 🎲
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const {
    activeModal, closeModal, districts, currentDistrict, coins, materials,
    pendingEncounter, pendingReward, resolveEncounterPicks, acknowledgeReward,
    upgradeBuilding, repairBuilding
  } = useGameStore();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Restore verified local progress before the player can start a new roll.
  useEffect(() => {
    useGameStore.getState().hydrateGame();
    useGameStore.getState().tickRecovery();
    const regenTimer = window.setInterval(() => useGameStore.getState().tickRecovery(), 1000);
    return () => window.clearInterval(regenTimer);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // No unattended dice spending in background tabs or after switching apps.
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) useGameStore.getState().stopAutoRoll();
      else useGameStore.getState().tickRecovery();
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
    <div className="bb-shell">
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <>
          <main className="bb-world" aria-label="Interactive 3D board"><VoxelScene /></main>
          <HUD />
          <Celebration />

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
                  maxWidth: '410px',
                  maxHeight: 'min(83dvh, 660px)',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
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
                  <button onClick={closeModal} style={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: '50%', minWidth: '44px', minHeight: '44px', cursor: 'pointer' }}>✕</button>
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
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tier {b.tier}/4 • 🪙 {cost.toLocaleString()} · 🧱 {mats}</div>
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

          {/* Encounters pause auto-roll until their single completion callback fires. */}
          {activeModal === 'encounter' && pendingEncounter && (
            <div role="dialog" aria-modal="true"
              aria-label={pendingEncounter.kind === 'raid' ? 'Town raid encounter' : 'Vault heist encounter'}
              style={{ position: 'absolute', inset: 0, zIndex: 80,
                background: 'rgba(2,6,23,.82)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', padding: 14 }}>
              <div style={{ width: '100%', maxWidth: 400, maxHeight: 'min(88dvh, 700px)',
                overflowY: 'auto', overscrollBehavior: 'contain', borderRadius: 24,
                background: '#0f172a', border: '2px solid #a78bfa', color: '#fff',
                padding: 18, boxShadow: '0 16px 45px rgba(0,0,0,.35)' }}>
                {pendingEncounter.kind === 'raid' ? (
                  <TownRaid
                    encounter={pendingEncounter}
                    reducedMotion={reducedMotion}
                    onComplete={indices => resolveEncounterPicks(indices)}
                  />
                ) : (
                  <VaultHeist
                    encounter={pendingEncounter}
                    reducedMotion={reducedMotion}
                    onComplete={indices => resolveEncounterPicks(indices)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
