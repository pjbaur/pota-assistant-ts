// Input validators

import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

// Park reference format: K-1234, VE-12345, G-1234, etc.
const PARK_REF_PATTERN = /^[A-Z]{1,3}-\d{4,5}$/;

// Date format: YYYY-MM-DD
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Grid square format: AA00, AA00aa
const GRID_SQUARE_PATTERN = /^[A-R]{2}[0-9]{2}([a-x]{2})?$/i;

// Callsign format (simplified)
const CALLSIGN_PATTERN = /^[A-Z0-9]{3,6}$/;

/**
 * Validate park reference format
 */
export function validateParkRef(ref: string): Result<string> {
  const normalized = ref.toUpperCase().trim();

  if (!normalized) {
    return {
      success: false,
      error: new AppError('Park reference is required', 'INVALID_INPUT', [
        'Provide a park reference like K-0039 or VE-1234',
      ]),
    };
  }

  if (!PARK_REF_PATTERN.test(normalized)) {
    return {
      success: false,
      error: new AppError(
        `Invalid park reference format: ${ref}`,
        'INVALID_PARK_REF',
        [
          'Park references must be in format: PREFIX-NUMBER',
          'Examples: K-0039, VE-12345, G-1234',
        ]
      ),
    };
  }

  return { success: true, data: normalized };
}

/**
 * Validate date format and range
 */
export function validateDate(
  dateStr: string,
  options?: { allowPast?: boolean; maxFuture?: number }
): Result<string> {
  const { allowPast = true, maxFuture = 365 } = options ?? {};

  if (!dateStr) {
    return {
      success: false,
      error: new AppError('Date is required', 'INVALID_INPUT', [
        'Provide a date in YYYY-MM-DD format',
      ]),
    };
  }

  if (!DATE_PATTERN.test(dateStr)) {
    return {
      success: false,
      error: new AppError(
        `Invalid date format: ${dateStr}`,
        'INVALID_DATE_FORMAT',
        ['Use YYYY-MM-DD format (e.g., 2024-06-15)']
      ),
    };
  }

  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return {
      success: false,
      error: new AppError(`Invalid date: ${dateStr}`, 'INVALID_DATE', [
        'Provide a valid calendar date',
      ]),
    };
  }

  if (!allowPast && date < now) {
    return {
      success: false,
      error: new AppError('Date cannot be in the past', 'PAST_DATE', [
        'Provide a date today or in the future',
      ]),
    };
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxFuture);

  if (date > maxDate) {
    return {
      success: false,
      error: new AppError(
        `Date is too far in the future: ${dateStr}`,
        'FUTURE_DATE',
        [`Maximum planning horizon is ${maxFuture} days`]
      ),
    };
  }

  return { success: true, data: dateStr };
}

/**
 * Validate grid square (Maidenhead locator)
 */
export function validateGridSquare(grid: string): Result<string> {
  const normalized = grid.toUpperCase().trim();

  if (!normalized) {
    return {
      success: false,
      error: new AppError('Grid square is required', 'INVALID_INPUT'),
    };
  }

  if (!GRID_SQUARE_PATTERN.test(normalized)) {
    return {
      success: false,
      error: new AppError(
        `Invalid grid square format: ${grid}`,
        'INVALID_GRID',
        [
          'Grid squares must be 4 or 6 characters (e.g., FN42, FN42ab)',
          'First 2 characters: letters A-R',
          'Next 2 characters: digits 0-9',
          'Optional last 2: letters a-x',
        ]
      ),
    };
  }

  return { success: true, data: normalized };
}

/**
 * Validate callsign
 */
export function validateCallsign(callsign: string): Result<string> {
  const normalized = callsign.toUpperCase().trim();

  if (!normalized) {
    return {
      success: false,
      error: new AppError('Callsign is required', 'INVALID_INPUT'),
    };
  }

  if (!CALLSIGN_PATTERN.test(normalized)) {
    return {
      success: false,
      error: new AppError(
        `Invalid callsign format: ${callsign}`,
        'INVALID_CALLSIGN',
        ['Callsigns should be 3-6 alphanumeric characters']
      ),
    };
  }

  return { success: true, data: normalized };
}

/**
 * Validate file path for exports
 */
export function validateExportPath(
  path: string,
  allowedDir: string
): Result<string> {
  if (!path) {
    return {
      success: false,
      error: new AppError('Output path is required', 'INVALID_INPUT'),
    };
  }

  // Basic path traversal check
  if (path.includes('..')) {
    return {
      success: false,
      error: new AppError(
        'Path cannot contain ".."',
        'PATH_TRAVERSAL',
        ['Provide an absolute path or relative path without ".."']
      ),
    };
  }

  // Resolve to absolute path
  const resolved = require('path').resolve(path);

  // Check if within allowed directory
  if (!resolved.startsWith(allowedDir)) {
    return {
      success: false,
      error: new AppError(
        `Export path must be within ${allowedDir}`,
        'PATH_NOT_ALLOWED',
        [`Export to ${allowedDir} or a subdirectory`]
      ),
    };
  }

  return { success: true, data: resolved };
}

/**
 * Validate state code
 */
export function validateStateCode(state: string): Result<string> {
  const normalized = state.toUpperCase().trim();

  if (normalized.length !== 2) {
    return {
      success: false,
      error: new AppError(
        `Invalid state code: ${state}`,
        'INVALID_STATE',
        ['Use 2-letter state codes (e.g., WA, CA, NY)']
      ),
    };
  }

  return { success: true, data: normalized };
}

/**
 * Validate limit (positive integer)
 */
export function validateLimit(limit: string | number): Result<number> {
  const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  if (isNaN(num) || num < 1) {
    return {
      success: false,
      error: new AppError(
        `Invalid limit: ${limit}`,
        'INVALID_LIMIT',
        ['Limit must be a positive integer']
      ),
    };
  }

  if (num > 1000) {
    return {
      success: false,
      error: new AppError('Limit too large', 'LIMIT_TOO_LARGE', [
        'Maximum limit is 1000',
      ]),
    };
  }

  return { success: true, data: num };
}
