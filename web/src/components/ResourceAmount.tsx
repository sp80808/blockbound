import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { formatCompactAmount } from '../game/formatAmount';

export function ResourceAmount({ value }: { value: number }) {
  const root = useRef<HTMLSpanElement>(null);
  const fullMeasure = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  const full = value.toLocaleString();
  const short = formatCompactAmount(value);

  const measure = useCallback(() => {
    const available = root.current?.clientWidth ?? 0;
    const required = fullMeasure.current?.getBoundingClientRect().width ?? 0;
    if (available > 0 && required > 0) setCompact(required > available + 0.5);
  }, [full]);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [measure]);

  return (
    <span ref={root} aria-hidden="true" style={{ display: 'block', position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {compact ? short : full}
      <span ref={fullMeasure} style={{ position: 'absolute', visibility: 'hidden', width: 'max-content', whiteSpace: 'nowrap' }}>
        {full}
      </span>
    </span>
  );
}
