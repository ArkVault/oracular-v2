import type { PlaceSearchResult } from '../domain/place';
import type { PlaceSearchProvider } from '../ports/place-search-provider';

interface NominatimPlaceDto {
  place_id?: unknown;
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
}

function mapPlace(dto: NominatimPlaceDto): PlaceSearchResult | undefined {
  const latitude = Number(dto.lat);
  const longitude = Number(dto.lon);
  if (
    typeof dto.display_name !== 'string' ||
    dto.display_name.trim().length === 0 ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return undefined;
  }

  return {
    id: String(dto.place_id ?? `${latitude}:${longitude}`),
    name: dto.display_name,
    latitude,
    longitude,
  };
}

export class NominatimPlaceSearchProvider implements PlaceSearchProvider {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly endpoint: string,
    fetcher?: typeof fetch,
    private readonly limit = 5,
  ) {
    this.fetcher = fetcher ?? ((input, init) => globalThis.fetch(input, init));
  }

  async search(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      return [];
    }

    const url = new URL(this.endpoint);
    url.search = new URLSearchParams({
      format: 'json',
      q: normalizedQuery,
      limit: String(this.limit),
    }).toString();

    const response = await this.fetcher(url, { signal });
    if (!response.ok) {
      throw new Error(`Place search failed (${response.status})`);
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((item) => mapPlace(item as NominatimPlaceDto))
      .filter((place): place is PlaceSearchResult => place !== undefined)
      .slice(0, this.limit);
  }
}
