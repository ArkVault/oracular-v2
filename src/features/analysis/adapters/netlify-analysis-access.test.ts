import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AnalysisLimitExceededError,
  HttpAnalysisAccessProvider,
} from './netlify-analysis-access';

describe('HTTP analysis access provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('invokes the browser fetch function with the global receiver', async () => {
    // ARRANGE
    const browserFetch = vi.fn(function browserFetch(this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(new Response(JSON.stringify({
        remaining: null,
        resetAt: null,
        unlimited: true,
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', browserFetch);
    const provider = new HttpAnalysisAccessProvider();

    // ACT + ASSERT
    await expect(provider.consume('Chlorophyll-a')).resolves.toMatchObject({
      unlimited: true,
    });
  });

  it('should return the remaining allowance when access is granted', async () => {
    // ARRANGE
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      remaining: 4,
      resetAt: '2026-08-09T18:00:00.000Z',
    }), { status: 200 }));
    const provider = new HttpAnalysisAccessProvider('/api/analysis-access', request);

    // ACT
    const result = await provider.consume('Chlorophyll-a');

    // ASSERT
    expect(result).toEqual({
      remaining: 4,
      resetAt: '2026-08-09T18:00:00.000Z',
    });
    expect(request).toHaveBeenCalledWith('/api/analysis-access', expect.objectContaining({
      body: JSON.stringify({ indicator: 'Chlorophyll-a' }),
      method: 'POST',
    }));
  });

  it('accepts an unlimited developer grant', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      remaining: null,
      resetAt: null,
      unlimited: true,
    }), { status: 200 }));
    const provider = new HttpAnalysisAccessProvider('/api/analysis-access', request);

    await expect(provider.consume('Turbidity')).resolves.toEqual({
      remaining: null,
      resetAt: null,
      unlimited: true,
    });
  });

  it('should expose a typed error when the IP allowance is exhausted', async () => {
    // ARRANGE
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'analysis_limit_exceeded',
      remaining: 0,
      resetAt: '2026-08-09T13:00:00.000Z',
    }), { status: 429 }));
    const provider = new HttpAnalysisAccessProvider('/api/analysis-access', request);

    // ACT + ASSERT
    await expect(provider.consume('Turbidity')).rejects.toEqual(
      new AnalysisLimitExceededError('2026-08-09T13:00:00.000Z'),
    );
  });
});
