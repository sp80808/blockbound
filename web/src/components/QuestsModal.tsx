import { useEffect, useMemo, useState } from 'react';
import { Clock, Sparkles, Trophy, Zap, Calendar, Award } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getTimeRemaining, type WindowCadence } from '../game/rotationEngine';
import { questViews } from '../game/quests';

export function QuestsModal() {
  const {
    rotationState,
    claimRotationQuest,
    claimQuest,
    closeModal,
    isRolling,
    rewardPresentation,
    totalRolls,
    doublesTotal,
    upgradesBuilt,
    raidsCompleted,
    heistsCompleted,
    jackpotsHit,
    claimedQuests,
    unlockedDistricts,
    districts
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<WindowCadence | 'lifetime'>('flash');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lifetimeQuests = useMemo(
    () => questViews(
      { totalRolls, doublesTotal, upgradesBuilt, raidsCompleted, heistsCompleted, jackpotsHit },
      claimedQuests
    ),
    [totalRolls, doublesTotal, upgradesBuilt, raidsCompleted, heistsCompleted, jackpotsHit, claimedQuests]
  );

  const countdown = useMemo(() => {
    if (activeTab === 'lifetime') return null;
    return getTimeRemaining(activeTab, now);
  }, [activeTab, now]);

  const activeRotationQuests = useMemo(() => {
    if (activeTab === 'lifetime' || !rotationState) return [];
    return rotationState.windows[activeTab]?.quests ?? [];
  }, [activeTab, rotationState]);

  // Tab badge counts
  const flashClaimable = rotationState?.windows.flash?.quests.filter(q => !q.claimed && q.current >= q.goal).length ?? 0;
  const dailyClaimable = rotationState?.windows.daily?.quests.filter(q => !q.claimed && q.current >= q.goal).length ?? 0;
  const weeklyClaimable = rotationState?.windows.weekly?.quests.filter(q => !q.claimed && q.current >= q.goal).length ?? 0;
  const lifetimeClaimable = lifetimeQuests.filter(q => q.state === 'claimable').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quests & Rotating Challenges"
      className="bb-quests-modal-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        background: 'rgba(2,6,23,.82)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14
      }}
    >
      <div
        className="bb-quests-modal-card"
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 'min(90dvh, 760px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          borderRadius: 24,
          background: '#0f172a',
          border: '2px solid #6366f1',
          color: '#fff',
          padding: '18px 20px',
          boxShadow: '0 18px 50px rgba(0,0,0,.45)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>🏆</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#f8fafc', fontWeight: 900 }}>QUEST DISTRICT</h2>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Rotating timed challenges & permanent milestones</div>
            </div>
          </div>
          <button
            className="bb-control"
            onClick={closeModal}
            aria-label="Close quests dialog"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: 12,
              padding: '6px 12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Auto-collect banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))',
            border: '1px solid rgba(129,140,248,0.3)',
            borderRadius: 14,
            padding: '8px 12px',
            fontSize: 11,
            color: '#c7d2fe',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Sparkles size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span>Completed rotation quests auto-collect rewards when their timer ends!</span>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            background: '#1e293b',
            padding: 4,
            borderRadius: 14
          }}
        >
          <button
            role="tab"
            aria-selected={activeTab === 'flash'}
            onClick={() => setActiveTab('flash')}
            style={{
              background: activeTab === 'flash' ? '#3b82f6' : 'transparent',
              color: activeTab === 'flash' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 10,
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Zap size={13} /> FLASH
            </div>
            {flashClaimable > 0 && (
              <span className="bb-streak-dot" style={{ position: 'absolute', top: 4, right: 6 }} />
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'daily'}
            onClick={() => setActiveTab('daily')}
            style={{
              background: activeTab === 'daily' ? '#10b981' : 'transparent',
              color: activeTab === 'daily' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 10,
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Calendar size={13} /> DAILY
            </div>
            {dailyClaimable > 0 && (
              <span className="bb-streak-dot" style={{ position: 'absolute', top: 4, right: 6 }} />
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'weekly'}
            onClick={() => setActiveTab('weekly')}
            style={{
              background: activeTab === 'weekly' ? '#8b5cf6' : 'transparent',
              color: activeTab === 'weekly' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 10,
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Award size={13} /> WEEKLY
            </div>
            {weeklyClaimable > 0 && (
              <span className="bb-streak-dot" style={{ position: 'absolute', top: 4, right: 6 }} />
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'lifetime'}
            onClick={() => setActiveTab('lifetime')}
            style={{
              background: activeTab === 'lifetime' ? '#f59e0b' : 'transparent',
              color: activeTab === 'lifetime' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: 10,
              padding: '8px 4px',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Trophy size={13} /> GOALS
            </div>
            {lifetimeClaimable > 0 && (
              <span className="bb-streak-dot" style={{ position: 'absolute', top: 4, right: 6 }} />
            )}
          </button>
        </div>

        {/* Countdown header for rotation tabs */}
        {countdown && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#1e293b',
              padding: '8px 14px',
              borderRadius: 12,
              fontSize: 12,
              border: '1px solid #334155'
            }}
          >
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="#f59e0b" />
              {activeTab === 'flash' ? '4-Hour Flash Rush' : activeTab === 'daily' ? 'Daily Refresh' : 'Weekly Season Challenge'}
            </span>
            <span style={{ color: '#fde047', fontFamily: 'monospace', fontWeight: 800 }}>
              {countdown.formatted}
            </span>
          </div>
        )}

        {/* Content list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeTab !== 'lifetime' ? (
            activeRotationQuests.map(quest => {
              const isComplete = quest.current >= quest.goal;
              const isClaimable = isComplete && !quest.claimed;
              const pct = Math.min(100, Math.round((quest.current / quest.goal) * 100));

              return (
                <div
                  key={quest.id}
                  style={{
                    background: '#1e293b',
                    borderRadius: 16,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: isClaimable ? '1px solid #f59e0b' : '1px solid #334155'
                  }}
                >
                  <div style={{ fontSize: 32, flexShrink: 0 }}>{quest.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc', marginBottom: 2 }}>
                      {quest.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                      {quest.desc}
                    </div>
                    {/* Progress track */}
                    <div
                      className="bb-progress-track"
                      style={{ height: 8 }}
                      role="progressbar"
                      aria-label={quest.title + ' progress'}
                      aria-valuemin={0}
                      aria-valuemax={quest.goal}
                      aria-valuenow={quest.current}
                    >
                      <div className="bb-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#b6cce2', marginTop: 4 }}>
                      <span>{quest.current.toLocaleString()} / {quest.goal.toLocaleString()}</span>
                      <span>
                        🪙 {quest.reward.coins.toLocaleString()}
                        {quest.reward.materials > 0 && ` · 🧱 ${quest.reward.materials}`}
                        {quest.reward.energy > 0 && ` · ⚡ ${quest.reward.energy}`}
                      </span>
                    </div>
                  </div>

                  {quest.claimed ? (
                    <span style={{ color: '#6ee7b7', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                      DONE ✓
                    </span>
                  ) : (
                    <button
                      className="bb-control"
                      onClick={() => claimRotationQuest(quest.cadence, quest.id)}
                      disabled={!isClaimable || isRolling || !!rewardPresentation}
                      style={{
                        background: isClaimable ? '#f59e0b' : '#334155',
                        color: isClaimable ? '#422006' : '#64748b',
                        border: 'none',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontWeight: 900,
                        cursor: isClaimable ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      CLAIM
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            lifetimeQuests.map(q => (
              <div
                key={q.def.id}
                style={{
                  background: '#1e293b',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: q.state === 'claimable' ? '1px solid #f59e0b' : '1px solid #334155'
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>{q.def.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc', marginBottom: 2 }}>
                    {q.def.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                    {q.def.desc}
                  </div>
                  <div
                    className="bb-progress-track"
                    style={{ height: 8 }}
                    role="progressbar"
                    aria-label={q.def.name + ' progress'}
                    aria-valuemin={0}
                    aria-valuemax={q.goal}
                    aria-valuenow={q.have}
                  >
                    <div
                      className="bb-progress-fill"
                      style={{ width: `${q.goal ? (100 * q.have) / q.goal : 0}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#b6cce2', marginTop: 4 }}>
                    <span>{q.have} / {q.goal}</span>
                    <span>
                      🪙 {q.def.reward.coins.toLocaleString()}
                      {q.def.reward.materials > 0 && ` · 🧱 ${q.def.reward.materials}`}
                      {q.def.reward.energy > 0 && ` · ⚡ ${q.def.reward.energy}`}
                    </span>
                  </div>
                </div>

                {q.state === 'claimed' ? (
                  <span style={{ color: '#6ee7b7', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                    DONE ✓
                  </span>
                ) : (
                  <button
                    className="bb-control"
                    onClick={() => claimQuest(q.def.id)}
                    disabled={q.state !== 'claimable' || isRolling || !!rewardPresentation}
                    style={{
                      background: q.state === 'claimable' ? '#f59e0b' : '#334155',
                      color: q.state === 'claimable' ? '#422006' : '#64748b',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: 12,
                      fontWeight: 900,
                      cursor: q.state === 'claimable' ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    CLAIM
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Lifetime Stats footer */}
        <div style={{ marginTop: 4 }}>
          <div className="bb-micro" style={{ marginBottom: 6, letterSpacing: '.06em' }}>
            LIFETIME STATS
          </div>
          <div className="bb-mini-tally" style={{ justifyContent: 'space-between' }} aria-label="Lifetime statistics">
            <span title="Total dice rolls">🎲 {totalRolls.toLocaleString()}</span>
            <span title="Doubles rolled">🍀 {doublesTotal.toLocaleString()}</span>
            <span title="Jackpots landed">✨ {jackpotsHit.toLocaleString()}</span>
            <span title="Buildings upgraded">🔨 {upgradesBuilt.toLocaleString()}</span>
            <span title="Raids & heists">⚔️ {(raidsCompleted + heistsCompleted).toLocaleString()}</span>
            <span title="Districts unlocked">🗺️ {unlockedDistricts.length}/{districts.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
