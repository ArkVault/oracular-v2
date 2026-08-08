import * as React from 'react';

import type { PlaceSearchResult } from '@/features/place-search/domain/place';
import type { PlaceSearchProvider } from '@/features/place-search/ports/place-search-provider';

export function usePlaceSearch(provider: PlaceSearchProvider) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const delayRef = React.useRef<number | undefined>(undefined);
  const abortRef = React.useRef<AbortController | undefined>(undefined);

  const cancel = React.useCallback(() => {
    if (delayRef.current !== undefined) {
      window.clearTimeout(delayRef.current);
      delayRef.current = undefined;
    }
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, []);

  const search = React.useCallback((nextQuery: string) => {
    cancel();
    setQuery(nextQuery);
    const normalizedQuery = nextQuery.trim();
    if (normalizedQuery.length < 3 || normalizedQuery.length > 200) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    abortRef.current = controller;
    delayRef.current = window.setTimeout(async () => {
      delayRef.current = undefined;
      try {
        const nextResults = await provider.search(normalizedQuery, controller.signal);
        if (!controller.signal.aborted) {
          setResults(nextResults);
        }
      } catch (searchError) {
        if (!controller.signal.aborted) {
          console.error('Search error:', searchError);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);
  }, [cancel, provider]);

  const clear = React.useCallback(() => {
    cancel();
    setQuery('');
    setResults([]);
    setIsSearching(false);
  }, [cancel]);

  React.useEffect(() => cancel, [cancel]);

  return {
    clear,
    isSearching,
    query,
    results,
    search,
  };
}
