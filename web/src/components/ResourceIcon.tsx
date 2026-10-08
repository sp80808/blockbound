import './ResourceIcon.css';

export type ResourceKind = 'coins' | 'materials' | 'energy' | 'shields';

const LABELS: Record<ResourceKind, string> = {
  coins: 'Coins', materials: 'Building materials', energy: 'Energy', shields: 'Shields'
};

export function ResourceIcon({ kind, className = '', labelled = false }: {
  kind: ResourceKind;
  className?: string;
  labelled?: boolean;
}) {
  return (
    <svg
      className={`bb-resource-icon bb-resource-icon--${kind} ${className}`}
      viewBox="0 0 64 64"
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? LABELS[kind] : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {kind === 'coins' && <><ellipse cx="32" cy="35" rx="25" ry="21" /><ellipse className="bb-icon-detail" cx="32" cy="29" rx="21" ry="18" /><path className="bb-icon-mark" d="M25 18h10c7 0 10 8 5 12 7 4 3 14-5 14H25zm7 5v6h3c4 0 4-6 0-6zm0 11v6h4c4 0 4-6 0-6z" /></>}
      {kind === 'materials' && <><path d="m8 27 18-10 18 10-18 11z" /><path className="bb-icon-detail" d="m26 38 18-11v18L26 56z" /><path className="bb-icon-side" d="M8 27l18 11v18L8 45z" /><path className="bb-icon-mark" d="m31 14 11-6 14 8-12 7z" /></>}
      {kind === 'energy' && <><path d="M37 3 13 36h16l-3 25 25-36H35z" /><path className="bb-icon-detail" d="m34 15-12 17h13l-2 14 10-16H31z" /></>}
      {kind === 'shields' && <><path d="M32 4 55 13v17c0 15-9 25-23 30C18 55 9 45 9 30V13z" /><path className="bb-icon-detail" d="M32 12 47 18v12c0 10-5 17-15 21z" /><path className="bb-icon-mark" d="m29 20 5 0 0 9 9 0 0 5-9 0 0 9-5 0 0-9-9 0 0-5 9 0z" /></>}
    </svg>
  );
}
