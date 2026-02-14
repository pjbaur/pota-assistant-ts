// Tests for park repository

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Park, Result } from '../../../src/types/index.js';

// Mock database module
const mockPrepare = vi.fn();
const mockDb = {
  prepare: mockPrepare,
};

vi.mock('../../../src/data/database.js', () => ({
  getDatabase: vi.fn(),
}));

import * as database from '../../../src/data/database.js';

// Sample park data
const sampleParkRow: Record<string, unknown> = {
  id: 1,
  reference: 'K-0039',
  name: 'Yellowstone National Park',
  latitude: 44.428,
  longitude: -110.5885,
  gridSquare: 'DN44xk',
  state: 'WY',
  country: 'United States',
  region: 'Wyoming',
  parkType: 'National Park',
  isActive: 1,
  potaUrl: 'https://pota.app/#/park/K-0039',
  syncedAt: '2024-01-15T10:00:00Z',
};

const samplePark: Park = {
  id: 1,
  reference: 'K-0039',
  name: 'Yellowstone National Park',
  latitude: 44.428,
  longitude: -110.5885,
  gridSquare: 'DN44xk',
  state: 'WY',
  country: 'United States',
  region: 'Wyoming',
  parkType: 'National Park',
  isActive: true,
  potaUrl: 'https://pota.app/#/park/K-0039',
  syncedAt: new Date('2024-01-15T10:00:00Z'),
};

describe('park-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReset();
  });

  describe('findAll', () => {
    it('should return parks with default pagination', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([sampleParkRow]),
      });

      const { findAll } = await import('../../../src/data/repositories/park-repository.js');
      const result = findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].reference).toBe('K-0039');
      }
    });

    it('should use custom limit and offset', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { findAll } = await import('../../../src/data/repositories/park-repository.js');
      findAll(100, 50);

      expect(mockAll).toHaveBeenCalledWith(100, 50);
    });

    it('should return error when database fails', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: false,
        error: new Error('Database connection failed'),
      });

      const { findAll } = await import('../../../src/data/repositories/park-repository.js');
      const result = findAll();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Database connection failed');
      }
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Query failed');
        }),
      });

      const { findAll } = await import('../../../src/data/repositories/park-repository.js');
      const result = findAll();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARK_FETCH_ERROR');
      }
    });
  });

  describe('findByReference', () => {
    it('should return park when found', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockGet = vi.fn().mockReturnValue(sampleParkRow);
      mockPrepare.mockReturnValue({ get: mockGet });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      const result = findByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.reference).toBe('K-0039');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should return null when not found', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      const result = findByReference('K-9999');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should normalize reference to uppercase', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockGet = vi.fn().mockReturnValue(sampleParkRow);
      mockPrepare.mockReturnValue({ get: mockGet });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      findByReference('k-0039');

      expect(mockGet).toHaveBeenCalledWith('K-0039');
    });
  });

  describe('search', () => {
    it('should search parks by query', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare
        .mockReturnValueOnce({ all: vi.fn().mockReturnValue([sampleParkRow]) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ count: 1 }) });

      const { search } = await import('../../../src/data/repositories/park-repository.js');
      const result = search('yellowstone');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parks).toHaveLength(1);
        expect(result.data.total).toBe(1);
      }
    });

    it('should filter by state', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare
        .mockReturnValueOnce({ all: mockAll })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ count: 0 }) });

      const { search } = await import('../../../src/data/repositories/park-repository.js');
      search('park', { state: 'wy' });

      // Should normalize state to uppercase and use park as query
      expect(mockAll).toHaveBeenCalledWith(
        '%park%',
        '%park%',
        'WY',
        50
      );
    });

    it('should use custom limit', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare
        .mockReturnValueOnce({ all: mockAll })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ count: 0 }) });

      const { search } = await import('../../../src/data/repositories/park-repository.js');
      search('park', { limit: 10 });

      // Last argument should be the limit
      const lastCall = mockAll.mock.calls[0];
      expect(lastCall[lastCall.length - 1]).toBe(10);
    });

    it('should use LIKE for pattern matching', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare
        .mockReturnValueOnce({ all: mockAll })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ count: 0 }) });

      const { search } = await import('../../../src/data/repositories/park-repository.js');
      search('yellow');

      // First argument should contain LIKE pattern
      expect(mockAll).toHaveBeenCalledWith(
        '%yellow%',
        '%yellow%',
        50
      );
    });
  });

  describe('upsert', () => {
    it('should insert new park', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockRun = vi.fn();
      const mockGet = vi.fn().mockReturnValue(sampleParkRow);
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: mockGet });

      const { upsert } = await import('../../../src/data/repositories/park-repository.js');
      const result = upsert({
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reference).toBe('K-0039');
      }
      expect(mockRun).toHaveBeenCalled();
    });

    it('should normalize reference to uppercase', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleParkRow) });

      const { upsert } = await import('../../../src/data/repositories/park-repository.js');
      upsert({
        reference: 'k-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
      });

      // First argument to run should be the reference in uppercase
      const runCall = mockRun.mock.calls[0];
      expect(runCall[0]).toBe('K-0039');
    });

    it('should handle optional fields', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleParkRow) });

      const { upsert } = await import('../../../src/data/repositories/park-repository.js');
      upsert({
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
        gridSquare: 'DN44xk',
        state: 'WY',
        country: 'United States',
        region: 'Wyoming',
        parkType: 'National Park',
        isActive: true,
        potaUrl: 'https://pota.app/#/park/K-0039',
      });

      const runCall = mockRun.mock.calls[0];
      expect(runCall).toContain('DN44xk');
      expect(runCall).toContain('WY');
    });

    it('should return error on database failure', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          throw new Error('Insert failed');
        }),
      });

      const { upsert } = await import('../../../src/data/repositories/park-repository.js');
      const result = upsert({
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARK_UPSERT_ERROR');
      }
    });
  });

  describe('upsertMany', () => {
    it('should insert multiple parks', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const mockRun = vi.fn();
      mockPrepare.mockReturnValue({ run: mockRun });
      mockDb.transaction = vi.fn((fn) => fn);

      const { upsertMany } = await import('../../../src/data/repositories/park-repository.js');
      const result = upsertMany([
        { reference: 'K-0039', name: 'Park 1', latitude: 44.0, longitude: -110.0 },
        { reference: 'K-0040', name: 'Park 2', latitude: 45.0, longitude: -111.0 },
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
    });

    it('should return 0 for empty array', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const { upsertMany } = await import('../../../src/data/repositories/park-repository.js');
      const result = upsertMany([]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(0);
      }
    });
  });

  describe('count', () => {
    it('should return park count', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue({ count: 1500 }) });

      const { count } = await import('../../../src/data/repositories/park-repository.js');
      const result = count();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1500);
      }
    });

    it('should return error on database failure', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const { count } = await import('../../../src/data/repositories/park-repository.js');
      const result = count();

      expect(result.success).toBe(false);
    });
  });

  describe('getLastSyncTime', () => {
    it('should return last sync time', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue({ lastSync: '2024-01-15T10:00:00Z' }) });

      const { getLastSyncTime } = await import('../../../src/data/repositories/park-repository.js');
      const result = getLastSyncTime();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data).toBeInstanceOf(Date);
      }
    });

    it('should return null when no parks synced', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue({ lastSync: null }) });

      const { getLastSyncTime } = await import('../../../src/data/repositories/park-repository.js');
      const result = getLastSyncTime();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('rowToPark conversion', () => {
    it('should convert isActive integer to boolean', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const inactiveParkRow = { ...sampleParkRow, isActive: 0 };
      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(inactiveParkRow) });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      const result = findByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.isActive).toBe(false);
      }
    });

    it('should handle null gridSquare', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      const parkWithNullGrid = { ...sampleParkRow, gridSquare: null };
      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(parkWithNullGrid) });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      const result = findByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.gridSquare).toBeNull();
      }
    });

    it('should convert syncedAt string to Date', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: true,
        data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
      });

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(sampleParkRow) });

      const { findByReference } = await import('../../../src/data/repositories/park-repository.js');
      const result = findByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.syncedAt).toBeInstanceOf(Date);
      }
    });
  });
});
