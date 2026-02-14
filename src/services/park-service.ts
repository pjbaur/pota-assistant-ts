// Park service - coordinates between POTA API client and park repository

import * as parkRepository from '../data/repositories/park-repository.js';
import {
  fetchAllParks,
  fetchParkByReference,
  type ParkApiData,
} from '../api/pota-client.js';
import { calculateGridSquare } from '../utils/grid-square.js';
import type { Park, ParkSearchResult, Result } from '../types/index.js';
import { AppError } from '../types/index.js';

// Park data sync options
export interface SyncOptions {
  region?: string; // Filter by region/entity
  force?: boolean; // Force sync even if recently synced
}

// Sync result
export interface SyncResult {
  count: number;
  staleWarning?: string;
}

// Constants
const PARK_DATA_STALE_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Transform API park data to repository input format
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
 * Check if park data is stale (> 30 days old)
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
 * Search parks by query with optional filters
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
 * Get a park by its POTA reference
 * First checks local database, then falls back to API
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
 * Sync park data from POTA API
 * Downloads all parks and stores them in the local database
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
 * Get count of parks in local database
 */
export function getParkCount(): Result<number> {
  return parkRepository.count();
}

/**
 * Check if local database has parks
 */
export function hasParks(): boolean {
  const countResult = parkRepository.count();
  return countResult.success && countResult.data > 0;
}
