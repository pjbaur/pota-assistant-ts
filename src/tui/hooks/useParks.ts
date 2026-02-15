/**
 * Hook for park data management.
 *
 * @module tui/hooks/useParks
 */

import { useCallback, useEffect } from 'react';
import { useParkStore } from '../store/parkStore.js';
import { useAppStore } from '../store/appStore.js';
import type { Park } from '../../types/index.js';

export interface UseParksResult {
  parks: Park[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  search: (query: string, options?: { state?: string; limit?: number }) => Promise<void>;
  loadPark: (reference: string) => Promise<Park | null>;
  selectPark: (park: Park) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing park data in the TUI.
 */
export function useParks(): UseParksResult {
  const {
    parks,
    isLoading,
    error,
    searchQuery,
    search,
    loadPark,
    refresh,
  } = useParkStore();

  const { setCurrentPark, setActiveView } = useAppStore();

  const selectPark = useCallback(
    (park: Park) => {
      setCurrentPark(park);
      setActiveView('park-detail');
    },
    [setCurrentPark, setActiveView]
  );

  return {
    parks,
    isLoading,
    error,
    searchQuery,
    search,
    loadPark,
    selectPark,
    refresh,
  };
}
