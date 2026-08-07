import { describe, expect, it, vi } from 'vitest';

import { NominatimPlaceSearchProvider } from './nominatim-place-search';

describe('NominatimPlaceSearchProvider', () => {
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
