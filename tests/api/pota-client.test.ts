// Tests for POTA API client

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAllParks,
  fetchParkByReference,
  fetchParksByEntity,
  checkApiHealth,
  NetworkError,
  type ParkApiData,
} from '../../src/api/pota-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Sample park data for testing
const samplePark: ParkApiData = {
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

const anotherPark: ParkApiData = {
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
};

describe('pota-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('fetchAllParks', () => {
    it('should fetch all parks successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [samplePark, anotherPark],
      });

      const result = await fetchAllParks();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual(samplePark);
        expect(result.data[1]).toEqual(anotherPark);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pota.app/parks',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: expect.objectContaining({ Accept: 'application/json' }),
        })
      );
    });

    it('should return an empty array when no parks exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await fetchAllParks();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchAllParks();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
        expect(result.error.message).toContain('500');
        expect((result.error as NetworkError).statusCode).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection failed'));

      const result = await fetchAllParks();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
        expect(result.error.message).toContain('Network error');
      }
    });

    it('should handle timeout errors', async () => {
      vi.useFakeTimers();

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const resultPromise = fetchAllParks();
      vi.runAllTimers();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
        expect(result.error.message).toContain('timed out');
      }

      vi.useRealTimers();
    });
  });

  describe('fetchParkByReference', () => {
    it('should fetch a single park by reference', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => samplePark,
      });

      const result = await fetchParkByReference('K-0039');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(samplePark);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pota.app/park/K-0039',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should normalize reference to uppercase', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => samplePark,
      });

      const result = await fetchParkByReference('k-0039');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pota.app/park/K-0039',
        expect.any(Object)
      );
    });

    it('should return null for 404 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await fetchParkByReference('K-9999');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should handle other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await fetchParkByReference('K-0039');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NetworkError);
        expect((result.error as NetworkError).statusCode).toBe(403);
      }
    });
  });

  describe('fetchParksByEntity', () => {
    it('should fetch parks by entity ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [samplePark, anotherPark],
      });

      const result = await fetchParksByEntity(291);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pota.app/parks/entity/291',
        expect.any(Object)
      );
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await fetchParksByEntity(999);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe('checkApiHealth', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await checkApiHealth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkApiHealth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkApiHealth();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(false);
      }
    });
  });
});
