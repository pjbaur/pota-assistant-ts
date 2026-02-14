// POTA.app API HTTP client

import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

// API configuration
const POTATO_API_BASE_URL = 'https://api.pota.app';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Raw park data as returned by the POTA API
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
 * Network error for API failures
 */
export class NetworkError extends Error {
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
 * Create a timeout signal for fetch requests
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

/**
 * Make a fetch request with timeout and error handling
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
        Accept: 'application/json',
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
 * Fetch all parks from the POTA API
 */
export async function fetchAllParks(): Promise<Result<ParkApiData[]>> {
  const url = `${POTATO_API_BASE_URL}/parks`;
  return fetchWithTimeout<ParkApiData[]>(url);
}

/**
 * Fetch a single park by its POTA reference
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
 * Fetch parks by entity ID (country/entity)
 */
export async function fetchParksByEntity(
  entityId: number
): Promise<Result<ParkApiData[]>> {
  const url = `${POTATO_API_BASE_URL}/parks/entity/${entityId}`;
  return fetchWithTimeout<ParkApiData[]>(url);
}

/**
 * Check if the POTA API is reachable
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
