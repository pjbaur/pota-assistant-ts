/**
 * Park service - coordinates between POTA API client and park repository.
 *
 * This service layer handles:
 * - Park data synchronization from the POTA API
 * - Local database caching for offline access
 * - Park search and lookup operations
 * - Stale data detection and warnings
 *
 * @module services/park-service
 */

import * as parkRepository from '../data/repositories/park-repository.js';
import {
  fetchAllParks,
  fetchParkByReference,
  type ParkApiData,
} from '../api/pota-client.js';
import { calculateGridSquare } from '../utils/grid-square.js';
import type { Park, ParkSearchResult, Result } from '../types/index.js';
import { AppError } from '../types/index.js';

/**
 * Options for park data synchronization.
 */
export interface SyncOptions {
  region?: string; // Filter by region/entity
  force?: boolean; // Force sync even if recently synced
}

/**
 * Result of a park data synchronization operation.
 */
export interface SyncResult {
  count: number;
  staleWarning?: string;
}

/** Number of days before park data is considered stale */
const PARK_DATA_STALE_DAYS = 30;

/** Milliseconds in a day, used for staleness calculations */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Transforms raw API park data to repository input format.
 *
 * Handles data normalization including:
 * - Grid square calculation if not provided
 * - POTA URL generation
 * - Null coalescing for optional fields
 *
 * @param apiData - Raw park data from the POTA API
 * @returns Normalized data ready for database insertion
 *
 * @internal
 */
function transformApiDataToRepository(
  apiData: ParkApiData
): parkRepository.ParkUpsertInput {
  // Calculate grid square if not provided in API response
  const gridSquare = apiData.grid || calculateGridSquare(apiData.latitude, apiData.longitude);

  // Build POTA URL
  const potaUrl = `https://pota.app/#/park/${apiData.reference}`;

  return {
    reference: apiData.reference,
    name: apiData.name,
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    gridSquare: gridSquare,
    state: apiData.state || null,
    country: apiData.entityName || null,
    region: apiData.stateName || null,
    parkType: apiData.type || null,
    isActive: apiData.isActive,
    potaUrl: potaUrl,
    metadata: apiData.locationDesc || null,
  };
}

/**
 * Checks if park data is stale and returns a warning message.
 *
 * Park data older than 30 days is considered stale and should be
 * refreshed to ensure accuracy of park information.
 *
 * @returns A warning string if data is stale or missing, null otherwise
 *
 * @example
 * ```typescript
 * const warning = getStaleWarning();
 * if (warning) {
 *   console.warn(warning); // "Park data is 45 days old. Run 'pota sync'..."
 * }
 * ```
 */
export function getStaleWarning(): string | null {
  const lastSyncResult = parkRepository.getLastSyncTime();

  if (!lastSyncResult.success) {
    return 'Unable to determine last sync time. Run "pota sync" to update park data.';
  }

  const lastSync = lastSyncResult.data;

  if (!lastSync) {
    return 'No park data found. Run "pota sync" to download park information.';
  }

  const daysSinceSync = Math.floor(
    (Date.now() - lastSync.getTime()) / MILLISECONDS_PER_DAY
  );

  if (daysSinceSync > PARK_DATA_STALE_DAYS) {
    return `Park data is ${daysSinceSync} days old. Run "pota sync" to refresh.`;
  }

  return null;
}

/**
 * Searches parks by query with optional filters.
 *
 * Performs a full-text search against park names and reference IDs.
 * Results include a stale warning if park data hasn't been synced recently.
 *
 * @param query - Search string to match against park name or reference
 * @param options - Search options
 * @param options.state - Filter by US state code (e.g., "WA", "CA")
 * @param options.limit - Maximum number of results to return (default: 50)
 * @returns A Result containing search results with parks and total count
 *
 * @example
 * ```typescript
 * const result = await searchParks('yellowstone', { state: 'WY', limit: 10 });
 * if (result.success) {
 *   console.log(`Found ${result.data.total} parks`);
 *   result.data.parks.forEach(park => console.log(park.name));
 * }
 * ```
 */
export async function searchParks(
  query: string,
  options: { state?: string; limit?: number } = {}
): Promise<Result<ParkSearchResult>> {
  // Perform search using repository
  const searchResult = parkRepository.search(query, options);

  if (!searchResult.success) {
    return searchResult;
  }

  // Add stale warning if applicable
  const staleWarning = getStaleWarning();

  return {
    success: true,
    data: {
      ...searchResult.data,
      ...(staleWarning && { staleWarning }),
    },
  };
}

/**
 * Gets a park by its POTA reference.
 *
 * First checks the local database for cached data. If not found,
 * fetches from the POTA API and caches the result for future use.
 * This enables offline access to previously viewed parks.
 *
 * @param ref - The park reference ID (e.g., "K-0039")
 * @returns A Result containing the Park object, null if not found, or an error
 *
 * @example
 * ```typescript
 * const result = await getParkByReference('K-0039');
 * if (result.success && result.data) {
 *   console.log(`Park: ${result.data.name}`);
 *   console.log(`Location: ${result.data.latitude}, ${result.data.longitude}`);
 * }
 * ```
 */
export async function getParkByReference(
  ref: string
): Promise<Result<Park | null>> {
  // Normalize reference
  const normalizedRef = ref.toUpperCase();

  // First check local database
  const localResult = parkRepository.findByReference(normalizedRef);

  if (!localResult.success) {
    return localResult;
  }

  if (localResult.data) {
    return { success: true, data: localResult.data };
  }

  // Not found locally, try API
  const apiResult = await fetchParkByReference(normalizedRef);

  if (!apiResult.success) {
    return {
      success: false,
      error: new AppError(
        `Failed to fetch park ${normalizedRef}: ${apiResult.error.message}`,
        'PARK_FETCH_ERROR',
        ['Check your internet connection', 'Verify the park reference is correct']
      ),
    };
  }

  if (!apiResult.data) {
    return { success: true, data: null };
  }

  // Store in local database for future use
  const repoInput = transformApiDataToRepository(apiResult.data);
  const upsertResult = parkRepository.upsert(repoInput);

  if (!upsertResult.success) {
    // Log warning but still return the data
    console.warn(`Warning: Failed to cache park ${normalizedRef} locally`);
  }

  return { success: true, data: upsertResult.success ? upsertResult.data : null };
}

/**
 * Synchronizes park data from the POTA API.
 *
 * Downloads all parks (or parks for a specific region) and stores them
 * in the local database for offline access. Skips sync if data was
 * refreshed within the last hour unless force is true.
 *
 * @param options - Sync options
 * @param options.region - Filter by region/entity (e.g., "US", "CA", "EU")
 * @param options.force - Force sync even if recently synced
 * @returns A Result containing the count of synced parks and optional warnings
 *
 * @example
 * ```typescript
 * // Sync all US parks
 * const result = await syncParks({ region: 'US' });
 * if (result.success) {
 *   console.log(`Synced ${result.data.count} parks`);
 * }
 *
 * // Force full resync
 * const forceResult = await syncParks({ force: true });
 * ```
 */
export async function syncParks(options: SyncOptions = {}): Promise<Result<SyncResult>> {
  // Check if we should skip sync
  if (!options.force) {
    const lastSyncResult = parkRepository.getLastSyncTime();

    if (lastSyncResult.success && lastSyncResult.data) {
      const hoursSinceSync =
        (Date.now() - lastSyncResult.data.getTime()) / (60 * 60 * 1000);

      // Skip if synced within the last hour
      if (hoursSinceSync < 1) {
        const countResult = parkRepository.count();
        return {
          success: true,
          data: {
            count: countResult.success ? countResult.data : 0,
            staleWarning: 'Park data was synced recently. Use --force to sync again.',
          },
        };
      }
    }
  }

  // Fetch all parks from API
  const apiResult = await fetchAllParks();

  if (!apiResult.success) {
    return {
      success: false,
      error: new AppError(
        `Failed to fetch parks from POTA API: ${apiResult.error.message}`,
        'PARK_SYNC_ERROR',
        ['Check your internet connection', 'Try again later']
      ),
    };
  }

  let parksToSync = apiResult.data;

  // Filter by region if specified
  if (options.region) {
    const regionLower = options.region.toLowerCase();
    parksToSync = parksToSync.filter(
      (park) =>
        park.entityName?.toLowerCase().includes(regionLower) ||
        park.stateName?.toLowerCase().includes(regionLower) ||
        park.state?.toLowerCase() === regionLower
    );
  }

  // Transform and store parks
  const repoInputs = parksToSync.map(transformApiDataToRepository);
  const upsertResult = parkRepository.upsertMany(repoInputs);

  if (!upsertResult.success) {
    return {
      success: false,
      error: new AppError(
        `Failed to store parks in database: ${upsertResult.error.message}`,
        'PARK_SYNC_ERROR',
        ['Check database permissions', 'Ensure sufficient disk space']
      ),
    };
  }

  return {
    success: true,
    data: {
      count: upsertResult.data.count,
      staleWarning: getStaleWarning() ?? undefined,
    },
  };
}

/**
 * Gets the count of parks in the local database.
 *
 * @returns A Result containing the park count or an error
 *
 * @example
 * ```typescript
 * const result = getParkCount();
 * if (result.success) {
 *   console.log(`${result.data} parks in database`);
 * }
 * ```
 */
export function getParkCount(): Result<number> {
  return parkRepository.count();
}

/**
 * Checks if the local database has any parks.
 *
 * Useful for determining if an initial sync is needed before
 * the application can function offline.
 *
 * @returns True if at least one park exists in the database
 *
 * @example
 * ```typescript
 * if (!hasParks()) {
 *   console.log('Run "pota sync" to download park data');
 * }
 * ```
 */
export function hasParks(): boolean {
  const countResult = parkRepository.count();
  return countResult.success && countResult.data > 0;
}
