// Tests for park service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchParks,
  getParkByReference,
  syncParks,
  getStaleWarning,
  getParkCount,
  hasParks,
} from '../../src/services/park-service.js';
import type { Park, ParkSearchResult, Result } from '../../src/types/index.js';

// Mock the park repository
vi.mock('../../src/data/repositories/park-repository.js', () => ({
  search: vi.fn(),
  findByReference: vi.fn(),
  upsert: vi.fn(),
  upsertMany: vi.fn(),
  count: vi.fn(),
  getLastSyncTime: vi.fn(),
}));

// Mock the POTA API client
vi.mock('../../src/api/pota-client.js', () => ({
  fetchAllParks: vi.fn(),
  fetchParkByReference: vi.fn(),
}));

// Mock the grid square utility
vi.mock('../../src/utils/grid-square.js', () => ({
  calculateGridSquare: vi.fn((lat: number, lon: number) => `MOCK${lat.toFixed(0)}${lon.toFixed(0)}`),
}));

import * as parkRepository from '../../src/data/repositories/park-repository.js';
import * as potaClient from '../../src/api/pota-client.js';

// Sample park data
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
  syncedAt: new Date(),
};

const anotherPark: Park = {
  id: 2,
  reference: 'K-1234',
  name: 'Test State Park',
  latitude: 40.0,
  longitude: -100.0,
  gridSquare: 'EM10aa',
  state: 'TX',
  country: 'United States',
  region: 'Texas',
  parkType: 'State Park',
  isActive: true,
  potaUrl: 'https://pota.app/#/park/K-1234',
  syncedAt: new Date(),
};

describe('park-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchParks', () => {
    it('should search parks and return results', async () => {
      const mockSearchResult: ParkSearchResult = {
        parks: [samplePark, anotherPark],
        total: 2,
      };

      vi.mocked(parkRepository.search).mockReturnValue({
        success: true,
        data: mockSearchResult,
      });
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date(), // Recent sync
      });

      const result = await searchParks('yellowstone', { limit: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parks).toHaveLength(2);
        expect(result.data.total).toBe(2);
        expect(result.data.staleWarning).toBeUndefined();
      }
      expect(parkRepository.search).toHaveBeenCalledWith('yellowstone', { limit: 10 });
    });

    it('should pass state filter to repository', async () => {
      const mockSearchResult: ParkSearchResult = {
        parks: [samplePark],
        total: 1,
      };

      vi.mocked(parkRepository.search).mockReturnValue({
        success: true,
        data: mockSearchResult,
      });
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date(),
      });

      const result = await searchParks('park', { state: 'WY', limit: 20 });

      expect(result.success).toBe(true);
      expect(parkRepository.search).toHaveBeenCalledWith('park', { state: 'WY', limit: 20 });
    });

    it('should include stale warning when data is old', async () => {
      const mockSearchResult: ParkSearchResult = {
        parks: [samplePark],
        total: 1,
      };

      vi.mocked(parkRepository.search).mockReturnValue({
        success: true,
        data: mockSearchResult,
      });
      // 40 days ago
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: oldDate,
      });

      const result = await searchParks('park');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staleWarning).toBeDefined();
        expect(result.data.staleWarning).toContain('40');
      }
    });

    it('should propagate repository errors', async () => {
      vi.mocked(parkRepository.search).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const result = await searchParks('park');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Database error');
      }
    });
  });

  describe('getParkByReference', () => {
    it('should return park from local database', async () => {
      vi.mocked(parkRepository.findByReference).mockReturnValue({
        success: true,
        data: samplePark,
      });

      const result = await getParkByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(samplePark);
      }
      // Should not call API if found locally
      expect(potaClient.fetchParkByReference).not.toHaveBeenCalled();
    });

    it('should fetch from API when not in local database', async () => {
      vi.mocked(parkRepository.findByReference).mockReturnValue({
        success: true,
        data: null,
      });

      const apiPark = {
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
        grid: 'DN44xk',
        state: 'WY',
        stateName: 'Wyoming',
        entityId: 291,
        entityName: 'United States',
        locationDesc: 'A vast national park',
        type: 'National Park',
        isActive: true,
      };

      vi.mocked(potaClient.fetchParkByReference).mockResolvedValue({
        success: true,
        data: apiPark,
      });

      vi.mocked(parkRepository.upsert).mockReturnValue({
        success: true,
        data: samplePark,
      });

      const result = await getParkByReference('K-0039');

      expect(result.success).toBe(true);
      expect(potaClient.fetchParkByReference).toHaveBeenCalledWith('K-0039');
      expect(parkRepository.upsert).toHaveBeenCalled();
    });

    it('should return null when park not found', async () => {
      vi.mocked(parkRepository.findByReference).mockReturnValue({
        success: true,
        data: null,
      });

      vi.mocked(potaClient.fetchParkByReference).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getParkByReference('K-9999');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should normalize reference to uppercase', async () => {
      vi.mocked(parkRepository.findByReference).mockReturnValue({
        success: true,
        data: samplePark,
      });

      await getParkByReference('k-0039');

      expect(parkRepository.findByReference).toHaveBeenCalledWith('K-0039');
    });
  });

  describe('syncParks', () => {
    it('should sync parks from API', async () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: null, // Never synced
      });

      const apiParks = [
        {
          reference: 'K-0039',
          name: 'Yellowstone National Park',
          latitude: 44.428,
          longitude: -110.5885,
          grid: 'DN44xk',
          state: 'WY',
          stateName: 'Wyoming',
          entityId: 291,
          entityName: 'United States',
          locationDesc: 'A vast national park',
          type: 'National Park',
          isActive: true,
        },
        {
          reference: 'K-1234',
          name: 'Test State Park',
          latitude: 40.0,
          longitude: -100.0,
          grid: 'EM10aa',
          state: 'TX',
          stateName: 'Texas',
          entityId: 291,
          entityName: 'United States',
          locationDesc: 'A test park',
          type: 'State Park',
          isActive: true,
        },
      ];

      vi.mocked(potaClient.fetchAllParks).mockResolvedValue({
        success: true,
        data: apiParks,
      });

      vi.mocked(parkRepository.upsertMany).mockReturnValue({
        success: true,
        data: { count: 2 },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 2,
      });

      const result = await syncParks();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(2);
      }
      expect(potaClient.fetchAllParks).toHaveBeenCalled();
      expect(parkRepository.upsertMany).toHaveBeenCalled();
    });

    it('should skip sync if recently synced and not forced', async () => {
      // 30 minutes ago
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: recentSync,
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const result = await syncParks();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staleWarning).toContain('recently');
      }
      // Should not fetch from API
      expect(potaClient.fetchAllParks).not.toHaveBeenCalled();
    });

    it('should force sync when force option is true', async () => {
      // 30 minutes ago
      const recentSync = new Date(Date.now() - 30 * 60 * 1000);
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: recentSync,
      });

      vi.mocked(potaClient.fetchAllParks).mockResolvedValue({
        success: true,
        data: [],
      });

      vi.mocked(parkRepository.upsertMany).mockReturnValue({
        success: true,
        data: { count: 0 },
      });

      const result = await syncParks({ force: true });

      expect(result.success).toBe(true);
      expect(potaClient.fetchAllParks).toHaveBeenCalled();
    });

    it('should filter by region when specified', async () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: null,
      });

      const apiParks = [
        {
          reference: 'K-0039',
          name: 'Yellowstone National Park',
          latitude: 44.428,
          longitude: -110.5885,
          grid: 'DN44xk',
          state: 'WY',
          stateName: 'Wyoming',
          entityId: 291,
          entityName: 'United States',
          locationDesc: '',
          type: 'National Park',
          isActive: true,
        },
        {
          reference: 'VE-0001',
          name: 'Canadian Park',
          latitude: 50.0,
          longitude: -100.0,
          grid: 'EM10aa',
          state: 'ON',
          stateName: 'Ontario',
          entityId: 1,
          entityName: 'Canada',
          locationDesc: '',
          type: 'Provincial Park',
          isActive: true,
        },
      ];

      vi.mocked(potaClient.fetchAllParks).mockResolvedValue({
        success: true,
        data: apiParks,
      });

      vi.mocked(parkRepository.upsertMany).mockReturnValue({
        success: true,
        data: { count: 1 },
      });

      const result = await syncParks({ region: 'canada' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.count).toBe(1);
      }
      // Should only upsert Canadian park
      expect(parkRepository.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reference: 'VE-0001' }),
        ])
      );
    });

    it('should handle API errors', async () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: null,
      });

      vi.mocked(potaClient.fetchAllParks).mockResolvedValue({
        success: false,
        error: new Error('Network error'),
      });

      const result = await syncParks();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARK_SYNC_ERROR');
      }
    });
  });

  describe('getStaleWarning', () => {
    it('should return null for recent sync', () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date(), // Just now
      });

      const warning = getStaleWarning();

      expect(warning).toBeNull();
    });

    it('should return warning for stale data', () => {
      // 40 days ago
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: oldDate,
      });

      const warning = getStaleWarning();

      expect(warning).not.toBeNull();
      expect(warning).toContain('40');
      expect(warning).toContain('days');
    });

    it('should return warning when never synced', () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: null,
      });

      const warning = getStaleWarning();

      expect(warning).not.toBeNull();
      expect(warning).toContain('No park data');
    });

    it('should return warning on error', () => {
      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const warning = getStaleWarning();

      expect(warning).not.toBeNull();
      expect(warning).toContain('Unable to determine');
    });
  });

  describe('getParkCount', () => {
    it('should return park count', () => {
      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 1500,
      });

      const result = getParkCount();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1500);
      }
    });
  });

  describe('hasParks', () => {
    it('should return true when parks exist', () => {
      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      expect(hasParks()).toBe(true);
    });

    it('should return false when no parks exist', () => {
      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 0,
      });

      expect(hasParks()).toBe(false);
    });

    it('should return false on error', () => {
      vi.mocked(parkRepository.count).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      expect(hasParks()).toBe(false);
    });
  });
});
