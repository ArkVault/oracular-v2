import type { PlaceSearchResult } from '../domain/place';

export interface PlaceSearchProvider {
  search(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]>;
}
