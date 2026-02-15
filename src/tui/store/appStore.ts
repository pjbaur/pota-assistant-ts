/**
 * Main application state store using Zustand.
 *
 * @module tui/store/appStore
 */

import { create } from 'zustand';
import type { Park, PlanWithPark } from '../../types/index.js';
import type { FocusedPane, ActiveView, SidebarSection } from '../types/navigation.js';

/**
 * Application state interface.
 */
export interface AppState {
  // Current selection
  currentPark: Park | null;
  currentPlan: PlanWithPark | null;

  // Navigation state
  focusedPane: FocusedPane;
  activeView: ActiveView;
  sidebarSection: SidebarSection;
  selectedIndex: number;

  // UI state
  commandPaletteOpen: boolean;
  commandPaletteQuery: string;
  helpOverlayVisible: boolean;

  // Loading states
  isLoadingParks: boolean;
  isLoadingPlans: boolean;
  isLoadingWeather: boolean;
  isLoadingBands: boolean;

  // Error state
  error: string | null;

  // Actions - Selection
  setCurrentPark: (park: Park | null) => void;
  setCurrentPlan: (plan: PlanWithPark | null) => void;

  // Actions - Navigation
  setFocusedPane: (pane: FocusedPane) => void;
  cycleFocusedPane: () => void;
  setActiveView: (view: ActiveView) => void;
  setSidebarSection: (section: SidebarSection) => void;
  setSelectedIndex: (index: number) => void;
  moveSelectionUp: () => void;
  moveSelectionDown: (maxItems: number) => void;

  // Actions - UI
  toggleCommandPalette: () => void;
  setCommandPaletteQuery: (query: string) => void;
  toggleHelpOverlay: () => void;

  // Actions - Loading
  setLoadingParks: (loading: boolean) => void;
  setLoadingPlans: (loading: boolean) => void;
  setLoadingWeather: (loading: boolean) => void;
  setLoadingBands: (loading: boolean) => void;

  // Actions - Error
  setError: (error: string | null) => void;
  clearError: () => void;
}

/** Order of panes when cycling focus */
const PANE_CYCLE_ORDER: FocusedPane[] = ['sidebar', 'main', 'input'];

/**
 * Main application store.
 */
export const useAppStore = create<AppState>((set) => ({
  // Initial state
  currentPark: null,
  currentPlan: null,
  focusedPane: 'sidebar',
  activeView: 'dashboard',
  sidebarSection: 'parks',
  selectedIndex: 0,
  commandPaletteOpen: false,
  commandPaletteQuery: '',
  helpOverlayVisible: false,
  isLoadingParks: false,
  isLoadingPlans: false,
  isLoadingWeather: false,
  isLoadingBands: false,
  error: null,

  // Selection actions
  setCurrentPark: (park) => set({ currentPark: park }),

  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  // Navigation actions
  setFocusedPane: (pane) => set({ focusedPane: pane }),

  cycleFocusedPane: () =>
    set((state) => {
      const currentIndex = PANE_CYCLE_ORDER.indexOf(state.focusedPane);
      const nextIndex = (currentIndex + 1) % PANE_CYCLE_ORDER.length;
      return { focusedPane: PANE_CYCLE_ORDER[nextIndex] };
    }),

  setActiveView: (view) => set({ activeView: view }),

  setSidebarSection: (section) =>
    set({
      sidebarSection: section,
      selectedIndex: 0, // Reset selection when switching sections
    }),

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  moveSelectionUp: () =>
    set((state) => ({
      selectedIndex: Math.max(0, state.selectedIndex - 1),
    })),

  moveSelectionDown: (maxItems) =>
    set((state) => ({
      selectedIndex: Math.min(maxItems - 1, state.selectedIndex + 1),
    })),

  // UI actions
  toggleCommandPalette: () =>
    set((state) => ({
      commandPaletteOpen: !state.commandPaletteOpen,
      commandPaletteQuery: '',
    })),

  setCommandPaletteQuery: (query) => set({ commandPaletteQuery: query }),

  toggleHelpOverlay: () =>
    set((state) => ({
      helpOverlayVisible: !state.helpOverlayVisible,
    })),

  // Loading actions
  setLoadingParks: (loading) => set({ isLoadingParks: loading }),
  setLoadingPlans: (loading) => set({ isLoadingPlans: loading }),
  setLoadingWeather: (loading) => set({ isLoadingWeather: loading }),
  setLoadingBands: (loading) => set({ isLoadingBands: loading }),

  // Error actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
