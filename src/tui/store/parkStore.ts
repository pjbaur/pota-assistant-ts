/**
 * Park state store using Zustand.
 *
 * Manages park list data, search, and selection.
 *
 * @module tui/store/parkStore
 */

import { create } from 'zustand';
import type { Park, Result, ParkSearchResult } from '../../types/index.js';
import { searchParks, getParkByReference, hasParks } from '../../services/park-service.js';

/**
 * Park state interface.
 */
export interface ParkState {
  // Data
  parks: Park[];
  searchQuery: string;
  totalCount: number;

  // Loading states
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  setSearchQuery: (query: string) => void;
  search: (query: string, options?: { state?: string; limit?: number }) => Promise<void>;
  loadPark: (reference: string) => Promise<Park | null>;
  refresh: () => Promise<void>;
  hasData: () => boolean;

  // Internal actions
  setParks: (parks: Park[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Park data store.
 */
export const useParkStore = create<ParkState>((set, get) => ({
  // Initial state
  parks: [],
  searchQuery: '',
  totalCount: 0,
  isLoading: false,
  error: null,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),

  search: async (query, options = {}) => {
    set({ isLoading: true, error: null, searchQuery: query });

    const result = await searchParks(query, options);

    if (!result.success) {
      set({
        isLoading: false,
        error: result.error.message,
        parks: [],
        totalCount: 0,
      });
      return;
    }

    const data: ParkSearchResult = result.data;
    set({
      isLoading: false,
      parks: data.parks,
      totalCount: data.total,
      error: data.staleWarning ?? null,
    });
  },

  loadPark: async (reference) => {
    set({ isLoading: true, error: null });

    const result = await getParkByReference(reference);

    if (!result.success) {
      set({ isLoading: false, error: result.error.message });
      return null;
    }

    set({ isLoading: false });
    return result.data;
  },

  refresh: async () => {
    const { searchQuery } = get();
    if (searchQuery) {
      await get().search(searchQuery);
    }
  },

  hasData: () => hasParks(),

  // Internal actions
  setParks: (parks) => set({ parks }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
