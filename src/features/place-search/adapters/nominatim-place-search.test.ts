import { describe, expect, it, vi } from 'vitest';

import { NominatimPlaceSearchProvider } from './nominatim-place-search';

describe('NominatimPlaceSearchProvider', () => {
  it('should use the browser global fetch without rebinding its receiver', async () => {
    // ARRANGE
    const browserFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis && this !== undefined) {
        throw new TypeError('Illegal invocation');
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', browserFetch);
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
    );

    // ACT
    const results = await provider.search('London');

    // ASSERT
    expect(results).toEqual([]);
    expect(browserFetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('should return no places when the provider payload is not an array', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'unexpected-shape' }), { status: 200 }),
    );
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      fetcher as typeof fetch,
    );

    // ACT
    const results = await provider.search('London');

    // ASSERT
    expect(results).toEqual([]);
  });

  it('should encode the query and map only valid provider results', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        { place_id: 12, display_name: 'Ciudad de México', lat: '19.4326', lon: '-99.1332' },
        { place_id: 13, display_name: '', lat: 'invalid', lon: '-99.1' },
      ]), { status: 200 }),
    );
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      fetcher as typeof fetch,
    );

    // ACT
    const results = await provider.search('Ciudad de México');

    // ASSERT
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('q=Ciudad+de+M%C3%A9xico');
    expect(results).toEqual([
      {
        id: '12',
        name: 'Ciudad de México',
        latitude: 19.4326,
        longitude: -99.1332,
      },
    ]);
  });

  it('should avoid a provider request for an incomplete query', async () => {
    // ARRANGE
    const fetcher = vi.fn();
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      fetcher as typeof fetch,
    );

    // ACT
    const results = await provider.search('ab');

    // ASSERT
    expect(results).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should reject an oversized query before contacting the provider', async () => {
    // ARRANGE
    const fetcher = vi.fn();
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      fetcher as typeof fetch,
    );

    // ACT
    const results = await provider.search('a'.repeat(201));

    // ASSERT
    expect(results).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should discard coordinates outside geographic bounds', async () => {
    // ARRANGE
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([
        { place_id: 14, display_name: 'Invalid latitude', lat: '91', lon: '0' },
        { place_id: 15, display_name: 'Invalid longitude', lat: '0', lon: '-181' },
      ]), { status: 200 }),
    );
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      fetcher as typeof fetch,
    );

    // ACT
    const results = await provider.search('invalid coordinates');

    // ASSERT
    expect(results).toEqual([]);
  });

  it('should fail clearly when the provider response is unsuccessful', async () => {
    // ARRANGE
    const provider = new NominatimPlaceSearchProvider(
      'https://search.example.test/search',
      vi.fn().mockResolvedValue(new Response(null, { status: 429 })) as typeof fetch,
    );

    // ACT
    const request = provider.search('London');

    // ASSERT
    await expect(request).rejects.toThrow('Place search failed (429)');
  });
});
