import type {
  AnalysisAccessGrant,
  AnalysisAccessProvider,
} from '../ports/analysis-access-provider';

type Request = typeof fetch;

export class AnalysisLimitExceededError extends Error {
  constructor(public readonly resetAt: string) {
    super('Analysis limit exceeded');
    this.name = 'AnalysisLimitExceededError';
  }
}

export class HttpAnalysisAccessProvider implements AnalysisAccessProvider {
  constructor(
    private readonly endpoint = '/api/analysis-access',
    private readonly request: Request = (input, init) => globalThis.fetch(input, init),
  ) {}

  async consume(indicator: string, signal?: AbortSignal): Promise<AnalysisAccessGrant> {
    const response = await this.request(this.endpoint, {
      body: JSON.stringify({ indicator }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal,
    });
    const payload = await response.json() as Partial<AnalysisAccessGrant> & { error?: string };

    if (response.status === 429 && payload.resetAt) {
      throw new AnalysisLimitExceededError(payload.resetAt);
    }
    const isUnlimited = payload.unlimited === true
      && payload.remaining === null
      && payload.resetAt === null;
    const isLimitedGrant = typeof payload.remaining === 'number'
      && typeof payload.resetAt === 'string';
    if (!response.ok || (!isUnlimited && !isLimitedGrant)) {
      throw new Error('Unable to verify analysis allowance');
    }

    return {
      remaining: payload.remaining ?? null,
      resetAt: payload.resetAt ?? null,
      ...(payload.unlimited === true ? { unlimited: true } : {}),
    };
  }
}
