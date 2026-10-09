const COMPACT_UNITS = [
  { value: 1_000_000_000, suffix: 'B' },
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' }
] as const;

export function formatCompactAmount(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(value));
  if (absolute < 1_000) return `${sign}${absolute}`;

  for (let i = 0; i < COMPACT_UNITS.length; i++) {
    const unit = COMPACT_UNITS[i];
    const scaled = absolute / unit.value;
    if (scaled < 0.9995 && i < COMPACT_UNITS.length - 1) {
      continue;
    }

    const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    const factor = 10 ** decimals;
    const rounded = Math.round(scaled * factor) / factor;

    // Rollover check (e.g. 999.95K rolls into 1M)
    if (rounded >= 1_000 && i > 0) {
      const nextUnit = COMPACT_UNITS[i - 1];
      return `${sign}1${nextUnit.suffix}`;
    }

    return `${sign}${rounded}${unit.suffix}`;
  }

  return `${sign}${absolute}`;
}
