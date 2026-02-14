// Open-Meteo API client for weather forecasts
// Free API - no authentication required

import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

// Open-Meteo API response types
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

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: OpenMeteoDaily;
}

// API configuration
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// Daily parameters to request from Open-Meteo
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
 * Build the Open-Meteo API URL with query parameters
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
 * Create an AbortController with timeout
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
 * Fetch weather forecast from Open-Meteo API
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Result containing OpenMeteoResponse or an error
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
