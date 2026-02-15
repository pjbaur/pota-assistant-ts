/**
 * Plan state store using Zustand.
 *
 * Manages plan list data and CRUD operations.
 *
 * @module tui/store/planStore
 */

import { create } from 'zustand';
import type { PlanWithPark, Result, PlanStatus } from '../../types/index.js';
import * as planRepository from '../../data/repositories/plan-repository.js';

/**
 * Plan state interface.
 */
export interface PlanState {
  // Data
  plans: PlanWithPark[];

  // Filters
  statusFilter: PlanStatus | null;
  showUpcomingOnly: boolean;

  // Loading states
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  loadPlans: (options?: { status?: PlanStatus; upcoming?: boolean; limit?: number }) => Promise<void>;
  loadPlan: (id: number) => Promise<PlanWithPark | null>;
  setStatusFilter: (status: PlanStatus | null) => void;
  setUpcomingOnly: (upcoming: boolean) => void;
  refresh: () => Promise<void>;

  // Internal actions
  setPlans: (plans: PlanWithPark[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Plan data store.
 */
export const usePlanStore = create<PlanState>((set, get) => ({
  // Initial state
  plans: [],
  statusFilter: null,
  showUpcomingOnly: true, // Default to showing upcoming plans
  isLoading: false,
  error: null,

  // Actions
  loadPlans: async (options = {}) => {
    set({ isLoading: true, error: null });

    const { statusFilter, showUpcomingOnly } = get();
    const queryOptions = {
      status: options.status ?? statusFilter ?? undefined,
      upcoming: options.upcoming ?? showUpcomingOnly,
      limit: options.limit ?? 50,
    };

    const result = planRepository.findAllWithPark(queryOptions);

    if (!result.success) {
      set({
        isLoading: false,
        error: result.error.message,
        plans: [],
      });
      return;
    }

    set({
      isLoading: false,
      plans: result.data,
    });
  },

  loadPlan: async (id) => {
    set({ isLoading: true, error: null });

    const result = planRepository.findByIdWithPark(id);

    if (!result.success) {
      set({ isLoading: false, error: result.error.message });
      return null;
    }

    set({ isLoading: false });
    return result.data;
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().loadPlans({ status: status ?? undefined });
  },

  setUpcomingOnly: (upcoming) => {
    set({ showUpcomingOnly: upcoming });
    get().loadPlans({ upcoming });
  },

  refresh: async () => {
    await get().loadPlans();
  },

  // Internal actions
  setPlans: (plans) => set({ plans }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
