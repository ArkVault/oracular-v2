const EXTERNAL_REQUEST_TIMEOUT_MS = 10_000;

export function createExternalRequestInit(
  signal?: AbortSignal,
  accept = 'application/json',
): RequestInit {
  const timeoutSignal = AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS);

  return {
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: {
      Accept: accept,
    },
  };
}
