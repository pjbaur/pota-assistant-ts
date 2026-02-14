/**
 * Weather cache repository - handles weather forecast caching.
 *
 * Provides data access layer for weather cache entries including:
 * - Storing and retrieving forecast data by location and date
 * - Cache expiration tracking
 * - Range queries for multi-day forecasts
 * - Cleanup of expired entries
 *
 * Coordinates are rounded to 4 decimal places (~11m precision)
 * for consistent cache lookups.
 *
 * @module data/repositories/weather-cache-repository
 */

import { getDatabase } from '../database.js';
import type { DailyForecast, Result } from '../../types/index.js';
import { AppError } from '../../types/index.js';

/**
 * Represents a cached weather forecast entry.
 */
export interface WeatherCacheEntry {
  id: number;
  latitude: number;
  longitude: number;
  forecastDate: string;
  data: string; // JSON string of DailyForecast
  fetchedAt: Date;
  expiresAt: Date;
}

/**
 * Input type for storing weather cache entries.
 */
export interface WeatherCacheInput {
  latitude: number;
  longitude: number;
  forecastDate: string;
  data: DailyForecast;
}

/**
 * Converts a database row to a WeatherCacheEntry object.
 *
 * @param row - Raw database row
 * @returns Typed WeatherCacheEntry object
 *
 * @internal
 */
function rowToCacheEntry(row: Record<string, unknown>): WeatherCacheEntry {
  return {
    id: row.id as number,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    forecastDate: row.forecastDate as string,
    data: row.data as string,
    fetchedAt: new Date(row.fetchedAt as string),
    expiresAt: new Date(row.expiresAt as string),
  };
}

/**
 * Gets cached weather data for a location and date.
 *
 * Coordinates are rounded to 4 decimal places for consistent lookups.
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @param date - Target date in YYYY-MM-DD format
 * @returns A Result containing the cache entry or null if not found
 *
 * @example
 * ```typescript
 * const result = get(44.4280, -110.5885, '2024-07-15');
 * if (result.success && result.data) {
 *   const forecast = JSON.parse(result.data.data) as DailyForecast;
 * }
 * ```
 */
export function get(
  latitude: number,
  longitude: number,
  date: string
): Result<WeatherCacheEntry | null> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    // Round lat/lon to 4 decimal places for consistent lookups (~11m precision)
    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;

    const row = db
      .prepare(
        `SELECT * FROM weather_cache
         WHERE latitude = ? AND longitude = ? AND forecastDate = ?`
      )
      .get(lat, lon, date) as Record<string, unknown> | undefined;

    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: rowToCacheEntry(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to get weather cache: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_CACHE_GET_ERROR'
      ),
    };
  }
}

/**
 * Stores weather data in the cache.
 *
 * Uses INSERT ... ON CONFLICT to atomically create or update.
 * The expiresAt timestamp is set based on the TTL.
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @param date - Target date in YYYY-MM-DD format
 * @param data - Daily forecast data to cache
 * @param ttlHours - Time-to-live in hours (default: 1)
 * @returns A Result containing the created cache entry
 *
 * @example
 * ```typescript
 * const result = set(44.4280, -110.5885, '2024-07-15', forecast, 1);
 * ```
 */
export function set(
  latitude: number,
  longitude: number,
  date: string,
  data: DailyForecast,
  ttlHours = 1
): Result<WeatherCacheEntry> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    // Round lat/lon to 4 decimal places for consistent lookups
    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;

    const dataJson = JSON.stringify(data);

    db
      .prepare(
        `INSERT INTO weather_cache (latitude, longitude, forecastDate, data, fetchedAt, expiresAt)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+${ttlHours} hours'))
         ON CONFLICT(latitude, longitude, forecastDate) DO UPDATE SET
           data = excluded.data,
           fetchedAt = datetime('now'),
           expiresAt = datetime('now', '+${ttlHours} hours')`
      )
      .run(lat, lon, date, dataJson);

    const row = db
      .prepare(
        `SELECT * FROM weather_cache
         WHERE latitude = ? AND longitude = ? AND forecastDate = ?`
      )
      .get(lat, lon, date) as Record<string, unknown>;

    return { success: true, data: rowToCacheEntry(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to set weather cache: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_CACHE_SET_ERROR'
      ),
    };
  }
}

/**
 * Checks if cached weather data is expired or missing.
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @param date - Target date in YYYY-MM-DD format
 * @returns A Result containing true if expired or missing, false if valid
 *
 * @example
 * ```typescript
 * const result = isExpired(44.4280, -110.5885, '2024-07-15');
 * if (result.success && result.data) {
 *   // Need to fetch fresh data
 * }
 * ```
 */
export function isExpired(
  latitude: number,
  longitude: number,
  date: string
): Result<boolean> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    // Round lat/lon to 4 decimal places
    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;

    const row = db
      .prepare(
        `SELECT expiresAt FROM weather_cache
         WHERE latitude = ? AND longitude = ? AND forecastDate = ?`
      )
      .get(lat, lon, date) as { expiresAt: string } | undefined;

    if (!row) {
      // No cache entry means it's "expired" (needs fetching)
      return { success: true, data: true };
    }

    const expiresAt = new Date(row.expiresAt);
    const isExpiredResult = expiresAt <= new Date();

    return { success: true, data: isExpiredResult };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to check weather cache expiry: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_CACHE_CHECK_ERROR'
      ),
    };
  }
}

/**
 * Gets all cached forecasts for a location within a date range.
 *
 * Useful for retrieving multi-day forecasts without making
 * individual calls for each day.
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns A Result containing an array of cache entries
 *
 * @example
 * ```typescript
 * const result = getRange(44.4280, -110.5885, '2024-07-15', '2024-07-21');
 * if (result.success) {
 *   result.data.forEach(entry => {
 *     console.log(`Forecast for ${entry.forecastDate}`);
 *   });
 * }
 * ```
 */
export function getRange(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Result<WeatherCacheEntry[]> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    const lat = Math.round(latitude * 10000) / 10000;
    const lon = Math.round(longitude * 10000) / 10000;

    const rows = db
      .prepare(
        `SELECT * FROM weather_cache
         WHERE latitude = ? AND longitude = ?
         AND forecastDate >= ? AND forecastDate <= ?
         ORDER BY forecastDate ASC`
      )
      .all(lat, lon, startDate, endDate) as Record<string, unknown>[];

    const entries = rows.map(rowToCacheEntry);

    return { success: true, data: entries };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to get weather cache range: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_CACHE_RANGE_ERROR'
      ),
    };
  }
}

/**
 * Deletes expired cache entries.
 *
 * Cleanup utility to remove cache entries that have passed
 * their expiration time. Should be called periodically.
 *
 * @returns A Result containing the count of deleted entries
 *
 * @example
 * ```typescript
 * const result = deleteExpired();
 * if (result.success) {
 *   console.log(`Cleaned up ${result.data.count} expired entries`);
 * }
 * ```
 */
export function deleteExpired(): Result<{ count: number }> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    const result = db
      .prepare(
        `DELETE FROM weather_cache
         WHERE expiresAt < datetime('now')`
      )
      .run();

    return { success: true, data: { count: result.changes } };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to delete expired weather cache: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_CACHE_DELETE_ERROR'
      ),
    };
  }
}
