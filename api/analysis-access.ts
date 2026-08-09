import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { isDeveloperSessionValid } from './_lib/developer-session.js';
import { analysisIdentifier, validateAnalysisIndicator } from './_lib/analysis-indicator.js';

declare const process: { env: Record<string, string | undefined> };

interface VercelRequest {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  method?: string;
}

interface VercelResponse {
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (status: number) => VercelResponse;
}

async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function header(request: VercelRequest, name: string): string | null {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function clientIp(request: VercelRequest): string | undefined {
  const forwarded = header(request, 'x-vercel-forwarded-for') ?? header(request, 'x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || header(request, 'x-real-ip') || undefined;
}

function json(response: VercelResponse, body: unknown, status = 200) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(status).json(body);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    json(response, { error: 'method_not_allowed' }, 405);
    return;
  }

  const sessionSecret = process.env.DEVELOPER_SESSION_SECRET;
  if (sessionSecret && await isDeveloperSessionValid(header(request, 'cookie'), sessionSecret)) {
    json(response, { remaining: null, resetAt: null, unlimited: true });
    return;
  }

  const requestBody = typeof request.body === 'string'
    ? JSON.parse(request.body) as { indicator?: unknown }
    : request.body as { indicator?: unknown } | undefined;
  const indicator = validateAnalysisIndicator(requestBody?.indicator);
  if (!indicator) {
    json(response, { error: 'invalid_indicator' }, 400);
    return;
  }

  const rateLimitSecret = process.env.ANALYSIS_RATE_LIMIT_SECRET;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  const ip = clientIp(request);
  if (!rateLimitSecret || rateLimitSecret.length < 32 || !redisUrl || !redisToken || !ip) {
    json(response, { error: 'analysis_access_unavailable' }, 503);
    return;
  }

  try {
    const ratelimit = new Ratelimit({
      redis: new Redis({ token: redisToken, url: redisUrl }),
      limiter: Ratelimit.slidingWindow(1, '24 h'),
      prefix: 'oracular:analysis-by-indicator:v1',
    });
    const result = await ratelimit.limit(analysisIdentifier(
      await hashIp(ip, rateLimitSecret),
      indicator,
    ));
    const payload = {
      remaining: result.remaining,
      resetAt: new Date(result.reset).toISOString(),
      unlimited: false,
    };
    json(response, result.success ? payload : { error: 'analysis_limit_exceeded', ...payload }, result.success ? 200 : 429);
  } catch (error) {
    console.error('Analysis access check failed', error);
    json(response, { error: 'analysis_access_unavailable' }, 503);
  }
}
