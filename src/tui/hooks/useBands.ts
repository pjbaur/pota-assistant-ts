/**
 * Hook for band conditions data management.
 *
 * @module tui/hooks/useBands
 */

import { useState, useCallback, useEffect } from 'react';
import { getBandConditions } from '../../services/band-service.js';
import type { BandConditions } from '../../types/index.js';

export interface UseBandsResult {
  conditions: BandConditions | null;
  fetchConditions: (date: string) => BandConditions;
  getTodayConditions: () => BandConditions;
}

/**
 * Hook for fetching band conditions in the TUI.
 *
 * Band conditions are computed locally based on date and time,
 * so no async loading is needed.
 */
export function useBands(): UseBandsResult {
  const [conditions, setConditions] = useState<BandConditions | null>(null);

  const fetchConditions = useCallback((date: string): BandConditions => {
    const result = getBandConditions(date);
    setConditions(result);
    return result;
  }, []);

  const getTodayConditions = useCallback((): BandConditions => {
    const today = new Date().toISOString().split('T')[0];
    return getBandConditions(today);
  }, []);

  // Load today's conditions on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetchConditions(today);
  }, [fetchConditions]);

  return {
    conditions,
    fetchConditions,
    getTodayConditions,
  };
}
