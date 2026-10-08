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
  Crown,
  Check,
  Compass
} from 'lucide-react';
import { useGameStore, nextLockedDistrict } from '../store/gameStore';
import { buildingUpgradeCost } from '../game/rollRules';
import { districtComplete } from '../game/quests';
import { ResourceIcon } from './ResourceIcon';
import { playClick, playFanfare, playBuild, buzz } from '../services/audio/sfx';
import './IslandView.css';

interface IslandViewProps {
  onClose: () => void;
}

/** 3D-styled Isometric Landmark Diorama with Visual Tier Evolution (Tiers 0–4) */
function IsometricLandmarkStage({
  tier,
  damaged,
  icon,
  name,
  districtId,
  isUpgrading
}: {
  tier: number;
  damaged: boolean;
  icon: string;
  name: string;
  districtId: number;
  isUpgrading: boolean;
}) {
  // Theme styling for base plinth
  const plinthTheme = districtId === 1 ? 'candy' : districtId === 2 ? 'neon' : 'suburb';

  return (
    <div className={`bb-diorama-stage bb-diorama-stage--${plinthTheme}`} aria-hidden="true">
      {/* Upgrading Hammer Burst FX */}
      {isUpgrading && (
        <div className="bb-diorama-upgrade-burst">
          <span className="bb-upgrade-spark s1">✨</span>
          <span className="bb-upgrade-spark s2">⭐</span>
          <span className="bb-upgrade-spark s3">🔨</span>
          <span className="bb-upgrade-flash" />
        </div>
      )}

      {/* Floating Tier Crown / Alert Badge */}
      {damaged ? (
        <div className="bb-diorama-alert-tag">🚨 SMASHED</div>
      ) : tier >= 4 ? (
        <div className="bb-diorama-crown-tag">
          <Crown size={12} className="bb-crown-icon" />
          <span>MASTER</span>
        </div>
      ) : null}

      {/* Isometric 3D Model Render */}
      <svg className="bb-diorama-svg" viewBox="0 0 110 100">
        <defs>
          {/* Ground Plinth Gradients */}
          <linearGradient id="candyPlinthTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="candyPlinthSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#831843" />
            <stop offset="100%" stopColor="#500724" />
          </linearGradient>

          <linearGradient id="suburbPlinthTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="suburbPlinthSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          <linearGradient id="neonPlinthTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="neonPlinthSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Roof Gradients */}
          <linearGradient id="tierRoofGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={districtId === 1 ? '#f43f5e' : districtId === 2 ? '#a855f7' : '#3b82f6'} />
            <stop offset="100%" stopColor={districtId === 1 ? '#9f1239' : districtId === 2 ? '#6b21a8' : '#1d4ed8'} />
          </linearGradient>

          {/* Gold Trim for Tier 4 */}
          <linearGradient id="goldMasterGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* 3D Isometric Ground Pedestal */}
        <g className="bb-diorama-plinth">
          {/* Base Sides */}
          <polygon
            points="15,68 55,86 55,96 15,78"
            fill={districtId === 1 ? 'url(#candyPlinthSide)' : districtId === 2 ? 'url(#neonPlinthSide)' : 'url(#suburbPlinthSide)'}
          />
          <polygon
            points="55,86 95,68 95,78 55,96"
            fill={districtId === 1 ? '#40061d' : districtId === 2 ? '#070b19' : '#032010'}
          />
          {/* Base Top Surface */}
          <polygon
            points="15,68 55,50 95,68 55,86"
            fill={districtId === 1 ? 'url(#candyPlinthTop)' : districtId === 2 ? 'url(#neonPlinthTop)' : 'url(#suburbPlinthTop)'}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
          />
        </g>

        {/* ============================================================== */}
        {/* TIER 0: Blueprints, Foundation Scaffolding & Warning Stripes   */}
        {/* ============================================================== */}
        {tier === 0 && !damaged && (
          <g className="bb-diorama-tier-0">
            {/* Blueprint Grid Pad */}
            <polygon points="30,62 55,51 80,62 55,73" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
            <line x1="42" y1="56" x2="68" y2="68" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="2,2" />
            <line x1="68" y1="56" x2="42" y2="68" stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="2,2" />

            {/* Wooden Framework Scaffolding Posts */}
            <line x1="32" y1="62" x2="32" y2="35" stroke="#b45309" strokeWidth="2.5" />
            <line x1="78" y1="62" x2="78" y2="35" stroke="#b45309" strokeWidth="2.5" />
            <line x1="55" y1="73" x2="55" y2="44" stroke="#92400e" strokeWidth="2.5" />

            {/* Cross Beams */}
            <line x1="32" y1="46" x2="55" y2="56" stroke="#d97706" strokeWidth="1.8" />
            <line x1="55" y1="56" x2="78" y2="46" stroke="#d97706" strokeWidth="1.8" />
            <line x1="32" y1="36" x2="55" y2="46" stroke="#d97706" strokeWidth="2" />
            <line x1="55" y1="46" x2="78" y2="36" stroke="#d97706" strokeWidth="2" />

            {/* Crane / Ladder */}
            <line x1="40" y1="65" x2="48" y2="38" stroke="#fde047" strokeWidth="1.5" />
            <line x1="44" y1="67" x2="52" y2="40" stroke="#fde047" strokeWidth="1.5" />
            <line x1="41" y1="61" x2="45" y2="63" stroke="#fde047" strokeWidth="1.2" />
            <line x1="44" y1="53" x2="48" y2="55" stroke="#fde047" strokeWidth="1.2" />
            <line x1="47" y1="45" x2="51" y2="47" stroke="#fde047" strokeWidth="1.2" />

            {/* Hazard Badge */}
            <polygon points="51,32 59,32 55,24" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
          </g>
        )}

        {/* ============================================================== */}
        {/* TIER 1: Cozy Foundation & Ground Floor Landmark               */}
        {/* ============================================================== */}
        {tier === 1 && !damaged && (
          <g className="bb-diorama-tier-1">
            {/* Ground Walls */}
            <polygon points="28,58 55,70 55,52 28,40" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
            <polygon points="55,70 82,58 82,40 55,52" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
            {/* Doorway */}
            <polygon points="50,68 60,63 60,54 50,59" fill="#78350f" />
            {/* Cozy Pitched Roof */}
            <polygon points="24,40 55,22 55,36 24,54" fill="url(#tierRoofGrad)" />
            <polygon points="55,22 86,40 86,54 55,36" fill="#be123c" />
            {/* Window */}
            <polygon points="34,50 42,46 42,52 34,56" fill="#fef08a" />
          </g>
        )}

        {/* ============================================================== */}
        {/* TIER 2: Reinforced 2-Story Structure With Shingles & Chimney   */}
        {/* ============================================================== */}
        {tier === 2 && !damaged && (
          <g className="bb-diorama-tier-2">
            {/* Lower Walls */}
            <polygon points="24,62 55,76 55,56 24,42" fill="#94a3b8" />
            <polygon points="55,76 86,62 86,42 55,56" fill="#64748b" />
            {/* Lower Awnings */}
            <polygon points="22,44 55,58 88,44 55,30" fill="url(#tierRoofGrad)" />
            {/* Upper Story Walls */}
            <polygon points="32,40 55,50 55,32 32,22" fill="#f8fafc" />
            <polygon points="55,50 78,40 78,22 55,32" fill="#e2e8f0" />
            {/* Upper Roof */}
            <polygon points="28,24 55,10 82,24 55,38" fill="url(#tierRoofGrad)" />
            {/* Chimney */}
            <polygon points="66,16 72,13 75,15 69,18" fill="#475569" />
            <polygon points="69,18 75,15 75,26 69,29" fill="#334155" />
            {/* Windows Glowing */}
            <polygon points="40,34 48,30 48,36 40,40" fill="#fef08a" />
            <polygon points="62,34 70,30 70,36 62,40" fill="#fef08a" />
          </g>
        )}

        {/* ============================================================== */}
        {/* TIER 3: Grand Estate Architecture With Spires & Banners       */}
        {/* ============================================================== */}
        {tier === 3 && !damaged && (
          <g className="bb-diorama-tier-3">
            {/* Lower Base Fortress Walls */}
            <polygon points="20,64 55,80 55,58 20,42" fill="#64748b" />
            <polygon points="55,80 90,64 90,42 55,58" fill="#475569" />
            {/* Arched Stone Entrance */}
            <polygon points="48,76 62,70 62,58 48,64" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
            {/* Mid Tier Shingles */}
            <polygon points="16,44 55,60 94,44 55,28" fill="url(#tierRoofGrad)" />
            {/* Grand Spire Tower */}
            <polygon points="36,36 55,44 55,18 36,10" fill="#f1f5f9" />
            <polygon points="55,44 74,36 74,10 55,18" fill="#cbd5e1" />
            {/* Steep Steeple Spire */}
            <polygon points="34,12 55,-2 76,12 55,26" fill="url(#tierRoofGrad)" />
            {/* Royal Banner & Finial */}
            <line x1="55" y1="-2" x2="55" y2="-10" stroke="#f59e0b" strokeWidth="1.8" />
            <polygon points="55,-10 67,-6 55,-2" fill="#ef4444" />
            {/* Luminous Stained Windows */}
            <polygon points="42,24 49,21 49,30 42,33" fill="#38bdf8" />
            <polygon points="61,24 68,21 68,30 61,33" fill="#38bdf8" />
          </g>
        )}

        {/* ============================================================== */}
        {/* TIER 4: CROWNED MASTERPIECE CITADEL (Golden Aura & Emblems)   */}
        {/* ============================================================== */}
        {tier >= 4 && !damaged && (
          <g className="bb-diorama-tier-4">
            {/* Golden Base Trim */}
            <polygon points="18,66 55,82 55,58 18,42" fill="url(#goldMasterGrad)" />
            <polygon points="55,82 92,66 92,42 55,58" fill="#b45309" />
            {/* Royal Portal Door */}
            <polygon points="48,78 62,72 62,56 48,62" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
            {/* Grand Palace Roof */}
            <polygon points="14,44 55,62 96,44 55,26" fill="url(#tierRoofGrad)" stroke="#fde047" strokeWidth="1.2" />
            {/* Central Cathedral Keep */}
            <polygon points="32,36 55,46 55,16 32,06" fill="#ffffff" />
            <polygon points="55,46 78,36 78,06 55,16" fill="#e2e8f0" />
            {/* Royal Golden Cupola Roof */}
            <polygon points="30,08 55,-6 80,08 55,22" fill="url(#goldMasterGrad)" stroke="#fff" strokeWidth="1" />
            {/* Floating Golden Halo Spire */}
            <circle cx="55" cy="-12" r="5" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
            <line x1="55" y1="-6" x2="55" y2="-12" stroke="#f59e0b" strokeWidth="2" />
            {/* Master Jewel Sparkles */}
            <polygon points="55,-16 57,-12 55,-8 53,-12" fill="#fff" />
            <polygon points="51,-12 55,-14 59,-12 55,-10" fill="#fff" />
          </g>
        )}

        {/* ============================================================== */}
        {/* DAMAGED STATE: Cracked Ruins, Smoke Plume & Danger Decals      */}
        {/* ============================================================== */}
        {damaged && (
          <g className="bb-diorama-damaged">
            <polygon points="26,62 55,74 55,56 26,44" fill="#475569" />
            <polygon points="55,74 84,62 84,44 55,56" fill="#334155" />
            {/* Cracked Fissures */}
            <path d="M40,65 L48,50 L42,38 L58,22" stroke="#ef4444" strokeWidth="2.5" fill="none" />
            <path d="M62,68 L56,54 L68,44" stroke="#ef4444" strokeWidth="2" fill="none" />
            {/* Smoldering Smoke Plumes */}
            <circle cx="48" cy="28" r="6" fill="#64748b" opacity="0.7" className="bb-diorama-smoke s1" />
            <circle cx="52" cy="18" r="8" fill="#475569" opacity="0.6" className="bb-diorama-smoke s2" />
            <circle cx="46" cy="8" r="10" fill="#334155" opacity="0.4" className="bb-diorama-smoke s3" />
            {/* Rubble debris */}
            <polygon points="28,66 34,68 32,72 26,70" fill="#334155" />
            <polygon points="76,68 82,66 84,70 78,72" fill="#334155" />
          </g>
        )}
      </svg>

      {/* Center Theme Icon Badge */}
      <div className="bb-diorama-icon-badge">
        <span className="bb-diorama-emoji" role="img" aria-label={name}>
          {icon}
        </span>
      </div>
    </div>
  );
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
      playBuild();
      buzz(35);
      window.setTimeout(() => setUpgradingPlot(null), 450);
    }
  };

  const handleRepair = (idx: number) => {
    if (!isCurrent) {
      setDistrict(selectedDistrict);
      return;
    }
    repairBuilding(idx);
    playBuild();
    buzz(30);
  };

  const handleWarp = () => {
    playFanfare();
    unlockDistrict();
  };

  return (
    <div className="bb-island-overlay" role="dialog" aria-modal="true" aria-label="Island Progression Stage">
      {/* Top Bar: Navigation & Resources */}
      <div className="bb-island-topbar">
        <button
          type="button"
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
          type="button"
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

      {/* Sub Bar: District Progression Header & Milestone Track */}
      <div className="bb-island-subbar">
        {/* Island Navigation Carousel Bar */}
        <div className="bb-island-nav-row">
          <button
            type="button"
            className="bb-island-nav-btn"
            onClick={() => handleDistrictNav(-1)}
            disabled={selectedDistrict === 0}
            aria-label="Previous island"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>

          <div className="bb-island-title-block">
            <div className="bb-island-badge-row">
              <span className="bb-island-level-badge">
                ISLAND {String(selectedDistrict + 1).padStart(2, '0')} / {String(districts.length).padStart(2, '0')}
              </span>
              {!isUnlocked && (
                <span className="bb-island-level-badge bb-island-level-badge--locked">
                  LOCKED 🔒
                </span>
              )}
              {isUnlocked && !isCurrent && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setDistrict(selectedDistrict);
                  }}
                  className="bb-island-level-badge bb-island-level-badge--switch"
                >
                  SWITCH HERE
                </button>
              )}
            </div>
            <h2 className="bb-island-name">{dist.name}</h2>
            <div className="bb-island-subtitle">{dist.subtitle}</div>
          </div>

          <button
            type="button"
            className="bb-island-nav-btn"
            onClick={() => handleDistrictNav(1)}
            disabled={selectedDistrict === districts.length - 1}
            aria-label="Next island"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>

        {/* Milestone Progression & Shield Defense Hub */}
        <div className="bb-island-status-row">
          {/* Milestone Track with Checkpoints (5★, 10★, 15★, 20★) */}
          <div className="bb-island-star-gauge">
            <div className="bb-island-star-label">
              <span className="bb-star-track-title">⭐ ISLAND MILESTONES</span>
              <span className="bb-star-track-counter">{completedStars} / {totalStars} ★</span>
            </div>
            <div className="bb-island-milestone-bar-wrap">
              <div className="bb-island-star-bar" role="progressbar" aria-valuenow={completedStars} aria-valuemin={0} aria-valuemax={totalStars}>
                <div className="bb-island-star-fill" style={{ width: `${starPercentage}%` }} />
              </div>
              {/* Milestone Checkpoint Gems */}
              <div className="bb-milestone-nodes" aria-hidden="true">
                <span className={`bb-milestone-node ${completedStars >= 5 ? 'active' : ''}`} style={{ left: '25%' }} title="5 Stars Milestone">
                  {completedStars >= 5 ? '✓' : '5'}
                </span>
                <span className={`bb-milestone-node ${completedStars >= 10 ? 'active' : ''}`} style={{ left: '50%' }} title="10 Stars Milestone">
                  {completedStars >= 10 ? '✓' : '10'}
                </span>
                <span className={`bb-milestone-node ${completedStars >= 15 ? 'active' : ''}`} style={{ left: '75%' }} title="15 Stars Milestone">
                  {completedStars >= 15 ? '✓' : '15'}
                </span>
                <span className={`bb-milestone-node crown ${completedStars >= 20 ? 'active' : ''}`} style={{ left: '100%' }} title="20 Stars Master!">
                  👑
                </span>
              </div>
            </div>
          </div>

          {/* Defense Shields Hub */}
          <div
            className={`bb-island-defense-badge ${
              shields > 0 ? 'bb-island-defense-badge--shielded' : 'bb-island-defense-badge--vulnerable'
            }`}
            title={shields > 0 ? 'Protected from rival raid damage' : 'Vulnerable to rival attacks!'}
          >
            <div className="bb-defense-shield-pods">
              {[1, 2, 3].map(slotIndex => (
                <span
                  key={slotIndex}
                  className={`bb-shield-pod ${slotIndex <= shields ? 'active' : 'depleted'}`}
                >
                  <Shield size={12} />
                </span>
              ))}
            </div>
            <span className="bb-defense-text">
              {shields > 0 ? `FORTIFIED (${shields}/${maxShields})` : `VULNERABLE (0/${maxShields})`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Island Stage */}
      <div className="bb-island-stage" data-theme={dist.id}>
        {/* Whimsical Environmental Elements */}
        <div className="bb-island-clouds" aria-hidden="true" />
        <div className="bb-island-sparkles" aria-hidden="true" />

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
              <button type="button" className="bb-island-warp-btn" onClick={handleWarp}>
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
              type="button"
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
              const hasCoins = coins >= cost;
              const hasMats = materials >= mats;
              const canAfford = hasCoins && hasMats && b.tier < 4 && !b.damaged && isCurrent;
              const isUpgrading = upgradingPlot === idx;

              return (
                <div
                  key={b.id}
                  className={`bb-landmark-card ${b.damaged ? 'bb-landmark-card--damaged' : ''} ${
                    b.tier >= 4 ? 'bb-landmark-card--maxed' : ''
                  }`}
                >
                  {/* Left: 3D Landmark Isometric Visual Diorama */}
                  <div className="bb-landmark-diorama-wrap">
                    <IsometricLandmarkStage
                      tier={b.tier}
                      damaged={b.damaged}
                      icon={b.icon}
                      name={b.name}
                      districtId={dist.id}
                      isUpgrading={isUpgrading}
                    />
                  </div>

                  {/* Center: Landmark Info, Tier Stars, & Costs */}
                  <div className="bb-landmark-body">
                    <div className="bb-landmark-title-row">
                      <span className="bb-landmark-name">{b.name}</span>
                      <span className={`bb-landmark-tier-chip bb-landmark-tier-chip--t${b.tier}`}>
                        {b.tier >= 4 ? 'CROWNED ★' : `Tier ${b.tier}/4`}
                      </span>
                    </div>

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
                    </div>

                    {/* Cost Status Chips */}
                    {!b.damaged && b.tier < 4 && (
                      <div className="bb-landmark-cost-line">
                        <div className={`bb-cost-chip ${hasCoins ? 'bb-cost-chip--ok' : 'bb-cost-chip--short'}`}>
                          <span>🪙</span>
                          <span>{cost.toLocaleString()}</span>
                          {hasCoins && <Check size={11} className="bb-cost-check" />}
                        </div>
                        <div className={`bb-cost-chip ${hasMats ? 'bb-cost-chip--ok' : 'bb-cost-chip--short'}`}>
                          <span>🧱</span>
                          <span>{mats}</span>
                          {hasMats && <Check size={11} className="bb-cost-check" />}
                        </div>
                      </div>
                    )}

                    {b.damaged && (
                      <div className="bb-landmark-damaged-alert">
                        Attacked by rival! Smashed until repaired.
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="bb-landmark-actions">
                    {b.damaged ? (
                      <button
                        type="button"
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
                        <span>MASTERED ★</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`bb-btn-upgrade ${canAfford ? 'bb-btn-upgrade--ready' : ''}`}
                        onClick={() => handleUpgrade(idx)}
                        disabled={!canAfford || isRolling || !isCurrent}
                        aria-label={`Upgrade ${b.name} to Tier ${b.tier + 1}`}
                      >
                        <Hammer size={14} aria-hidden="true" />
                        <span>{isUpgrading ? 'BUILDING...' : canAfford ? 'UPGRADE' : 'LOCKED'}</span>
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
            <span className="bb-island-quick-label">⚡ OPTIMAL UPGRADE</span>
            <span className="bb-island-quick-title">
              {cheapestBuild.building.name} · Tier {cheapestBuild.building.tier + 1}
              <span className="bb-quick-cost-accent">
                (🪙 {cheapestBuild.cost.coins.toLocaleString()} · 🧱 {cheapestBuild.cost.materials})
              </span>
            </span>
          </div>

          <button
            type="button"
            className={`bb-island-quick-btn ${canAffordCheapest ? 'bb-island-quick-btn--ready' : ''}`}
            onClick={() => handleUpgrade(cheapestBuild.idx)}
            disabled={!canAffordCheapest || isRolling}
            aria-label={`Quick upgrade ${cheapestBuild.building.name}`}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>QUICK BUILD</span>
          </button>
        </div>
      )}

      {/* Bottom Travel Bar when browsing another unlocked island */}
      {!isCurrent && isUnlocked && (
        <div className="bb-island-bottombar">
          <div className="bb-island-quick-info">
            <span className="bb-island-quick-label">🚀 TRAVEL TO THIS ISLAND</span>
            <span className="bb-island-quick-title">
              Set {dist.name} as your active rolling board
            </span>
          </div>

          <button
            type="button"
            className="bb-island-quick-btn bb-island-quick-btn--ready"
            onClick={() => {
              playClick();
              setDistrict(selectedDistrict);
              onClose();
            }}
            aria-label={`Travel to ${dist.name}`}
          >
            <Compass size={16} aria-hidden="true" />
            <span>TRAVEL HERE</span>
          </button>
        </div>
      )}
    </div>
  );
}

