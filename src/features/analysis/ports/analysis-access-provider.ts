export interface AnalysisAccessGrant {
  remaining: number | null;
  resetAt: string | null;
  unlimited?: boolean;
}

export interface AnalysisAccessProvider {
  consume: (indicator: string, signal?: AbortSignal) => Promise<AnalysisAccessGrant>;
}
