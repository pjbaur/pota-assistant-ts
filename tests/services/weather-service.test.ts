// Tests for weather service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getForecast,
  getMultiDayForecast,
  normalizeWeatherData,
  getWeatherCodeDescription,
  cleanupCache,
} from '../../src/services/weather-service.js';
import type { OpenMeteoResponse } from '../../src/api/weather-client.js';
import type { DailyForecast } from '../../src/types/index.js';

// Mock the weather client
vi.mock('../../src/api/weather-client.js', () => ({
  fetchForecast: vi.fn(),
}));

// Mock the weather cache repository
vi.mock('../../src/data/repositories/weather-cache-repository.js', () => ({
  get: vi.fn(),
  set: vi.fn(),
  isExpired: vi.fn(),
  getRange: vi.fn(),
  deleteExpired: vi.fn(),
}));

import { fetchForecast } from '../../src/api/weather-client.js';
import * as weatherCache from '../../src/data/repositories/weather-cache-repository.js';

// Sample Open-Meteo response for testing
const sampleOpenMeteoResponse: OpenMeteoResponse = {
  latitude: 44.43,
  longitude: -110.59,
  daily: {
    time: ['2024-06-15', '2024-06-16', '2024-06-17'],
    temperature_2m_max: [72.5, 75.0, 70.0],
    temperature_2m_min: [45.2, 48.1, 44.0],
    precipitation_probability_max: [20, 30, 10],
    windspeed_10m_max: [8.5, 10.2, 7.0],
    weathercode: [1, 3, 0],
    sunrise: ['2024-06-15T05:32', '2024-06-16T05:32', '2024-06-17T05:33'],
    sunset: ['2024-06-15T21:04', '2024-06-16T21:03', '2024-06-17T21:02'],
  },
};

const mockFetchForecast = vi.mocked(fetchForecast);
const mockCacheGet = vi.mocked(weatherCache.get);
const mockCacheSet = vi.mocked(weatherCache.set);
const mockCacheIsExpired = vi.mocked(weatherCache.isExpired);
const mockCacheGetRange = vi.mocked(weatherCache.getRange);
const mockCacheDeleteExpired = vi.mocked(weatherCache.deleteExpired);

describe('weather-service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getWeatherCodeDescription', () => {
    it('should return correct description for clear sky (0)', () => {
      expect(getWeatherCodeDescription(0)).toBe('Clear sky');
    });

    it('should return correct descriptions for mainly clear to overcast (1-3)', () => {
      expect(getWeatherCodeDescription(1)).toBe('Mainly clear');
      expect(getWeatherCodeDescription(2)).toBe('Partly cloudy');
      expect(getWeatherCodeDescription(3)).toBe('Overcast');
    });

    it('should return correct descriptions for fog (45, 48)', () => {
      expect(getWeatherCodeDescription(45)).toBe('Fog');
      expect(getWeatherCodeDescription(48)).toBe('Depositing rime fog');
    });

    it('should return correct descriptions for drizzle (51-57)', () => {
      expect(getWeatherCodeDescription(51)).toBe('Light drizzle');
      expect(getWeatherCodeDescription(53)).toBe('Moderate drizzle');
      expect(getWeatherCodeDescription(55)).toBe('Dense drizzle');
    });

    it('should return correct descriptions for rain (61-67)', () => {
      expect(getWeatherCodeDescription(61)).toBe('Slight rain');
      expect(getWeatherCodeDescription(63)).toBe('Moderate rain');
      expect(getWeatherCodeDescription(65)).toBe('Heavy rain');
    });

    it('should return correct descriptions for snow (71-77)', () => {
      expect(getWeatherCodeDescription(71)).toBe('Slight snow');
      expect(getWeatherCodeDescription(73)).toBe('Moderate snow');
      expect(getWeatherCodeDescription(75)).toBe('Heavy snow');
      expect(getWeatherCodeDescription(77)).toBe('Snow grains');
    });

    it('should return correct descriptions for rain showers (80-82)', () => {
      expect(getWeatherCodeDescription(80)).toBe('Slight rain showers');
      expect(getWeatherCodeDescription(81)).toBe('Moderate rain showers');
      expect(getWeatherCodeDescription(82)).toBe('Violent rain showers');
    });

    it('should return correct descriptions for thunderstorms (95-99)', () => {
      expect(getWeatherCodeDescription(95)).toBe('Thunderstorm');
      expect(getWeatherCodeDescription(96)).toBe('Thunderstorm with hail');
      expect(getWeatherCodeDescription(99)).toBe('Thunderstorm with heavy hail');
    });

    it('should return unknown message for unrecognized codes', () => {
      expect(getWeatherCodeDescription(100)).toBe('Unknown weather code: 100');
      expect(getWeatherCodeDescription(-1)).toBe('Unknown weather code: -1');
    });
  });

  describe('normalizeWeatherData', () => {
    it('should normalize raw Open-Meteo response correctly', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.location).toEqual({ lat: 44.43, lon: -110.59 });
      expect(result.fetchedAt).toBeDefined();
      expect(result.forecasts).toHaveLength(3);
    });

    it('should map weather codes to descriptions', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.forecasts[0].conditions).toBe('Mainly clear'); // code 1
      expect(result.forecasts[1].conditions).toBe('Overcast'); // code 3
      expect(result.forecasts[2].conditions).toBe('Clear sky'); // code 0
    });

    it('should map temperature values correctly', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.forecasts[0].highTemp).toBe(72.5);
      expect(result.forecasts[0].lowTemp).toBe(45.2);
      expect(result.forecasts[1].highTemp).toBe(75.0);
      expect(result.forecasts[1].lowTemp).toBe(48.1);
    });

    it('should map precipitation probability correctly', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.forecasts[0].precipitationChance).toBe(20);
      expect(result.forecasts[1].precipitationChance).toBe(30);
      expect(result.forecasts[2].precipitationChance).toBe(10);
    });

    it('should map wind speed correctly', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.forecasts[0].windSpeed).toBe(8.5);
      expect(result.forecasts[1].windSpeed).toBe(10.2);
      expect(result.forecasts[2].windSpeed).toBe(7.0);
    });

    it('should include sunrise and sunset times', () => {
      const result = normalizeWeatherData(sampleOpenMeteoResponse);

      expect(result.forecasts[0].sunrise).toBe('2024-06-15T05:32');
      expect(result.forecasts[0].sunset).toBe('2024-06-15T21:04');
    });

    it('should handle missing data with defaults', () => {
      const incompleteResponse: OpenMeteoResponse = {
        latitude: 44.43,
        longitude: -110.59,
        daily: {
          time: ['2024-06-15'],
          temperature_2m_max: [undefined as unknown as number],
          temperature_2m_min: [undefined as unknown as number],
          precipitation_probability_max: [undefined as unknown as number],
          windspeed_10m_max: [undefined as unknown as number],
          weathercode: [undefined as unknown as number],
          sunrise: [undefined as unknown as string],
          sunset: [undefined as unknown as string],
        },
      };

      const result = normalizeWeatherData(incompleteResponse);

      expect(result.forecasts[0].highTemp).toBe(0);
      expect(result.forecasts[0].lowTemp).toBe(0);
      expect(result.forecasts[0].precipitationChance).toBe(0);
      expect(result.forecasts[0].windSpeed).toBe(0);
      expect(result.forecasts[0].conditions).toBe('Clear sky'); // code 0
    });
  });

  describe('getForecast', () => {
    it('should return error for invalid date format', async () => {
      const result = await getForecast(44.43, -110.59, '06-15-2024');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_DATE_FORMAT');
        expect(result.error.message).toContain('Invalid date format');
      }
    });

    it('should return error for another invalid date format', async () => {
      const result = await getForecast(44.43, -110.59, '2024/06/15');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_DATE_FORMAT');
      }
    });

    it('should return cached data when available and not expired', async () => {
      const cachedData: DailyForecast = {
        date: '2024-06-15',
        highTemp: 72.5,
        lowTemp: 45.2,
        precipitationChance: 20,
        windSpeed: 8.5,
        windDirection: 'N/A',
        conditions: 'Mainly clear',
        sunrise: '2024-06-15T05:32',
        sunset: '2024-06-15T21:04',
      };

      mockCacheGet.mockReturnValue({
        success: true,
        data: {
          id: 1,
          latitude: 44.43,
          longitude: -110.59,
          forecastDate: '2024-06-15',
          data: JSON.stringify(cachedData),
          fetchedAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      mockCacheIsExpired.mockReturnValue({ success: true, data: false });

      const result = await getForecast(44.43, -110.59, '2024-06-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forecasts).toHaveLength(1);
        expect(result.data.forecasts[0].date).toBe('2024-06-15');
        expect(result.data.staleWarning).toBeUndefined();
      }

      // Should not have called the API
      expect(mockFetchForecast).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache is expired', async () => {
      mockCacheGet.mockReturnValue({
        success: true,
        data: {
          id: 1,
          latitude: 44.43,
          longitude: -110.59,
          forecastDate: '2024-06-15',
          data: JSON.stringify({
            date: '2024-06-15',
            highTemp: 70,
            lowTemp: 40,
            precipitationChance: 15,
            windSpeed: 5,
            windDirection: 'N/A',
            conditions: 'Clear sky',
          }),
          fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      mockCacheIsExpired.mockReturnValue({ success: true, data: true });

      mockFetchForecast.mockResolvedValue({
        success: true,
        data: sampleOpenMeteoResponse,
      });

      mockCacheSet.mockReturnValue({
        success: true,
        data: {} as weatherCache.WeatherCacheEntry,
      });

      const result = await getForecast(44.43, -110.59, '2024-06-15');

      expect(result.success).toBe(true);
      expect(mockFetchForecast).toHaveBeenCalledWith(44.43, -110.59);
    });

    it('should fetch from API when cache miss', async () => {
      mockCacheGet.mockReturnValue({ success: true, data: null });
      mockCacheIsExpired.mockReturnValue({ success: true, data: true });

      mockFetchForecast.mockResolvedValue({
        success: true,
        data: sampleOpenMeteoResponse,
      });

      mockCacheSet.mockReturnValue({
        success: true,
        data: {} as weatherCache.WeatherCacheEntry,
      });

      const result = await getForecast(44.43, -110.59, '2024-06-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forecasts).toHaveLength(1);
        expect(result.data.forecasts[0].date).toBe('2024-06-15');
      }

      expect(mockFetchForecast).toHaveBeenCalledWith(44.43, -110.59);
      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('should return stale cached data with warning when API fails', async () => {
      const staleData: DailyForecast = {
        date: '2024-06-15',
        highTemp: 70,
        lowTemp: 40,
        precipitationChance: 15,
        windSpeed: 5,
        windDirection: 'N/A',
        conditions: 'Clear sky',
      };

      mockCacheGet.mockReturnValue({
        success: true,
        data: {
          id: 1,
          latitude: 44.43,
          longitude: -110.59,
          forecastDate: '2024-06-15',
          data: JSON.stringify(staleData),
          fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      mockCacheIsExpired.mockReturnValue({ success: true, data: true });

      mockFetchForecast.mockResolvedValue({
        success: false,
        error: {
          message: 'Network error',
          code: 'WEATHER_API_NETWORK_ERROR',
        },
      });

      const result = await getForecast(44.43, -110.59, '2024-06-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staleWarning).toBeDefined();
        expect(result.data.staleWarning).toContain('Using cached data');
        expect(result.data.forecasts[0].highTemp).toBe(70);
      }
    });

    it('should return error when no cache and API fails', async () => {
      mockCacheGet.mockReturnValue({ success: true, data: null });
      mockCacheIsExpired.mockReturnValue({ success: true, data: true });

      mockFetchForecast.mockResolvedValue({
        success: false,
        error: {
          message: 'Network error',
          code: 'WEATHER_API_NETWORK_ERROR',
          suggestions: ['Check your connection'],
        },
      });

      const result = await getForecast(44.43, -110.59, '2024-06-15');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to get weather forecast');
      }
    });

    it('should handle date not in forecast range', async () => {
      mockCacheGet.mockReturnValue({ success: true, data: null });
      mockCacheIsExpired.mockReturnValue({ success: true, data: true });

      mockFetchForecast.mockResolvedValue({
        success: true,
        data: sampleOpenMeteoResponse,
      });

      // Request a date not in the response
      const result = await getForecast(44.43, -110.59, '2024-12-25');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staleWarning).toContain('not available');
        // Should return all available forecasts
        expect(result.data.forecasts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getMultiDayForecast', () => {
    it('should fetch and cache multi-day forecast', async () => {
      mockFetchForecast.mockResolvedValue({
        success: true,
        data: sampleOpenMeteoResponse,
      });

      mockCacheSet.mockReturnValue({
        success: true,
        data: {} as weatherCache.WeatherCacheEntry,
      });

      const result = await getMultiDayForecast(44.43, -110.59);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forecasts).toHaveLength(3);
        expect(result.data.staleWarning).toBeUndefined();
      }

      // Should cache each day
      expect(mockCacheSet).toHaveBeenCalledTimes(3);
    });

    it('should fall back to cached data when API fails', async () => {
      mockFetchForecast.mockResolvedValue({
        success: false,
        error: {
          message: 'API error',
          code: 'WEATHER_API_ERROR',
        },
      });

      const cachedData: DailyForecast = {
        date: '2024-06-15',
        highTemp: 70,
        lowTemp: 40,
        precipitationChance: 15,
        windSpeed: 5,
        windDirection: 'N/A',
        conditions: 'Clear sky',
      };

      mockCacheGetRange.mockReturnValue({
        success: true,
        data: [
          {
            id: 1,
            latitude: 44.43,
            longitude: -110.59,
            forecastDate: '2024-06-15',
            data: JSON.stringify(cachedData),
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        ],
      });

      const result = await getMultiDayForecast(44.43, -110.59);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staleWarning).toContain('Using cached data');
        expect(result.data.forecasts).toHaveLength(1);
      }
    });

    it('should return error when no cache and API fails', async () => {
      mockFetchForecast.mockResolvedValue({
        success: false,
        error: {
          message: 'API error',
          code: 'WEATHER_API_ERROR',
        },
      });

      mockCacheGetRange.mockReturnValue({ success: true, data: [] });

      const result = await getMultiDayForecast(44.43, -110.59);

      expect(result.success).toBe(false);
    });
  });

  describe('cleanupCache', () => {
    it('should delete expired cache entries', () => {
      mockCacheDeleteExpired.mockReturnValue({
        success: true,
        data: { count: 5 },
      });

      const result = cleanupCache();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
      }
      expect(mockCacheDeleteExpired).toHaveBeenCalled();
    });

    it('should propagate errors from cache cleanup', () => {
      mockCacheDeleteExpired.mockReturnValue({
        success: false,
        error: {
          message: 'Database error',
          code: 'DB_ERROR',
        },
      });

      const result = cleanupCache();

      expect(result.success).toBe(false);
    });
  });
});
