export interface EvalMetrics {
  planSuccessRate: number;
  editSuccessRate: number;
  validationPassRate: number;
  repairLoopSuccessRate: number;
  avgToolCalls: number;
  avgTokenUsage: number;
  avgLatencyMs: number;
  checkpointRecoverySuccessRate: number;
}

export const emptyMetrics = (): EvalMetrics => ({
  planSuccessRate: 0,
  editSuccessRate: 0,
  validationPassRate: 0,
  repairLoopSuccessRate: 0,
  avgToolCalls: 0,
  avgTokenUsage: 0,
  avgLatencyMs: 0,
  checkpointRecoverySuccessRate: 0,
});
