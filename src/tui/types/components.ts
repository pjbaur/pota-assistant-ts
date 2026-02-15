/**
 * Component prop interfaces for TUI components.
 *
 * @module tui/types/components
 */

import type { ReactNode } from 'react';
import type { FocusedPane, ActiveView, SidebarSection } from './navigation.js';
import type { Park, PlanWithPark, DailyForecast, BandConditions } from '../../types/index.js';

/** Base props for all layout components */
export interface BaseComponentProps {
  /** Optional test ID for testing */
  testId?: string;
}

/** Props for the sidebar container */
export interface SidebarProps extends BaseComponentProps {
  /** Whether this pane has focus */
  isFocused: boolean;
  /** Current sidebar section */
  activeSection: SidebarSection;
  /** Index of selected item */
  selectedIndex: number;
}

/** Props for the main content area */
export interface MainContentProps extends BaseComponentProps {
  /** Whether this pane has focus */
  isFocused: boolean;
  /** Current active view */
  activeView: ActiveView;
}

/** Props for the input bar */
export interface InputBarProps extends BaseComponentProps {
  /** Whether the input is focused */
  isFocused: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Current input value (optional, uses internal state if not provided) */
  value?: string;
  /** Change handler (optional) */
  onChange?: (value: string) => void;
  /** Submit handler */
  onSubmit: (value: string) => void;
}

/** Props for the status bar */
export interface StatusBarProps extends BaseComponentProps {
  /** Application version */
  version?: string;
  /** Currently focused pane */
  focusedPane: FocusedPane;
}

/** Props for the park list component */
export interface ParkListProps extends BaseComponentProps {
  /** List of parks to display */
  parks: Park[];
  /** Index of selected park */
  selectedIndex: number;
  /** Whether the list is focused */
  isFocused: boolean;
  /** Handler when a park is selected */
  onSelect: (park: Park) => void;
}

/** Props for the plan list component */
export interface PlanListProps extends BaseComponentProps {
  /** List of plans to display */
  plans: PlanWithPark[];
  /** Index of selected plan */
  selectedIndex: number;
  /** Whether the list is focused */
  isFocused: boolean;
  /** Handler when a plan is selected */
  onSelect: (plan: PlanWithPark) => void;
}

/** Props for the park detail view */
export interface ParkDetailViewProps extends BaseComponentProps {
  /** The park to display */
  park: Park;
  /** Weather forecast for the park (optional) */
  weather?: DailyForecast | null;
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Props for the plan detail view */
export interface PlanDetailViewProps extends BaseComponentProps {
  /** The plan to display */
  plan: PlanWithPark;
  /** Weather forecast for the plan date (optional) */
  weather?: DailyForecast | null;
  /** Band conditions for the plan date (optional) */
  bands?: BandConditions | null;
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Props for the dashboard view */
export interface DashboardViewProps extends BaseComponentProps {
  /** Currently selected park (if any) */
  currentPark: Park | null;
  /** Currently selected plan (if any) */
  currentPlan: PlanWithPark | null;
  /** Weather data */
  weather?: DailyForecast | null;
  /** Band conditions */
  bands?: BandConditions | null;
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Props for the weather panel */
export interface WeatherPanelProps extends BaseComponentProps {
  /** Weather forecast data */
  forecast: DailyForecast | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Optional warning message */
  warning?: string;
}

/** Props for the band conditions panel */
export interface BandConditionsPanelProps extends BaseComponentProps {
  /** Band conditions data */
  conditions: BandConditions | null;
  /** Whether data is loading */
  isLoading?: boolean;
}

/** Props for the command palette overlay */
export interface CommandPaletteProps extends BaseComponentProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Current search query */
  query: string;
  /** Filtered commands */
  commands: CommandItem[];
  /** Index of selected command */
  selectedIndex: number;
  /** Handler when query changes */
  onQueryChange: (query: string) => void;
  /** Handler when command is selected */
  onSelect: (command: CommandItem) => void;
  /** Handler to close palette */
  onClose: () => void;
}

/** A command item in the command palette */
export interface CommandItem {
  /** Unique command ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
  /** Optional category/group */
  category?: string;
  /** Handler to execute */
  action: () => void;
}

/** Props for the help overlay */
export interface HelpOverlayProps extends BaseComponentProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Handler to close the overlay */
  onClose: () => void;
}

/** Props for a generic modal */
export interface ModalProps extends BaseComponentProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Handler to close modal */
  onClose: () => void;
  /** Optional width */
  width?: number;
}

/** Props for a table component */
export interface TableProps<T> extends BaseComponentProps {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Optional header */
  header?: string;
}

/** Column definition for table */
export interface ColumnDef<T = Record<string, unknown>> {
  /** Column key in data */
  key: keyof T | string;
  /** Column header text */
  header: string;
  /** Column width */
  width?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom render function */
  render?: (value: unknown, row: T) => string;
}

/** Props for a select list component */
export interface SelectListProps<T> extends BaseComponentProps {
  /** List items */
  items: T[];
  /** Index of selected item */
  selectedIndex: number;
  /** Function to render each item */
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  /** Handler when item is selected */
  onSelect: (item: T, index: number) => void;
}

/** Props for spinner component */
export interface SpinnerProps extends BaseComponentProps {
  /** Spinner type/style */
  type?: 'dots' | 'line' | 'arrow';
  /** Optional label */
  label?: string;
}
