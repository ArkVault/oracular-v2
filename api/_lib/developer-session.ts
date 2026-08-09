const COOKIE_NAME = 'oracular_developer_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  )));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyDeveloperPassphrase(
  candidate: string,
  expected: string,
): Promise<boolean> {
  const [candidateDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  ]);
  return constantTimeEqual(
    toBase64Url(new Uint8Array(candidateDigest)),
    toBase64Url(new Uint8Array(expectedDigest)),
  );
}

export async function createDeveloperSession(secret: string, now = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_DURATION_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function isDeveloperSessionValid(
  cookieHeader: string | null,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const cookie = cookieHeader?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  if (!token) return false;
  const separator = token.indexOf('.');
  if (separator < 1) return false;
  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) <= now) return false;
  return constantTimeEqual(signature, await hmac(expiresAt, secret));
}

export function developerSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_DURATION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearDeveloperSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
