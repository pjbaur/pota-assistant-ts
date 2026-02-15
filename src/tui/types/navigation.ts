/**
 * Navigation types for TUI state management.
 *
 * @module tui/types/navigation
 */

/** The currently focused pane in the split-pane layout */
export type FocusedPane = 'sidebar' | 'main' | 'input';

/** The active view displayed in the main content area */
export type ActiveView = 'dashboard' | 'park-detail' | 'plan-detail' | 'search';

/** The active section within the sidebar */
export type SidebarSection = 'parks' | 'plans';

/** Navigation state for the TUI */
export interface NavigationState {
  focusedPane: FocusedPane;
  activeView: ActiveView;
  sidebarSection: SidebarSection;
  selectedIndex: number;
}
