import { useEffect, useRef, useState } from 'react';
import { validPicks, type MinigameProps } from '../contracts';
import { playCoins, playShield, playBuild, playClick, buzz } from '../../services/audio/sfx';

type Phase = 'aim' | 'flying' | 'impact';

/* Isometric 2.5D Building Visuals */
function WorkshopIsometric({ damaged }: { damaged?: boolean }) {
  return (
    <svg className="bb-raid-iso-svg" viewBox="0 0 100 90" aria-hidden="true">
      <defs>
        <linearGradient id="roofWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="wallLeft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="wallRight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id="furnaceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>
      {/* Chimney */}
      <polygon points="26,22 34,17 38,20 30,25" fill="#475569" />
      <polygon points="34,17 38,20 38,36 34,33" fill="#334155" />
      <circle className="bb-raid-smoke bb-raid-smoke-1" cx="30" cy="12" r="3" fill="#cbd5e1" opacity="0.6" />
      <circle className="bb-raid-smoke bb-raid-smoke-2" cx="28" cy="6" r="4.5" fill="#e2e8f0" opacity="0.4" />

      {/* Main Building Body */}
      {/* Left Wall */}
      <polygon points="14,46 50,65 50,84 14,65" fill="url(#wallLeft)" />
      {/* Right Wall */}
      <polygon points="50,65 86,46 86,65 50,84" fill="url(#wallRight)" />
      {/* Roof Left */}
      <polygon points="10,44 50,22 50,38 10,60" fill="url(#roofWood)" />
      {/* Roof Right */}
      <polygon points="50,22 90,44 90,60 50,38" fill="#dc2626" />
      
      {/* Furnace Archway Glow */}
      <polygon points="44,68 56,62 56,76 44,82" fill="url(#furnaceGlow)" />
      {/* Cog Emblem on Roof Gable */}
      <circle cx="50" cy="30" r="5" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
      {damaged && <path d="M48,22 L52,38 L45,55 L55,75" stroke="#1e293b" strokeWidth="2.5" fill="none" />}
    </svg>
  );
}

function MarketIsometric({ damaged }: { damaged?: boolean }) {
  return (
    <svg className="bb-raid-iso-svg" viewBox="0 0 100 90" aria-hidden="true">
      <defs>
        <linearGradient id="awningStripeRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="marketWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Counter Base */}
      <polygon points="16,50 50,68 50,84 16,66" fill="url(#marketWood)" />
      <polygon points="50,68 84,50 84,66 50,84" fill="#78350f" />

      {/* Produce Crates & Gold */}
      <polygon points="26,52 38,46 48,51 36,57" fill="#fbbf24" />
      <polygon points="52,52 64,46 74,51 62,57" fill="#f59e0b" />

      {/* Pillars */}
      <line x1="20" y1="50" x2="20" y2="34" stroke="#78350f" strokeWidth="3" />
      <line x1="80" y1="50" x2="80" y2="34" stroke="#78350f" strokeWidth="3" />
      <line x1="50" y1="68" x2="50" y2="52" stroke="#451a03" strokeWidth="3" />

      {/* Canopy Awning */}
      <polygon points="12,34 50,16 88,34 50,52" fill="#fef08a" />
      <polygon points="12,34 26,27 34,45 20,52" fill="url(#awningStripeRed)" />
      <polygon points="40,21 54,28 46,46 32,39" fill="url(#awningStripeRed)" />
      <polygon points="68,24 82,31 74,49 60,42" fill="url(#awningStripeRed)" />

      {/* Hanging Golden Lantern */}
      <circle cx="50" cy="55" r="4" fill="#fde047" />
      {damaged && <path d="M30,30 L50,50 L70,30" stroke="#18181b" strokeWidth="2.5" fill="none" />}
    </svg>
  );
}

function TowerIsometric({ damaged }: { damaged?: boolean }) {
  return (
    <svg className="bb-raid-iso-svg" viewBox="0 0 100 90" aria-hidden="true">
      <defs>
        <linearGradient id="stoneWall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="goldRoof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Stone Fortress Keep Base */}
      <polygon points="22,40 50,54 50,84 22,70" fill="url(#stoneWall)" />
      <polygon points="50,54 78,40 78,70 50,84" fill="#334155" />

      {/* Golden Arched Door */}
      <polygon points="42,66 58,58 58,78 42,86" fill="#fde047" stroke="#b45309" strokeWidth="1" />

      {/* Upper Battlements */}
      <polygon points="18,34 50,18 82,34 50,50" fill="#94a3b8" />
      <polygon points="18,28 26,24 26,34 18,38" fill="#475569" />
      <polygon points="34,20 42,16 42,26 34,30" fill="#475569" />
      <polygon points="58,16 66,20 66,30 58,26" fill="#334155" />
      <polygon points="74,24 82,28 82,38 74,34" fill="#334155" />

      {/* Royal Flagpole & Banner */}
      <line x1="50" y1="18" x2="50" y2="6" stroke="#fbbf24" strokeWidth="2" />
      <polygon points="50,6 64,10 50,14" fill="#ef4444" />
      {damaged && <path d="M40,25 L50,45 L45,65" stroke="#0f172a" strokeWidth="2.5" fill="none" />}
    </svg>
  );
}

export function TownRaid({ encounter, reducedMotion, onComplete }: MinigameProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('aim');
  const [finished, setFinished] = useState(false);
  const completedRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const choose = (index: number) => {
    if (selected !== null || finished) return;
    setSelected(index);
    buzz(25);

    if (reducedMotion) {
      setPhase('impact');
      triggerImpactEffects(encounter.options[index]);
      return;
    }

    setPhase('flying');
    timers.current.push(
      window.setTimeout(() => {
        setPhase('impact');
        triggerImpactEffects(encounter.options[index]);
      }, 750)
    );
  };

  const triggerImpactEffects = (opt?: (typeof encounter.options)[0]) => {
    if (!opt) return;
    if (opt.shielded) {
      playShield();
      buzz([25, 40, 25]);
    } else {
      playCoins();
      playBuild();
      buzz(40);
    }
  };

  const collect = () => {
    if (completedRef.current || finished || selected === null || phase !== 'impact') return;
    if (!validPicks('raid', encounter.options.length, [selected])) return;
    completedRef.current = true;
    setFinished(true);
    playClick();
    onComplete([selected]);
  };

  const target = selected !== null ? encounter.options[selected] : null;

  return (
    <div className="bb-mini bb-raid-modal" role="group" aria-label="Town raid: strike one NPC landmark">
      {/* Recon Header */}
      <div className="bb-mini-head bb-raid-header">
        <div className="bb-raid-crest-badge" aria-hidden="true">
          <span className="bb-raid-swords-icon">⚔️</span>
        </div>
        <h2 className="bb-mini-title bb-raid-title">TOWN RAID</h2>
        <div className="bb-raid-intel-pill">
          <span className="bb-raid-intel-dot" />
          <span>RIVAL DISTRICT OUTPOST</span>
        </div>
        <p className="bb-mini-sub bb-raid-subtitle">
          Choose a rival landmark to launch an artillery strike and plunder their vault!
        </p>
      </div>

      {/* Tactical Raid Arena */}
      <div className="bb-raid-stage" data-phase={phase}>
        {/* Projectile Flight Animation */}
        {phase === 'flying' && selected !== null && (
          <div className="bb-raid-missile-flight" data-target-col={selected} aria-hidden="true">
            <div className="bb-raid-shell-core" />
            <div className="bb-raid-smoke-trail" />
          </div>
        )}

        {/* 3 Isometric Target Plots */}
        <div className="bb-raid-targets">
          {encounter.options.map((option, i) => {
            const isTarget = selected === i;
            const showHit = isTarget && phase === 'impact';
            const isShielded = !!option.shielded;

            return (
              <button
                key={i}
                type="button"
                className={`bb-raid-target ${isTarget ? 'bb-raid-target--selected' : ''}`}
                data-selected={isTarget}
                data-shielded={isShielded}
                data-hit={showHit && !isShielded}
                data-blocked={showHit && isShielded}
                disabled={selected !== null || finished}
                onClick={() => choose(i)}
                aria-label={`${option.label}, ${isShielded ? 'shielded defense' : 'unshielded'}`}
                aria-pressed={isTarget}
              >
                {/* Tactical Reticle Over Target */}
                {(isTarget || selected === null) && (
                  <div className={`bb-raid-reticle ${isTarget ? 'bb-raid-reticle--locked' : ''}`} aria-hidden="true">
                    <span className="bb-raid-reticle-corner tl" />
                    <span className="bb-raid-reticle-corner tr" />
                    <span className="bb-raid-reticle-corner bl" />
                    <span className="bb-raid-reticle-corner br" />
                    {isTarget && <span className="bb-raid-reticle-center" />}
                  </div>
                )}

                {/* 3D Isometric Pedestal & Building */}
                <div className="bb-raid-isometric-podium">
                  <div className="bb-raid-ground-disc" />

                  {/* Hexagonal Forcefield Dome if shielded */}
                  {isShielded && (
                    <div className={`bb-raid-hex-dome ${showHit ? 'bb-raid-hex-dome--flare' : ''}`} aria-hidden="true">
                      <div className="bb-raid-hex-grid" />
                      <div className="bb-raid-shield-tag">🛡️ BARRED</div>
                    </div>
                  )}

                  {/* Impact Explosive Flash & Sparks */}
                  {showHit && !isShielded && (
                    <div className="bb-raid-blast-fx" aria-hidden="true">
                      <span className="bb-raid-blast-ring" />
                      <span className="bb-raid-blast-flash" />
                      <span className="bb-raid-blast-rubble r1" />
                      <span className="bb-raid-blast-rubble r2" />
                      <span className="bb-raid-blast-rubble r3" />
                      <span className="bb-raid-coins-geyser">🪙 🪙 🪙</span>
                    </div>
                  )}

                  {/* Impact Deflection Waves if blocked */}
                  {showHit && isShielded && (
                    <div className="bb-raid-deflect-fx" aria-hidden="true">
                      <span className="bb-raid-deflect-wave" />
                      <span className="bb-raid-shield-pop-badge">🛡️ BLOCKED!</span>
                    </div>
                  )}

                  {/* Voxel Building Diorama based on index */}
                  <div className="bb-raid-building-mesh">
                    {i === 0 && <WorkshopIsometric damaged={showHit && !isShielded} />}
                    {i === 1 && <MarketIsometric damaged={showHit && !isShielded} />}
                    {i === 2 && <TowerIsometric damaged={showHit && !isShielded} />}
                  </div>
                </div>

                {/* Target Metadata & Payout */}
                <div className="bb-raid-card-info">
                  <span className="bb-raid-landmark-name">{option.label.replace(/^[^\w\s]+/, '').trim()}</span>
                  <div className="bb-raid-loot-row">
                    <span className="bb-raid-coin-val">🪙 {option.coins.toLocaleString()}</span>
                    {option.materials ? <span className="bb-raid-mat-val">🧱 +{option.materials}</span> : null}
                    {option.energy ? <span className="bb-raid-energy-val">⚡ +{option.energy}</span> : null}
                  </div>
                  {isShielded && (
                    <span className="bb-raid-shield-warning">50% Loot · Barricaded</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Tactical Combat Readout */}
      <div className="bb-mini-tally bb-raid-tactical-status" role="status" aria-live="polite">
        {selected === null && '🎯 Tap a landmark to launch strike'}
        {selected !== null && phase === 'flying' && '🚀 Artillery shell incoming...'}
        {selected !== null && phase === 'impact' && target && (
          target.shielded ? (
            <span className="bb-raid-status-blocked">
              🛡️ <strong>BLOCKED!</strong> Barricade absorbed damage — Loot saved: 🪙 {target.coins.toLocaleString()}
            </span>
          ) : (
            <span className="bb-raid-status-hit">
              💥 <strong>DIRECT HIT!</strong> Vault plundered — 🪙 {target.coins.toLocaleString()}
              {target.materials ? ` · 🧱 +${target.materials}` : ''}
              {target.energy ? ` · ⚡ +${target.energy}` : ''}
            </span>
          )
        )}
      </div>

      {/* Action Button */}
      <div className="bb-mini-actions bb-raid-actions">
        <button
          type="button"
          className="bb-control bb-mini-collect bb-raid-strike-btn"
          disabled={selected === null || phase !== 'impact' || finished}
          onClick={collect}
        >
          {finished ? (
            '✓ LOOT COLLECTED'
          ) : selected === null ? (
            'CHOOSE TARGET'
          ) : phase !== 'impact' ? (
            'STRIKING...'
          ) : (
            'CLAIM LOOT 💥'
          )}
        </button>
      </div>
    </div>
  );
}

