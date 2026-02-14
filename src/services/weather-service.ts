/**
 * Weather service - coordinates weather data fetching and caching.
 *
 * This service layer handles:
 * - Weather forecast fetching from Open-Meteo API
 * - Local caching with configurable TTL (default: 1 hour)
 * - Fallback to stale cache when API is unavailable
 * - WMO weather code interpretation
 *
 * @module services/weather-service
 */

import { fetchForecast, type OpenMeteoResponse } from '../api/weather-client.js';
import * as weatherCache from '../data/repositories/weather-cache-repository.js';
import type {
  DailyForecast,
  Result,
  WeatherForecast,
} from '../types/index.js';
import { AppError } from '../types/index.js';

/** Cache time-to-live in hours (1 hour) */
const CACHE_TTL_HOURS = 1;

/**
 * WMO weather code to human-readable description mapping.
 *
 * Based on WMO Code Table 4677 (simplified). These codes are standard
 * international weather codes used by meteorological services worldwide.
 *
 * @see https://open-meteo.com/en/docs
 */
const WMO_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Gets a human-readable description for a WMO weather code.
 *
 * Converts numeric weather codes from the Open-Meteo API to
 * descriptive strings like "Clear sky" or "Thunderstorm".
 *
 * @param code - WMO weather code (0-99)
 * @returns Human-readable weather description
 *
 * @example
 * ```typescript
 * const desc = getWeatherCodeDescription(95);
 * console.log(desc); // "Thunderstorm"
 * ```
 */
export function getWeatherCodeDescription(code: number): string {
  return WMO_CODE_DESCRIPTIONS[code] ?? `Unknown weather code: ${code}`;
}

/**
 * Converts wind direction degrees to cardinal direction.
 *
 * Maps 0-360 degrees to 16 cardinal directions (N, NNE, NE, etc.).
 * Note: Open-Meteo daily data doesn't include wind direction, so
 * this is currently a placeholder for future enhancement.
 *
 * @param degrees - Wind direction in degrees (0-360)
 * @returns Cardinal direction string (e.g., "N", "NE", "SSW")
 *
 * @internal
 */
function degreesToCardinal(degrees: number): string {
  // Open-Meteo doesn't provide wind direction in the current params
  // Return N/A as placeholder - could be enhanced if direction data is added
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Normalizes raw Open-Meteo response to application WeatherForecast type.
 *
 * Transforms the API response arrays into a structured forecast object
 * with individual DailyForecast entries for each day.
 *
 * @param raw - Raw Open-Meteo API response
 * @returns Normalized WeatherForecast object with daily forecasts
 *
 * @example
 * ```typescript
 * const apiResponse = await fetchForecast(lat, lon);
 * if (apiResponse.success) {
 *   const forecast = normalizeWeatherData(apiResponse.data);
 *   console.log(`Forecast for ${forecast.forecasts.length} days`);
 * }
 * ```
 */
export function normalizeWeatherData(raw: OpenMeteoResponse): WeatherForecast {
  const daily = raw.daily;
  const forecasts: DailyForecast[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const weatherCode = daily.weathercode[i] ?? 0;
    const forecast: DailyForecast = {
      date: daily.time[i] ?? '',
      highTemp: daily.temperature_2m_max[i] ?? 0,
      lowTemp: daily.temperature_2m_min[i] ?? 0,
      precipitationChance: daily.precipitation_probability_max[i] ?? 0,
      windSpeed: daily.windspeed_10m_max[i] ?? 0,
      windDirection: degreesToCardinal(0), // Open-Meteo daily doesn't include direction
      conditions: getWeatherCodeDescription(weatherCode),
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
    };
    forecasts.push(forecast);
  }

  return {
    location: {
      lat: raw.latitude,
      lon: raw.longitude,
    },
    fetchedAt: new Date().toISOString(),
    forecasts,
  };
}

/**
 * Gets weather forecast for a specific location and date.
 *
 * Implements a cache-first strategy:
 * 1. Checks the local cache first (1-hour TTL)
 * 2. Fetches from API if cache miss or expired
 * 3. Returns cached data with stale warning if API fails
 *
 * This ensures the application can function offline with
 * potentially stale data when connectivity is unavailable.
 *
 * @param lat - Latitude coordinate (-90 to 90)
 * @param lon - Longitude coordinate (-180 to 180)
 * @param date - Target date in YYYY-MM-DD format
 * @returns A Result containing the WeatherForecast or an error
 *
 * @example
 * ```typescript
 * const result = await getForecast(44.4280, -110.5885, '2024-07-15');
 * if (result.success) {
 *   const day = result.data.forecasts[0];
 *   console.log(`High: ${day.highTemp}°F, Conditions: ${day.conditions}`);
 *   if (result.data.staleWarning) {
 *     console.warn(result.data.staleWarning);
 *   }
 * }
 * ```
 */
export async function getForecast(
  lat: number,
  lon: number,
  date: string
): Promise<Result<WeatherForecast>> {
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      success: false,
      error: new AppError(
        `Invalid date format: ${date}. Expected YYYY-MM-DD.`,
        'INVALID_DATE_FORMAT',
        ['Use the format YYYY-MM-DD for the date parameter']
      ),
    };
  }

  // Check cache first
  const cacheResult = weatherCache.get(lat, lon, date);
  if (!cacheResult.success) {
    return cacheResult;
  }

  // Check if we have valid cached data
  const expiredResult = weatherCache.isExpired(lat, lon, date);
  if (!expiredResult.success) {
    return expiredResult;
  }

  const isExpired = expiredResult.data;
  const cachedEntry = cacheResult.data;

  // If we have non-expired cache, use it
  if (cachedEntry && !isExpired) {
    try {
      const cachedData = JSON.parse(cachedEntry.data) as DailyForecast;
      return {
        success: true,
        data: {
          location: { lat: cachedEntry.latitude, lon: cachedEntry.longitude },
          fetchedAt: cachedEntry.fetchedAt.toISOString(),
          forecasts: [cachedData],
        },
      };
    } catch {
      // Invalid cached data, fall through to fetch
    }
  }

  // Fetch from API
  const apiResult = await fetchForecast(lat, lon);

  if (apiResult.success) {
    // Normalize the data
    const normalizedForecast = normalizeWeatherData(apiResult.data);

    // Find the forecast for the requested date
    const dayForecast = normalizedForecast.forecasts.find(
      (f) => f.date === date
    );

    if (dayForecast) {
      // Cache the specific day's forecast
      weatherCache.set(lat, lon, date, dayForecast, CACHE_TTL_HOURS);

      // Return just the requested date's forecast
      return {
        success: true,
        data: {
          location: normalizedForecast.location,
          fetchedAt: normalizedForecast.fetchedAt,
          forecasts: [dayForecast],
        },
      };
    }

    // Date not in forecast range - return what we have with a warning
    return {
      success: true,
      data: {
        ...normalizedForecast,
        staleWarning: `Requested date ${date} not available in forecast. Showing available dates.`,
      },
    };
  }

  // API failed - try to return stale cached data
  if (cachedEntry) {
    try {
      const cachedData = JSON.parse(cachedEntry.data) as DailyForecast;
      return {
        success: true,
        data: {
          location: { lat: cachedEntry.latitude, lon: cachedEntry.longitude },
          fetchedAt: cachedEntry.fetchedAt.toISOString(),
          staleWarning: `Using cached data from ${cachedEntry.fetchedAt.toLocaleString()}. API unavailable: ${apiResult.error.message}`,
          forecasts: [cachedData],
        },
      };
    } catch {
      // Fall through to return error
    }
  }

  // No cache available, return the API error
  const apiError = apiResult.error as AppError;
  return {
    success: false,
    error: new AppError(
      `Failed to get weather forecast: ${apiResult.error.message}`,
      apiError.code,
      apiError.suggestions
    ),
  };
}

/**
 * Gets a multi-day weather forecast for a location.
 *
 * Fetches the full 7-day forecast from Open-Meteo and caches each
 * day's forecast individually for future lookups. Falls back to
 * cached data if the API is unavailable.
 *
 * @param lat - Latitude coordinate (-90 to 90)
 * @param lon - Longitude coordinate (-180 to 180)
 * @returns A Result containing the WeatherForecast with multiple days or an error
 *
 * @example
 * ```typescript
 * const result = await getMultiDayForecast(44.4280, -110.5885);
 * if (result.success) {
 *   result.data.forecasts.forEach(day => {
 *     console.log(`${day.date}: ${day.conditions}, High ${day.highTemp}°F`);
 *   });
 * }
 * ```
 */
export async function getMultiDayForecast(
  lat: number,
  lon: number
): Promise<Result<WeatherForecast>> {
  // Fetch from API - Open-Meteo returns 7 days by default
  const apiResult = await fetchForecast(lat, lon);

  if (!apiResult.success) {
    // Try to return cached data for the next few days
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0];

    const cachedResult = weatherCache.getRange(lat, lon, today, endDateStr);
    if (cachedResult.success && cachedResult.data.length > 0) {
      const cachedForecasts: DailyForecast[] = [];
      let oldestFetch = new Date();

      for (const entry of cachedResult.data) {
        try {
          const data = JSON.parse(entry.data) as DailyForecast;
          cachedForecasts.push(data);
          if (entry.fetchedAt < oldestFetch) {
            oldestFetch = entry.fetchedAt;
          }
        } catch {
          // Skip invalid entries
        }
      }

      if (cachedForecasts.length > 0) {
        return {
          success: true,
          data: {
            location: { lat: cachedResult.data[0].latitude, lon: cachedResult.data[0].longitude },
            fetchedAt: oldestFetch.toISOString(),
            staleWarning: `Using cached data. API unavailable: ${apiResult.error.message}`,
            forecasts: cachedForecasts.sort((a, b) => a.date.localeCompare(b.date)),
          },
        };
      }
    }

    const apiError = apiResult.error as AppError;
    return {
      success: false,
      error: new AppError(
        `Failed to get weather forecast: ${apiResult.error.message}`,
        apiError.code,
        apiError.suggestions
      ),
    };
  }

  // Normalize and cache the data
  const normalizedForecast = normalizeWeatherData(apiResult.data);

  // Cache each day's forecast individually
  for (const dayForecast of normalizedForecast.forecasts) {
    weatherCache.set(lat, lon, dayForecast.date, dayForecast, CACHE_TTL_HOURS);
  }

  return { success: true, data: normalizedForecast };
}

/**
 * Cleans up expired cache entries.
 *
 * Removes weather cache entries that have passed their expiration time.
 * Should be called periodically to prevent unbounded cache growth.
 *
 * @returns A Result containing the count of deleted entries
 *
 * @example
 * ```typescript
 * const result = cleanupCache();
 * if (result.success) {
 *   console.log(`Removed ${result.data.count} expired entries`);
 * }
 * ```
 */
export function cleanupCache(): Result<{ count: number }> {
  return weatherCache.deleteExpired();
}
