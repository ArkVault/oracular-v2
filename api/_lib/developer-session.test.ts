import { describe, expect, it } from 'vitest';

import {
  createDeveloperSession,
  developerSessionCookie,
  isDeveloperSessionValid,
  verifyDeveloperPassphrase,
} from './developer-session';

describe('developer session', () => {
  const secret = 'a-secure-session-secret-with-at-least-32-characters';

  it('creates a signed cookie accepted before expiration', async () => {
    const token = await createDeveloperSession(secret, 1_000);
    expect(await isDeveloperSessionValid(developerSessionCookie(token), secret, 2_000)).toBe(true);
  });

  it('rejects tampered and expired cookies', async () => {
    const token = await createDeveloperSession(secret, 1_000);
    expect(await isDeveloperSessionValid(`oracular_developer_session=${token}x`, secret, 2_000)).toBe(false);
    expect(await isDeveloperSessionValid(developerSessionCookie(token), secret, 50_000_000)).toBe(false);
  });

  it('verifies only the configured passphrase', async () => {
    expect(await verifyDeveloperPassphrase('private phrase', 'private phrase')).toBe(true);
    expect(await verifyDeveloperPassphrase('wrong phrase', 'private phrase')).toBe(false);
  });
});
