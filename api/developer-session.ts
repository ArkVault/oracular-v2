import {
  clearDeveloperSessionCookie,
  createDeveloperSession,
  developerSessionCookie,
  isDeveloperSessionValid,
  verifyDeveloperPassphrase,
} from './_lib/developer-session.js';

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

function header(request: VercelRequest, name: string): string | null {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function json(response: VercelResponse, body: unknown, status = 200, headers: Record<string, string> = {}) {
  response.status(status);
  response.setHeader('Cache-Control', 'no-store');
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.json(body);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const sessionSecret = process.env.DEVELOPER_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    json(response, { error: 'developer_access_unavailable' }, 503);
    return;
  }

  if (request.method === 'GET') {
    json(response, { authenticated: await isDeveloperSessionValid(
      header(request, 'cookie'),
      sessionSecret,
    ) });
    return;
  }

  if (request.method === 'DELETE') {
    json(response, { authenticated: false }, 200, {
      'Set-Cookie': clearDeveloperSessionCookie(),
    });
    return;
  }

  if (request.method !== 'POST') {
    json(response, { error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, DELETE' });
    return;
  }

  const configuredPassphrase = process.env.DEVELOPER_ACCESS_PASSPHRASE;
  if (!configuredPassphrase || configuredPassphrase.length < 12) {
    json(response, { error: 'developer_access_unavailable' }, 503);
    return;
  }
  const body = typeof request.body === 'string'
    ? JSON.parse(request.body) as { passphrase?: unknown }
    : request.body as { passphrase?: unknown } | undefined;
  const passphrase = typeof body?.passphrase === 'string' ? body.passphrase : '';
  if (!await verifyDeveloperPassphrase(passphrase, configuredPassphrase)) {
    json(response, { error: 'invalid_credentials' }, 401);
    return;
  }

  const token = await createDeveloperSession(sessionSecret);
  json(response, { authenticated: true }, 200, {
    'Set-Cookie': developerSessionCookie(token),
  });
}
