/** Stable gameplay tuning points. Change flow values here, not in UI components. */
export const GAMEPLAY_CONFIG = {
  maxTotalPct: 100,
  pourStepPct: 1,
  pourIntervalMs: 100,
  serveDurationMs: 1500,
} as const;

export const RESULT_CONFIG = {
  specimenNumber: 1,
} as const;
