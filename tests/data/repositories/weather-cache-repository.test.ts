// Tests for weather cache repository

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DailyForecast } from '../../../src/types/index.js';

// Mock database module
const mockPrepare = vi.fn();
const mockDb = {
  prepare: mockPrepare,
};

vi.mock('../../../src/data/database.js', () => ({
  getDatabase: vi.fn(),
}));

import * as database from '../../../src/data/database.js';

// Sample forecast data
const sampleForecast: DailyForecast = {
  date: '2024-01-15',
  highTemp: 45,
  lowTemp: 28,
  precipitationChance: 20,
  windSpeed: 10,
  windDirection: 'NW',
  conditions: 'Partly cloudy',
  sunrise: '07:30',
  sunset: '17:15',
};

const sampleCacheRow: Record<string, unknown> = {
  id: 1,
  latitude: 44.428,
  longitude: -110.5885,
  forecastDate: '2024-01-15',
  data: JSON.stringify(sampleForecast),
  fetchedAt: '2024-01-14T10:00:00Z',
  expiresAt: '2024-01-14T11:00:00Z',
};

describe('weather-cache-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReset();
  });

  describe('get', () => {
    it('should return cached entry when found', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = get(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe(1);
        expect(result.data.latitude).toBe(44.428);
        expect(result.data.forecastDate).toBe('2024-01-15');
      }
    });

    it('should return null when not found', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = get(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should round lat/lon to 4 decimal places', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockGet = vi.fn().mockReturnValue(sampleCacheRow);
      mockPrepare.mockReturnValue({ get: mockGet });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      get(44.4285678, -110.5885123, '2024-01-15');

      expect(mockGet).toHaveBeenCalledWith(44.4286, -110.5885, '2024-01-15');
    });

    it('should return error when database fails', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = get(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(false);
    });

    it('should convert dates from strings', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = get(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.fetchedAt).toBeInstanceOf(Date);
        expect(result.data.expiresAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('set', () => {
    it('should store cache entry', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn();
      const mockGet = vi.fn().mockReturnValue(sampleCacheRow);
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: mockGet });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = set(44.428, -110.5885, '2024-01-15', sampleForecast);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forecastDate).toBe('2024-01-15');
      }
      expect(mockRun).toHaveBeenCalled();
    });

    it('should use default TTL of 1 hour', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      set(44.428, -110.5885, '2024-01-15', sampleForecast);

      // The SQL should include '+1 hours' for default TTL
      const runCall = mockRun.mock.calls[0];
      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('+1 hours');
    });

    it('should use custom TTL', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      set(44.428, -110.5885, '2024-01-15', sampleForecast, 6);

      // The SQL should include '+6 hours' for custom TTL
      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('+6 hours');
    });

    it('should round lat/lon for consistent storage', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      set(44.4285678, -110.5885123, '2024-01-15', sampleForecast);

      expect(mockRun).toHaveBeenCalledWith(
        44.4286,
        -110.5885,
        '2024-01-15',
        JSON.stringify(sampleForecast)
      );
    });

    it('should serialize forecast data to JSON', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      set(44.428, -110.5885, '2024-01-15', sampleForecast);

      const runCall = mockRun.mock.calls[0];
      const jsonData = runCall[3];
      expect(() => JSON.parse(jsonData)).not.toThrow();
      expect(JSON.parse(jsonData).date).toBe('2024-01-15');
    });

    it('should handle upsert with ON CONFLICT', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare
        .mockReturnValueOnce({ run: vi.fn() })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = set(44.428, -110.5885, '2024-01-15', sampleForecast);

      // The SQL should include ON CONFLICT clause
      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('ON CONFLICT');
      expect(sqlCall).toContain('DO UPDATE');
    });

    it('should return error on database failure', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          throw new Error('Insert failed');
        }),
      });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = set(44.428, -110.5885, '2024-01-15', sampleForecast);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WEATHER_CACHE_SET_ERROR');
      }
    });
  });

  describe('isExpired', () => {
    it('should return true when no cache entry exists', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { isExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = isExpired(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return true when cache is expired', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      // Set expiresAt to an hour ago (expired)
      const expiredRow = {
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
      };
      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(expiredRow) });

      const { isExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = isExpired(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false when cache is still valid', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      // Set expiresAt to an hour in the future (not expired)
      const validRow = {
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(validRow) });

      const { isExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = isExpired(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });

  describe('getRange', () => {
    it('should return cached entries in date range', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const rows = [
        { ...sampleCacheRow, forecastDate: '2024-01-15' },
        { ...sampleCacheRow, id: 2, forecastDate: '2024-01-16' },
        { ...sampleCacheRow, id: 3, forecastDate: '2024-01-17' },
      ];
      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue(rows) });

      const { getRange } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = getRange(44.428, -110.5885, '2024-01-15', '2024-01-17');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }
    });

    it('should return empty array when no entries found', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue([]) });

      const { getRange } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = getRange(44.428, -110.5885, '2024-01-15', '2024-01-17');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should order results by forecastDate', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { getRange } = await import('../../../src/data/repositories/weather-cache-repository.js');
      getRange(44.428, -110.5885, '2024-01-15', '2024-01-17');

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('ORDER BY forecastDate ASC');
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired entries and return count', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 5 }) });

      const { deleteExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = deleteExpired();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(5);
      }
    });

    it('should return 0 when no expired entries', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 0 }) });

      const { deleteExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = deleteExpired();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
    });

    it('should use datetime comparison for expiry', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      const mockRun = vi.fn().mockReturnValue({ changes: 0 });
      mockPrepare.mockReturnValue({ run: mockRun });

      const { deleteExpired } = await import('../../../src/data/repositories/weather-cache-repository.js');
      deleteExpired();

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain("expiresAt < datetime('now')");
    });
  });

  describe('WeatherCacheEntry interface', () => {
    it('should correctly type cache entry', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { get } = await import('../../../src/data/repositories/weather-cache-repository.js');
      const result = get(44.428, -110.5885, '2024-01-15');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        // Type check: all properties should be accessible
        const entry = result.data;
        expect(typeof entry.id).toBe('number');
        expect(typeof entry.latitude).toBe('number');
        expect(typeof entry.longitude).toBe('number');
        expect(typeof entry.forecastDate).toBe('string');
        expect(typeof entry.data).toBe('string');
        expect(entry.fetchedAt).toBeInstanceOf(Date);
        expect(entry.expiresAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('WeatherCacheInput interface', () => {
    it('should accept valid input', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends { success: true; data: infer T } ? T : never,
      });

      mockPrepare
        .mockReturnValueOnce({ run: vi.fn() })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleCacheRow) });

      const { set } = await import('../../../src/data/repositories/weather-cache-repository.js');

      // Should accept valid DailyForecast input
      const input: DailyForecast = {
        date: '2024-01-15',
        highTemp: 45,
        lowTemp: 28,
        precipitationChance: 20,
        windSpeed: 10,
        windDirection: 'NW',
        conditions: 'Partly cloudy',
      };

      const result = set(44.428, -110.5885, '2024-01-15', input);
      expect(result.success).toBe(true);
    });
  });
});
