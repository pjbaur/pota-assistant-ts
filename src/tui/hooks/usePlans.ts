/**
 * Hook for plan data management.
 *
 * @module tui/hooks/usePlans
 */

import { useCallback } from 'react';
import { usePlanStore } from '../store/planStore.js';
import { useAppStore } from '../store/appStore.js';
import type { PlanWithPark, PlanStatus } from '../../types/index.js';

export interface UsePlansResult {
  plans: PlanWithPark[];
  isLoading: boolean;
  error: string | null;
  statusFilter: PlanStatus | null;
  showUpcomingOnly: boolean;
  loadPlans: (options?: { status?: PlanStatus; upcoming?: boolean; limit?: number }) => Promise<void>;
  loadPlan: (id: number) => Promise<PlanWithPark | null>;
  selectPlan: (plan: PlanWithPark) => void;
  setStatusFilter: (status: PlanStatus | null) => void;
  setUpcomingOnly: (upcoming: boolean) => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing plan data in the TUI.
 */
export function usePlans(): UsePlansResult {
  const {
    plans,
    isLoading,
    error,
    statusFilter,
    showUpcomingOnly,
    loadPlans,
    loadPlan,
    setStatusFilter,
    setUpcomingOnly,
    refresh,
  } = usePlanStore();

  const { setCurrentPlan, setActiveView } = useAppStore();

  const selectPlan = useCallback(
    (plan: PlanWithPark) => {
      setCurrentPlan(plan);
      setActiveView('plan-detail');
    },
    [setCurrentPlan, setActiveView]
  );

  return {
    plans,
    isLoading,
    error,
    statusFilter,
    showUpcomingOnly,
    loadPlans,
    loadPlan,
    selectPlan,
    setStatusFilter,
    setUpcomingOnly,
    refresh,
  };
}
