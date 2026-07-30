export function roundToInteger(value: number): number {
  return Math.round(value);
}

export function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function daysBetween(from: string, referenceDate?: Date): number {
  const fromDate = new Date(from);
  const ref = referenceDate ?? new Date();
  const diffMs = ref.getTime() - fromDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
