import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ResourceIcon, type ResourceKind } from './ResourceIcon';
import './RewardPresentation.css';

const RESOURCES: ResourceKind[] = ['coins', 'materials', 'energy', 'shields'];

function representativeCount(value: number) {
  return Math.min(6, Math.max(3, Math.ceil(Math.log10(value + 1)) + 2));
}

function flightPath(dx: number, dy: number, bend: number): Keyframe[] {
  const point = (start: number, controlA: number, controlB: number, end: number, t: number) => {
    const inverse = 1 - t;
    return inverse ** 3 * start + 3 * inverse ** 2 * t * controlA + 3 * inverse * t ** 2 * controlB + t ** 3 * end;
  };
  return Array.from({ length: 21 }, (_, index) => {
    const t = index / 20;
    const x = point(0, bend * 1.8, dx - bend, dx, t);
    const y = point(0, -110, dy + 75, dy, t);
    const scale = 1 + Math.sin(t * Math.PI) * .2 - t * .75;
    return {
      transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(${scale}) rotate(${t * 400}deg)`,
      opacity: t < .82 ? 1 : 1 - (t - .82) / .18,
      offset: t
    };
  });
}

export function RewardPresentation() {
  const reward = useGameStore(state => state.rewardPresentation);
  const autoOkay = useGameStore(state => state.autoOkay);
  const finish = useGameStore(state => state.finishRewardPresentation);
  const [flying, setFlying] = useState(false);
  const iconRefs = useRef<Partial<Record<ResourceKind, HTMLDivElement>>>({});
  const collectRef = useRef<HTMLButtonElement>(null);
  const animations = useRef<Animation[]>([]);
  const timers = useRef<number[]>([]);
  const runId = useRef<string | null>(null);

  const clearWork = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    document.querySelectorAll('.bb-reward-flyer').forEach(node => node.remove());
  }, []);

  useEffect(() => clearWork, [clearWork]);
  useEffect(() => {
    clearWork();
    setFlying(false);
    runId.current = null;
  }, [clearWork, reward?.id]);

  const collect = useCallback(() => {
    if (!reward || runId.current === reward.id) return;
    runId.current = reward.id;
    setFlying(true);
    const shell = document.querySelector<HTMLElement>('.bb-shell');
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const active = RESOURCES.filter(resource => reward[resource] > 0);
    let lastFinish = 0;

    active.forEach((resource, resourceIndex) => {
      const source = iconRefs.current[resource];
      const target = shell?.querySelector<HTMLElement>(`[data-resource="${resource}"]`);
      const amount = reward[resource];
      if (!shell || !source || !target || calm) {
        shell?.dispatchEvent(new CustomEvent('bb-resource-arrive', {
          detail: { resource, value: amount, final: true, presentationId: reward.id }, bubbles: true
        }));
        return;
      }
      const shellRect = shell.getBoundingClientRect();
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const count = representativeCount(amount);
      for (let index = 0; index < count; index++) {
        const flyer = source.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
        if (!flyer) continue;
        flyer.classList.add('bb-reward-flyer');
        flyer.setAttribute('aria-hidden', 'true');
        flyer.style.left = `${from.left + from.width / 2 - shellRect.left}px`;
        flyer.style.top = `${from.top + from.height / 2 - shellRect.top}px`;
        shell.appendChild(flyer);
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        const bend = (resourceIndex % 2 ? -1 : 1) * (55 + index * 8);
        const delay = resourceIndex * 90 + index * 65;
        const duration = 680;
        const animation = flyer.animate(flightPath(dx, dy, bend), {
          duration, delay, easing: 'cubic-bezier(.22,.75,.23,1)', fill: 'forwards'
        });
        animations.current.push(animation);
        const finishAt = delay + duration;
        lastFinish = Math.max(lastFinish, finishAt);
        animation.finished.then(() => {
          flyer.remove();
          if (index === count - 1) shell.dispatchEvent(new CustomEvent('bb-resource-arrive', {
            detail: { resource, value: amount, final: true, presentationId: reward.id }, bubbles: true
          }));
        }).catch(() => {});
      }
    });

    const timer = window.setTimeout(() => finish(reward.id), calm ? 180 : lastFinish + 100);
    timers.current.push(timer);
  }, [finish, reward]);

  useEffect(() => {
    if (!reward || !autoOkay) return;
    const timer = window.setTimeout(collect, 850);
    timers.current.push(timer);
    return () => window.clearTimeout(timer);
  }, [autoOkay, collect, reward]);

  useEffect(() => {
    if (!reward || !flying) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resolveFlight = () => {
      animations.current.forEach(animation => animation.finish());
      const timer = window.setTimeout(() => finish(reward.id), 80);
      timers.current.push(timer);
    };
    const onPreference = (event: MediaQueryListEvent) => { if (event.matches) resolveFlight(); };
    preference.addEventListener('change', onPreference);
    window.addEventListener('resize', resolveFlight, { once: true });
    return () => {
      preference.removeEventListener('change', onPreference);
      window.removeEventListener('resize', resolveFlight);
    };
  }, [finish, flying, reward]);

  if (!reward) return null;
  const earned = RESOURCES.filter(resource => reward[resource] > 0);
  return (
    <div
      className="bb-reward-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bb-reward-title"
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        collectRef.current?.focus();
      }}
    >
      <div className={`bb-reward-card${flying ? ' is-flying' : ''}`}>
        <div className="bb-reward-kicker">REWARD SECURED</div>
        <h2 id="bb-reward-title">{reward.title}</h2>
        <div className="bb-reward-haul" aria-live="polite">
          {earned.map(resource => (
            <div className="bb-reward-item" key={resource} ref={node => { iconRefs.current[resource] = node ?? undefined; }}>
              <ResourceIcon kind={resource} labelled />
              <strong>+{reward[resource].toLocaleString()}</strong>
            </div>
          ))}
        </div>
        <button ref={collectRef} className="bb-reward-collect" onClick={collect} disabled={flying} autoFocus>
          {autoOkay ? 'Collect now' : 'Collect'}
        </button>
      </div>
    </div>
  );
}
