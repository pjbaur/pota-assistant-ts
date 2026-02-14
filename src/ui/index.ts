/**
 * UI components barrel export
 */

// Color utilities
export {
  initColors,
  isColorEnabled,
  success,
  warning,
  error,
  info,
  highlight,
  muted,
  bold,
  dim,
  underline,
  colors,
} from './colors.js';

// Table formatter
export {
  formatTable,
  formatKeyValue,
  type ColumnDef,
  type TableOptions,
} from './table.js';

// Output formatters
export {
  formatParkCard,
  formatPlanCard,
  formatWeather,
  formatBandConditions,
  formatParkList,
  formatPlanList,
} from './formatters.js';

// Progress indicators
export {
  ProgressBar,
  Spinner,
  formatProgress,
  progressBarString,
} from './progress.js';

// Interactive prompts
export {
  promptText,
  promptSelect,
  promptConfirm,
  promptMultiSelect,
  promptPassword,
} from './prompts.js';

// Status messages
export {
  success as successMessage,
  warning as warningMessage,
  error as errorMessage,
  info as infoMessage,
  header,
  divider,
  blank,
  keyValue,
  list,
  formatDuration,
} from './status.js';
