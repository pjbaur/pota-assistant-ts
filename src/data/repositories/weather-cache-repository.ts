// Weather cache repository - handles weather forecast caching

import { getDatabase } from '../database.js';
import type { DailyForecast, Result } from '../../types/index.js';
import { AppError } from '../../types/index.js';

// Cache entry structure
export interface WeatherCacheEntry {
  id: number;
  latitude: number;
  longitude: number;
  forecastDate: string;
  data: string; // JSON string of DailyForecast
  fetchedAt: Date;
  expiresAt: Date;
}

// Input type for setting cache
export interface WeatherCacheInput {
  latitude: number;
  longitude: number;
  forecastDate: string;
  data: DailyForecast;
}

/**
 * Convert a database row to a WeatherCacheEntry
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
 * Get cached weather data for a location and date
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
 * Store weather data in the cache
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
 * Check if cached weather data is expired or missing
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
 * Get all cached forecasts for a location (useful for multi-day forecasts)
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
 * Delete expired cache entries (cleanup utility)
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
