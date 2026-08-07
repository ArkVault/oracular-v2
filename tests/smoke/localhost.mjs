import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173/';
const response = await fetch(baseUrl, { signal: AbortSignal.timeout(5_000) });
const html = await response.text();

assert.equal(response.ok, true, `Expected ${baseUrl} to respond successfully`);
assert.match(html, /<title>Oracular V2<\/title>/, 'Expected the Oracular V2 document title');
assert.match(html, /id="root"/, 'Expected the React root element');

console.log(`Smoke passed: ${baseUrl} responded ${response.status} with the Oracular V2 shell`);
