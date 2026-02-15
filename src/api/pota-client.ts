/**
 * POTA.app API HTTP client
 *
 * Provides functions to interact with the Parks on the Air API for fetching
 * park information, activation data, and other POTA resources.
 *
 * @module api/pota-client
 */

import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

/** Base URL for the POTA API */
const POTATO_API_BASE_URL = 'https://api.pota.app';

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30000;

/** User agent string for API requests */
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Default headers for all API requests */
const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': USER_AGENT,
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

/**
 * Raw park data as returned by the POTA API.
 *
 * Represents the structure of park data returned directly from api.pota.app
 * before any transformation or normalization.
 */
export interface ParkApiData {
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  grid: string;
  state: string;
  stateName: string;
  entityId: number;
  entityName: string;
  locationDesc: string;
  type: string;
  isActive: boolean;
}

/**
 * Network error for API failures.
 *
 * Thrown when HTTP requests to the POTA API fail due to network issues,
 * timeouts, or non-successful HTTP status codes.
 *
 * @extends Error
 *
 * @example
 * ```typescript
 * if (result.error instanceof NetworkError) {
 *   console.log(`Status code: ${result.error.statusCode}`);
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * Creates a new NetworkError.
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code if available (e.g., 404, 500)
   * @param originalError - The underlying error that caused this failure
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Creates an AbortSignal that triggers after a specified timeout.
 *
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns An AbortSignal that will abort after the timeout
 *
 * @internal
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Makes a fetch request with timeout and comprehensive error handling.
 *
 * Wraps the native fetch API with:
 * - Configurable timeout using AbortController
 * - JSON response parsing
 * - Error normalization into NetworkError or AppError
 *
 * @typeParam T - Expected type of the response data
 * @param url - Full URL to fetch
 * @param options - Optional fetch options (headers, method, etc.)
 * @returns A Result containing the parsed JSON data or an error
 *
 * @internal
 */
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {}
): Promise<Result<T>> {
  try {
    const signal = createTimeoutSignal(REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      ...options,
      signal,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: new NetworkError(
          `API request failed with status ${response.status}: ${response.statusText}`,
          response.status
        ),
      };
    }

    const data = await response.json();
    return { success: true, data: data as T };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: new NetworkError(
            `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
            undefined,
            error
          ),
        };
      }

      return {
        success: false,
        error: new NetworkError(
          `Network error: ${error.message}`,
          undefined,
          error
        ),
      };
    }

    return {
      success: false,
      error: new AppError(
        `Unexpected error during API request: ${String(error)}`,
        'API_UNKNOWN_ERROR'
      ),
    };
  }
}

/**
 * Fetches all parks from the POTA API.
 *
 * Retrieves the complete park database from api.pota.app/parks.
 * This can be a large response (thousands of parks) and should be
 * cached locally after retrieval.
 *
 * @returns A Result containing an array of all parks or a NetworkError
 *
 * @example
 * ```typescript
 * const result = await fetchAllParks();
 * if (result.success) {
 *   console.log(`Fetched ${result.data.length} parks`);
 * } else {
 *   console.error(`Failed: ${result.error.message}`);
 * }
 * ```
 */
export async function fetchAllParks(): Promise<Result<ParkApiData[]>> {
  const url = `${POTATO_API_BASE_URL}/parks`;
  return fetchWithTimeout<ParkApiData[]>(url);
}

/**
 * Fetches a single park by its POTA reference.
 *
 * Looks up a specific park using its unique reference identifier
 * (e.g., "K-0039" for Yellowstone National Park).
 *
 * @param ref - The park reference ID (will be normalized to uppercase)
 * @returns A Result containing the park data, null if not found, or an error
 *
 * @example
 * ```typescript
 * const result = await fetchParkByReference('k-0039');
 * if (result.success && result.data) {
 *   console.log(`Park: ${result.data.name}`);
 * }
 * ```
 */
export async function fetchParkByReference(
  ref: string
): Promise<Result<ParkApiData | null>> {
  // Normalize the reference (uppercase)
  const normalizedRef = ref.toUpperCase();
  const url = `${POTATO_API_BASE_URL}/park/${normalizedRef}`;

  const result = await fetchWithTimeout<ParkApiData>(url);

  if (!result.success) {
    // If it's a 404, return null instead of an error
    if (result.error instanceof NetworkError && result.error.statusCode === 404) {
      return { success: true, data: null };
    }
    return result;
  }

  return { success: true, data: result.data };
}

/**
 * Fetches parks by entity ID (country/entity).
 *
 * Retrieves all parks associated with a specific entity, such as
 * a country or administrative region.
 *
 * @param entityId - The POTA entity ID (numeric identifier)
 * @returns A Result containing an array of parks for the entity or an error
 *
 * @example
 * ```typescript
 * // Fetch all parks in a specific entity
 * const result = await fetchParksByEntity(291); // Example entity ID
 * ```
 */
export async function fetchParksByEntity(
  entityId: number
): Promise<Result<ParkApiData[]>> {
  const url = `${POTATO_API_BASE_URL}/parks/entity/${entityId}`;
  return fetchWithTimeout<ParkApiData[]>(url);
}

/**
 * Checks if the POTA API is reachable.
 *
 * Performs a lightweight HEAD request to the API health endpoint
 * to verify connectivity without transferring significant data.
 *
 * @returns A Result containing true if the API is reachable, false otherwise.
 *          Note: This function never returns success: false - it always returns
 *          success: true with a boolean indicating reachability.
 *
 * @example
 * ```typescript
 * const result = await checkApiHealth();
 * if (result.success && result.data) {
 *   console.log('POTA API is online');
 * }
 * ```
 */
export async function checkApiHealth(): Promise<Result<boolean>> {
  const url = `${POTATO_API_BASE_URL}/health`;

  try {
    const signal = createTimeoutSignal(5000); // 5 second timeout for health check
    const response = await fetch(url, { method: 'HEAD', signal });
    return { success: true, data: response.ok };
  } catch {
    return { success: true, data: false };
  }
}
