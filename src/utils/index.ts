// Utility module exports

export { getLogger, initLogger, Logger } from './logger.js';
export * as validators from './validators.js';
export {
  calculateGridSquare,
  gridToCoordinates,
  calculateDistance,
  formatCoordinates,
} from './grid-square.js';

// Helper to extract suggestions from AppError
import type { AppError } from '../types/index.js';

export function getErrorSuggestions(err: Error): string[] | undefined {
  const appErr = err as AppError;
  return appErr.suggestions;
}

export function getErrorCode(err: Error): string | undefined {
  const appErr = err as AppError;
  return appErr.code;
}
