/**
 * Open-Meteo API client for weather forecasts.
 *
 * Provides functions to fetch weather forecast data from the Open-Meteo API.
 * This is a free API that requires no authentication.
 *
 * @module api/weather-client
 *
 * @see https://open-meteo.com/en/docs
 */

import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

/**
 * Daily weather data structure from Open-Meteo API.
 *
 * Contains arrays of weather metrics indexed by day. Each array index
 * corresponds to the same day across all properties.
 */
export interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  windspeed_10m_max: number[];
  weathercode: number[];
  sunrise: string[];
  sunset: string[];
}

/**
 * Complete Open-Meteo API response structure.
 *
 * Contains the requested location coordinates and daily weather data
 * for a 7-day forecast period.
 */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: OpenMeteoDaily;
}

/** Base URL for the Open-Meteo forecast API */
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Daily weather parameters to request from Open-Meteo.
 *
 * These parameters are requested for each day in the forecast:
 * - temperature_2m_max: Maximum daily temperature
 * - temperature_2m_min: Minimum daily temperature
 * - precipitation_probability_max: Maximum precipitation chance
 * - windspeed_10m_max: Maximum wind speed at 10m
 * - weathercode: WMO weather code
 * - sunrise: Sunrise time
 * - sunset: Sunset time
 */
const DAILY_PARAMS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'windspeed_10m_max',
  'weathercode',
  'sunrise',
  'sunset',
].join(',');

/**
 * Builds the Open-Meteo API URL with query parameters.
 *
 * Constructs a URL with all required parameters including:
 * - Location coordinates
 * - Requested daily parameters
 * - Temperature unit (Fahrenheit)
 * - Wind speed unit (mph)
 * - Automatic timezone detection
 *
 * @param lat - Latitude coordinate (-90 to 90)
 * @param lon - Longitude coordinate (-180 to 180)
 * @returns Fully constructed API URL with query string
 *
 * @internal
 */
function buildApiUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: DAILY_PARAMS,
    timezone: 'auto',
    temperature_unit: 'fahrenheit',
    windspeed_unit: 'mph',
    precipitation_unit: 'inch',
  });

  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}

/**
 * Creates an AbortController with an automatic timeout.
 *
 * Returns both the controller and the timeout ID so the caller can
 * clear the timeout if the request completes before it triggers.
 *
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns Object containing the AbortController and timeout ID
 *
 * @internal
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Fetches weather forecast from the Open-Meteo API.
 *
 * Retrieves a 7-day weather forecast for the specified coordinates.
 * The response includes daily high/low temperatures, precipitation
 * probability, wind speed, weather conditions, and sunrise/sunset times.
 *
 * @param lat - Latitude coordinate (-90 to 90)
 * @param lon - Longitude coordinate (-180 to 180)
 * @returns A Result containing the OpenMeteoResponse or an AppError
 *
 * @throws Never - all errors are returned in the Result type
 *
 * @example
 * ```typescript
 * const result = await fetchForecast(44.4280, -110.5885);
 * if (result.success) {
 *   const forecast = result.data;
 *   console.log(`Days of data: ${forecast.daily.time.length}`);
 * }
 * ```
 */
export async function fetchForecast(
  lat: number,
  lon: number
): Promise<Result<OpenMeteoResponse>> {
  // Validate coordinates
  if (lat < -90 || lat > 90) {
    return {
      success: false,
      error: new AppError(
        `Invalid latitude: ${lat}. Must be between -90 and 90.`,
        'INVALID_LATITUDE',
        ['Provide a valid latitude coordinate']
      ),
    };
  }

  if (lon < -180 || lon > 180) {
    return {
      success: false,
      error: new AppError(
        `Invalid longitude: ${lon}. Must be between -180 and 180.`,
        'INVALID_LONGITUDE',
        ['Provide a valid longitude coordinate']
      ),
    };
  }

  const url = buildApiUrl(lat, lon);
  const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    // Clear the timeout since we got a response
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: new AppError(
          `Open-Meteo API returned status ${response.status}: ${response.statusText}`,
          'WEATHER_API_ERROR',
          [
            'Check your network connection',
            'The Open-Meteo API may be experiencing issues',
            'Try again later',
          ]
        ),
      };
    }

    const data = (await response.json()) as OpenMeteoResponse;

    // Validate response structure
    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      return {
        success: false,
        error: new AppError(
          'Open-Meteo API returned invalid response structure',
          'WEATHER_API_INVALID_RESPONSE',
          ['Try again later', 'The API may be experiencing issues']
        ),
      };
    }

    return { success: true, data };
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: new AppError(
          'Open-Meteo API request timed out after 30 seconds',
          'WEATHER_API_TIMEOUT',
          [
            'Check your network connection',
            'The API may be slow to respond',
            'Try again later',
          ]
        ),
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: new AppError(
          `Network error: Unable to reach Open-Meteo API. ${error.message}`,
          'WEATHER_API_NETWORK_ERROR',
          [
            'Check your network connection',
            'Verify you have internet access',
            'Try again later',
          ]
        ),
      };
    }

    // Handle other errors
    return {
      success: false,
      error: new AppError(
        `Failed to fetch weather forecast: ${error instanceof Error ? error.message : String(error)}`,
        'WEATHER_API_UNKNOWN_ERROR',
        ['Try again later']
      ),
    };
  }
}
