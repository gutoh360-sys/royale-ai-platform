export const SLOW_MOVING_DAYS = 60;

export const ABC_CLASS_A_LIMIT = 0.8;
export const ABC_CLASS_B_LIMIT = 0.95;

export const CRITICAL_COVERAGE_DAYS = 3;
export const HIGH_COVERAGE_DAYS = 7;
export const TARGET_COVERAGE_MULTIPLIER = 1.5;

export const OVERSTOCK_COVERAGE_MULTIPLIER = 3;
export const OVERSTOCK_MIN_DAYS = 90;

export const REPLENISHMENT_SCORE_MAX = 100;

export const REPLENISHMENT_WEIGHTS = {
  stockoutRisk: 40,
  coverageDays: 25,
  abcClass: 15,
  averageSales: 10,
  leadTime: 5,
  projectedStock: 5,
} as const;
