import { useState } from 'react';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Hammer,
  Sparkles,
  Wrench,
  Lock,
  Rocket,
  Crown
} from 'lucide-react';
import { useGameStore, nextLockedDistrict } from '../store/gameStore';
import { buildingUpgradeCost } from '../game/rollRules';
import { districtComplete } from '../game/quests';
import { ResourceIcon } from './ResourceIcon';
import { playClick, playFanfare, buzz } from '../services/audio/sfx';
import './IslandView.css';

interface IslandViewProps {
  onClose: () => void;
}

export function IslandView({ onClose }: IslandViewProps) {
  const {
    coins,
    materials,
    shields,
    maxShields,
    districts,
    currentDistrict,
    unlockedDistricts,
    upgradeBuilding,
    repairBuilding,
    setDistrict,
    unlockDistrict,
    isRolling
  } = useGameStore();

  const [selectedDistrict, setSelectedDistrict] = useState<number>(currentDistrict);
  const [upgradingPlot, setUpgradingPlot] = useState<number | null>(null);

  const dist = districts[selectedDistrict] ?? districts[currentDistrict];
  const isUnlocked = unlockedDistricts.includes(selectedDistrict);
  const isCurrent = selectedDistrict === currentDistrict;

  // Star calculation
  const totalStars = (dist?.buildings.length ?? 0) * 4;
  const completedStars = dist?.buildings.reduce((sum, b) => sum + b.tier, 0) ?? 0;
  const starPercentage = totalStars > 0 ? (completedStars / totalStars) * 100 : 0;
  const isDistrictComplete = dist ? districtComplete(dist) : false;

  // Next locked district in progression
  const nextLocked = nextLockedDistrict(districts, unlockedDistricts);
  const nextDistrictDef = nextLocked !== null ? districts[nextLocked] : null;

  // Quick build: find cheapest unmaxed, undamaged building
  const availableUpgrades = isCurrent && dist
    ? dist.buildings
        .map((b, idx) => ({ building: b, idx, cost: buildingUpgradeCost(b) }))
        .filter(({ building }) => building.tier < 4 && !building.damaged)
        .sort((a, b) => a.cost.coins - b.cost.coins)
    : [];

  const cheapestBuild = availableUpgrades[0];
  const canAffordCheapest = cheapestBuild
    ? coins >= cheapestBuild.cost.coins && materials >= cheapestBuild.cost.materials
    : false;

  const handleDistrictNav = (dir: -1 | 1) => {
    const nextIdx = selectedDistrict + dir;
    if (nextIdx >= 0 && nextIdx < districts.length) {
      playClick();
      setSelectedDistrict(nextIdx);
    }
  };

  const handleUpgrade = (idx: number) => {
    if (!isCurrent) {
      setDistrict(selectedDistrict);
      return;
    }
    const b = dist.buildings[idx];
    if (!b) return;
    const { coins: cost, materials: mats } = buildingUpgradeCost(b);
    if (coins >= cost && materials >= mats && b.tier < 4 && !b.damaged) {
      setUpgradingPlot(idx);
      upgradeBuilding(idx);
      buzz(25);
      window.setTimeout(() => setUpgradingPlot(null), 400);
    }
  };

  const handleRepair = (idx: number) => {
    if (!isCurrent) {
      setDistrict(selectedDistrict);
      return;
    }
    repairBuilding(idx);
    buzz(30);
  };

  const handleWarp = () => {
    playFanfare();
    unlockDistrict();
  };

  // Landmark visual silhouettes by tier
  const getLandmarkBadge = (tier: number, damaged: boolean) => {
    if (damaged) return '🚨';
    if (tier === 0) return '🚧';
    if (tier === 1) return '🪵';
    if (tier === 2) return '🧱';
    if (tier === 3) return '🏰';
    return '👑';
  };

  return (
    <div className="bb-island-overlay" role="dialog" aria-modal="true" aria-label="Island Progression Stage">
      {/* Top Bar: Navigation & Resources */}
      <div className="bb-island-topbar">
        <button
          className="bb-island-back-btn"
          onClick={() => {
            playClick();
            onClose();
          }}
          aria-label="Return to dice board"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>BOARD</span>
        </button>

        <div className="bb-island-resources">
          <div className="bb-island-res-pill bb-island-res-pill--coins" aria-label={`${coins.toLocaleString()} Coins`}>
            <ResourceIcon kind="coins" labelled={false} />
            <span>{coins.toLocaleString()}</span>
          </div>
          <div className="bb-island-res-pill bb-island-res-pill--materials" aria-label={`${materials.toLocaleString()} Building Blocks`}>
            <ResourceIcon kind="materials" labelled={false} />
            <span>{materials.toLocaleString()}</span>
          </div>
        </div>

        <button
          className="bb-island-close-btn"
          onClick={() => {
            playClick();
            onClose();
          }}
          aria-label="Close island view"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Sub Bar: District Title, World Switcher, Stars & Shields */}
      <div className="bb-island-subbar">
        <div className="bb-island-nav-row">
          <button
            className="bb-island-nav-btn"
            onClick={() => handleDistrictNav(-1)}
            disabled={selectedDistrict === 0}
            aria-label="Previous island"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <div className="bb-island-title-block">
            <div className="bb-island-badge-row">
              <span className="bb-island-level-badge">
                ISLAND {String(selectedDistrict + 1).padStart(2, '0')} / {String(districts.length).padStart(2, '0')}
              </span>
              {!isUnlocked && (
                <span className="bb-island-level-badge" style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>
                  LOCKED 🔒
                </span>
              )}
              {isUnlocked && !isCurrent && (
                <button
                  onClick={() => {
                    playClick();
                    setDistrict(selectedDistrict);
                  }}
                  className="bb-island-level-badge"
                  style={{ color: '#a78bfa', borderColor: '#a78bfa', cursor: 'pointer', background: 'rgba(167,139,250,0.15)' }}
                >
                  SWITCH HERE
                </button>
              )}
            </div>
            <h2 className="bb-island-name">{dist.name}</h2>
            <div className="bb-island-subtitle">{dist.subtitle}</div>
          </div>

          <button
            className="bb-island-nav-btn"
            onClick={() => handleDistrictNav(1)}
            disabled={selectedDistrict === districts.length - 1}
            aria-label="Next island"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Progress & Shield Indicators */}
        <div className="bb-island-status-row">
          <div className="bb-island-star-gauge">
            <div className="bb-island-star-label">
              <span>⭐ ISLAND STARS</span>
              <span>{completedStars} / {totalStars}</span>
            </div>
            <div className="bb-island-star-bar" role="progressbar" aria-valuenow={completedStars} aria-valuemin={0} aria-valuemax={totalStars}>
              <div className="bb-island-star-fill" style={{ width: `${starPercentage}%` }} />
            </div>
          </div>

          {/* Monopoly Go PvP Defense Shield Indicator */}
          <div
            className={`bb-island-defense-badge ${
              shields > 0 ? 'bb-island-defense-badge--shielded' : 'bb-island-defense-badge--vulnerable'
            }`}
            title={shields > 0 ? 'Protected from rival raid damage' : 'Vulnerable to rival attacks!'}
          >
            <Shield size={14} aria-hidden="true" />
            <span>
              {shields > 0 ? `SHIELDED: ${shields}/${maxShields}` : `VULNERABLE: 0/${maxShields}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Island Stage */}
      <div className="bb-island-stage" data-theme={dist.id}>
        <div className="bb-island-clouds" aria-hidden="true" />

        {/* Island Warp & Completion Banner */}
        {isDistrictComplete && isUnlocked && (
          <div className="bb-island-warp-banner">
            <div>
              <div className="bb-island-warp-title">
                🌟 {dist.name.toUpperCase()} 100% MASTERED!
              </div>
              <div className="bb-island-warp-sub">
                {nextDistrictDef
                  ? `Ready to travel to ${nextDistrictDef.name}!`
                  : 'All available islands completed! You are the Board Master!'}
              </div>
            </div>
            {nextDistrictDef && (
              <button className="bb-island-warp-btn" onClick={handleWarp}>
                <Rocket size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                WARP TO NEXT ISLAND
              </button>
            )}
          </div>
        )}

        {/* Locked Overlay if viewing a locked island */}
        {!isUnlocked ? (
          <div className="bb-island-locked-overlay">
            <div className="bb-island-locked-icon">
              <Lock size={44} aria-hidden="true" />
            </div>
            <div className="bb-island-locked-title">{dist.name} is Locked</div>
            <div className="bb-island-locked-desc">
              Upgrade all landmarks in {districts[selectedDistrict - 1]?.name ?? 'the previous island'} to Tier 4
              to unlock this territory and travel forward!
            </div>
            <button
              className="bb-btn-upgrade"
              style={{ marginTop: 8 }}
              onClick={() => setSelectedDistrict(currentDistrict)}
            >
              RETURN TO {districts[currentDistrict].name.toUpperCase()}
            </button>
          </div>
        ) : (
          /* 5 Landmark Dioramas */
          <div className="bb-island-landmarks-grid">
            {dist.buildings.map((b, idx) => {
              const { coins: cost, materials: mats } = buildingUpgradeCost(b);
              const canAfford = coins >= cost && materials >= mats && b.tier < 4 && !b.damaged && isCurrent;
              const isUpgrading = upgradingPlot === idx;

              return (
                <div
                  key={b.id}
                  className={`bb-landmark-card ${b.damaged ? 'bb-landmark-card--damaged' : ''} ${
                    b.tier >= 4 ? 'bb-landmark-card--maxed' : ''
                  }`}
                >
                  {/* Left: 3D Landmark Silhouette Diorama */}
                  <div className="bb-landmark-diorama">
                    <div className={`bb-landmark-tier-ring bb-landmark-tier-ring--${b.tier}`} />
                    <span className="bb-landmark-icon-art" role="img" aria-label={b.name}>
                      {b.icon}
                    </span>
                    {b.damaged ? (
                      <div className="bb-landmark-damage-tag">SMASHED!</div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 4,
                          fontSize: 10,
                          fontWeight: 900,
                          opacity: 0.9
                        }}
                      >
                        {getLandmarkBadge(b.tier, b.damaged)}
                      </div>
                    )}
                  </div>

                  {/* Center: Landmark Info, Tier Stars, & Costs */}
                  <div className="bb-landmark-body">
                    <div className="bb-landmark-name">{b.name}</div>
                    
                    {/* Star Gauge Pips (4 tiers) */}
                    <div className="bb-landmark-tier-stars" aria-label={`Tier ${b.tier} of 4`}>
                      {[1, 2, 3, 4].map(starIndex => (
                        <span
                          key={starIndex}
                          className={`bb-star-pip ${starIndex <= b.tier ? 'bb-star-pip--active' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginLeft: 4 }}>
                        Tier {b.tier}/4
                      </span>
                    </div>

                    {/* Cost Pills */}
                    {!b.damaged && b.tier < 4 && (
                      <div className="bb-landmark-cost-line">
                        <div className={`bb-cost-chip ${coins >= cost ? 'bb-cost-chip--ok' : 'bb-cost-chip--short'}`}>
                          <span>🪙</span>
                          <span>{cost.toLocaleString()}</span>
                        </div>
                        <div className={`bb-cost-chip ${materials >= mats ? 'bb-cost-chip--ok' : 'bb-cost-chip--short'}`}>
                          <span>🧱</span>
                          <span>{mats}</span>
                        </div>
                      </div>
                    )}

                    {b.damaged && (
                      <div style={{ fontSize: 11, color: '#fca5a5', fontWeight: 800 }}>
                        Attacked by rival! Smashed until repaired.
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="bb-landmark-actions">
                    {b.damaged ? (
                      <button
                        className="bb-btn-repair"
                        onClick={() => handleRepair(idx)}
                        disabled={coins < 2500 || !isCurrent}
                        aria-label={`Repair ${b.name} for 2,500 coins`}
                      >
                        <Wrench size={14} aria-hidden="true" />
                        <span>REPAIR (🪙 2.5k)</span>
                      </button>
                    ) : b.tier >= 4 ? (
                      <div className="bb-plate-maxed" aria-label={`${b.name} is fully upgraded`}>
                        <Crown size={14} aria-hidden="true" />
                        <span>MAXED ★</span>
                      </div>
                    ) : (
                      <button
                        className="bb-btn-upgrade"
                        onClick={() => handleUpgrade(idx)}
                        disabled={!canAfford || isRolling || !isCurrent}
                        aria-label={`Upgrade ${b.name} to Tier ${b.tier + 1}`}
                      >
                        <Hammer size={14} aria-hidden="true" />
                        <span>{isUpgrading ? 'BUILDING...' : 'UPGRADE'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Quick-Build Bar (Monopoly Go Style) */}
      {isCurrent && cheapestBuild && (
        <div className="bb-island-bottombar">
          <div className="bb-island-quick-info">
            <span className="bb-island-quick-label">⚡ QUICK UPGRADE</span>
            <span className="bb-island-quick-title">
              {cheapestBuild.building.name} · Tier {cheapestBuild.building.tier + 1}
              <span style={{ color: '#fde047', marginLeft: 6 }}>
                (🪙 {cheapestBuild.cost.coins.toLocaleString()} · 🧱 {cheapestBuild.cost.materials})
              </span>
            </span>
          </div>

          <button
            className="bb-island-quick-btn"
            onClick={() => handleUpgrade(cheapestBuild.idx)}
            disabled={!canAffordCheapest || isRolling}
            aria-label={`Quick upgrade ${cheapestBuild.building.name}`}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>QUICK BUILD</span>
          </button>
        </div>
      )}
    </div>
  );
}
