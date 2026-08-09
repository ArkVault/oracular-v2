import { afterEach, describe, expect, it, vi } from 'vitest';

import handler from '../../api/analysis-access.js';
import { createDeveloperSession, developerSessionCookie } from '../../api/_lib/developer-session.js';

interface TestResponse {
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (status: number) => TestResponse;
}

function createResponse() {
  const json = vi.fn<(body: unknown) => void>();
  const setHeader = vi.fn<(name: string, value: string) => void>();
  const status = vi.fn<(status: number) => void>();
  const response: TestResponse = {
    json,
    setHeader,
    status(statusCode) {
      status(statusCode);
      return response;
    },
  };

  return { json, response, status };
}

describe('analysis access endpoint', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should grant unlimited access only to a signed developer session', async () => {
    // ARRANGE
    const developerSecret = 'a-secure-session-secret-with-at-least-32-characters';
    vi.stubEnv('DEVELOPER_SESSION_SECRET', developerSecret);
    const token = await createDeveloperSession(developerSecret, Date.now() - 1_000);
    const { json, response, status } = createResponse();

    // ACT
    await handler({
      body: { indicator: 'CDOM' },
      headers: { cookie: developerSessionCookie(token) },
      method: 'POST',
    }, response);

    // ASSERT
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      remaining: null,
      resetAt: null,
      unlimited: true,
    });
  });

  it('should not grant unlimited access to a public visitor without quota infrastructure', async () => {
    // ARRANGE
    vi.stubEnv('DEVELOPER_SESSION_SECRET', '');
    vi.stubEnv('ANALYSIS_RATE_LIMIT_SECRET', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
    const { json, response, status } = createResponse();

    // ACT
    await handler({ body: { indicator: 'CDOM' }, headers: {}, method: 'POST' }, response);

    // ASSERT
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: 'analysis_access_unavailable' });
  });
});
