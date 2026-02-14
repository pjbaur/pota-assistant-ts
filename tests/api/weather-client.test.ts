// Tests for Open-Meteo weather API client

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchForecast, type OpenMeteoResponse } from '../../src/api/weather-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Sample Open-Meteo response for testing
const sampleResponse: OpenMeteoResponse = {
  latitude: 44.43,
  longitude: -110.59,
  daily: {
    time: ['2024-06-15', '2024-06-16'],
    temperature_2m_max: [72.5, 75.0],
    temperature_2m_min: [45.2, 48.1],
    precipitation_probability_max: [20, 30],
    windspeed_10m_max: [8.5, 10.2],
    weathercode: [1, 3],
    sunrise: ['2024-06-15T05:32', '2024-06-16T05:32'],
    sunset: ['2024-06-15T21:04', '2024-06-16T21:03'],
  },
};

describe('weather-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('fetchForecast', () => {
    it('should fetch weather forecast successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      });

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(44.43);
        expect(result.data.longitude).toBe(-110.59);
        expect(result.data.daily.time).toHaveLength(2);
        expect(result.data.daily.temperature_2m_max).toEqual([72.5, 75.0]);
      }

      // Verify the request URL includes required parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com/v1/forecast'),
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
          headers: expect.objectContaining({ Accept: 'application/json' }),
        })
      );

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('latitude=44.43');
      expect(calledUrl).toContain('longitude=-110.59');
      expect(calledUrl).toContain('temperature_unit=fahrenheit');
      expect(calledUrl).toContain('windspeed_unit=mph');
    });

    it('should include all required daily parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      });

      await fetchForecast(44.43, -110.59);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('temperature_2m_max');
      expect(calledUrl).toContain('temperature_2m_min');
      expect(calledUrl).toContain('precipitation_probability_max');
      expect(calledUrl).toContain('windspeed_10m_max');
      expect(calledUrl).toContain('weathercode');
      expect(calledUrl).toContain('sunrise');
      expect(calledUrl).toContain('sunset');
    });

    it('should use auto timezone', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      });

      await fetchForecast(44.43, -110.59);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('timezone=auto');
    });

    it('should return error for invalid latitude (> 90)', async () => {
      const result = await fetchForecast(91, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LATITUDE');
        expect(result.error.message).toContain('Invalid latitude');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error for invalid latitude (< -90)', async () => {
      const result = await fetchForecast(-91, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LATITUDE');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error for invalid longitude (> 180)', async () => {
      const result = await fetchForecast(44.43, 181);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LONGITUDE');
        expect(result.error.message).toContain('Invalid longitude');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error for invalid longitude (< -180)', async () => {
      const result = await fetchForecast(44.43, -181);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LONGITUDE');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_ERROR');
        expect(result.error.message).toContain('500');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_ERROR');
        expect(result.error.message).toContain('404');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(
        new TypeError('fetch failed: Network connection lost')
      );

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_NETWORK_ERROR');
        expect(result.error.message).toContain('Network error');
      }
    });

    it('should handle timeout errors', async () => {
      vi.useFakeTimers();

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const resultPromise = fetchForecast(44.43, -110.59);
      vi.runAllTimers();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_TIMEOUT');
        expect(result.error.message).toContain('timed out');
      }

      vi.useRealTimers();
    });

    it('should handle invalid response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 44.43,
          longitude: -110.59,
          // Missing daily data
        }),
      });

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_INVALID_RESPONSE');
        expect(result.error.message).toContain('invalid response structure');
      }
    });

    it('should handle empty daily time array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          latitude: 44.43,
          longitude: -110.59,
          daily: {
            time: [],
            temperature_2m_max: [],
            temperature_2m_min: [],
            precipitation_probability_max: [],
            windspeed_10m_max: [],
            weathercode: [],
            sunrise: [],
            sunset: [],
          },
        }),
      });

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_INVALID_RESPONSE');
      }
    });

    it('should handle generic errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Something went wrong'));

      const result = await fetchForecast(44.43, -110.59);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_API_UNKNOWN_ERROR');
        expect(result.error.message).toContain('Something went wrong');
      }
    });

    it('should handle edge case coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      });

      // Test with coordinates at boundaries
      const result = await fetchForecast(90, -180);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=90'),
        expect.any(Object)
      );
    });

    it('should handle negative coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sampleResponse,
      });

      const result = await fetchForecast(-33.86, 151.21); // Sydney, Australia

      expect(result.success).toBe(true);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('latitude=-33.86');
      expect(calledUrl).toContain('longitude=151.21');
    });
  });
});
