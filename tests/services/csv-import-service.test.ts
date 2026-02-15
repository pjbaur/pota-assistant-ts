// Tests for CSV import service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractStateFromLocation,
  validateCsvRow,
  transformCsvRowToRepository,
  importParksFromCsv,
  type PotaCsvRow,
} from '../../src/services/csv-import-service.js';
import type { ParkUpsertInput } from '../../src/data/repositories/park-repository.js';

// Mock the park repository
vi.mock('../../src/data/repositories/park-repository.js', () => ({
  upsertMany: vi.fn(),
}));

// Mock fs and readline
vi.mock('fs', () => ({
  createReadStream: vi.fn(),
  existsSync: vi.fn(() => true),
}));

vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn(),
  },
}));

import * as parkRepository from '../../src/data/repositories/park-repository.js';
import { createReadStream } from 'fs';
import readline from 'readline';
import { EventEmitter } from 'events';

describe('csv-import-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractStateFromLocation', () => {
    it('should extract single US state', () => {
      expect(extractStateFromLocation('US-CA')).toBe('CA');
    });

    it('should extract first state from multi-state location', () => {
      expect(extractStateFromLocation('US-CA,US-NV')).toBe('CA');
    });

    it('should return null for non-US locations', () => {
      expect(extractStateFromLocation('CA-ON')).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(extractStateFromLocation('')).toBe(null);
    });

    it('should handle mixed US and non-US', () => {
      expect(extractStateFromLocation('CA-ON,US-NY')).toBe('NY');
    });

    it('should handle Delaware park (US-DE)', () => {
      expect(extractStateFromLocation('US-DE')).toBe('DE');
    });

    it('should handle complex multi-state parks', () => {
      expect(extractStateFromLocation('US-CA,US-OR,US-NV')).toBe('CA');
    });
  });

  describe('validateCsvRow', () => {
    it('should validate a valid row', () => {
      const row: PotaCsvRow = {
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        active: '1',
        latitude: '44.428',
        longitude: '-110.5885',
        grid: 'DN44xk',
        entityId: '390',
        locationDesc: 'US-WY',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail on missing reference', () => {
      const row: PotaCsvRow = {
        reference: '',
        name: 'Test Park',
        active: '1',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(false);
      expect(result.warnings[0]?.message).toContain('reference');
    });

    it('should fail on missing name', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: '',
        active: '1',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(false);
      expect(result.warnings[0]?.message).toContain('name');
    });

    it('should fail on invalid latitude (non-numeric)', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: 'invalid',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(false);
      expect(result.warnings[0]?.message).toContain('Invalid coordinates');
    });

    it('should fail on latitude out of range', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '91.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(false);
      expect(result.warnings[0]?.message).toContain('Invalid latitude');
    });

    it('should fail on longitude out of range', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '40.0',
        longitude: '181.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(false);
      expect(result.warnings[0]?.message).toContain('Invalid longitude');
    });

    it('should warn on (0,0) coordinates', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '0',
        longitude: '0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = validateCsvRow(row, 2);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.message).toContain('(0,0)');
    });
  });

  describe('transformCsvRowToRepository', () => {
    it('should transform a valid row to repository input', () => {
      const row: PotaCsvRow = {
        reference: 'k-0039',
        name: 'Yellowstone National Park',
        active: '1',
        latitude: '44.428',
        longitude: '-110.5885',
        grid: 'DN44xk',
        entityId: '390',
        locationDesc: 'US-WY',
      };

      const result = transformCsvRowToRepository(row, 2);

      expect(result.reference).toBe('K-0039'); // Uppercased
      expect(result.name).toBe('Yellowstone National Park');
      expect(result.latitude).toBe(44.428);
      expect(result.longitude).toBe(-110.5885);
      expect(result.gridSquare).toBe('DN44xk');
      expect(result.state).toBe('WY');
      expect(result.isActive).toBe(true);
      expect(result.potaUrl).toBe('https://pota.app/#/park/K-0039');
    });

    it('should calculate grid square if not provided', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = transformCsvRowToRepository(row, 2);
      expect(result.gridSquare).not.toBe('');
      expect(result.gridSquare).toMatch(/^[A-Z]{2}\d{2}[a-z]{2}$/);
    });

    it('should handle inactive parks', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Inactive Park',
        active: '0',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = transformCsvRowToRepository(row, 2);
      expect(result.isActive).toBe(false);
    });

    it('should include metadata with source info', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '390',
        locationDesc: 'US-TX',
      };

      const result = transformCsvRowToRepository(row, 5);
      const metadata = JSON.parse(result.metadata ?? '{}');

      expect(metadata.entityId).toBe('390');
      expect(metadata.locationDesc).toBe('US-TX');
      expect(metadata.source).toBe('csv-import');
      expect(metadata.importLineNumber).toBe(5);
    });

    it('should set unavailable fields to null', () => {
      const row: PotaCsvRow = {
        reference: 'K-0001',
        name: 'Test Park',
        active: '1',
        latitude: '40.0',
        longitude: '-100.0',
        grid: '',
        entityId: '',
        locationDesc: '',
      };

      const result = transformCsvRowToRepository(row, 2);

      expect(result.country).toBe(null);
      expect(result.region).toBe(null);
      expect(result.parkType).toBe(null);
    });
  });

  describe('importParksFromCsv', () => {
    it('should import parks from a valid CSV file', async () => {
      // Setup mock readline interface
      const mockRl = new EventEmitter();
      const lines = [
        'reference,name,active,latitude,longitude,grid,entityId,locationDesc',
        'K-0001,Test Park 1,1,40.0,-100.0,AB12cd,390,US-TX',
        'K-0002,Test Park 2,1,41.0,-101.0,AB23de,390,US-CA',
      ];

      // Simulate async iteration
      (mockRl as unknown as AsyncIterable<string>)[Symbol.asyncIterator] = function* () {
        for (const line of lines) {
          yield line;
        }
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockRl as ReturnType<typeof readline.createInterface>);
      vi.mocked(createReadStream).mockReturnValue({} as ReturnType<typeof createReadStream>);
      vi.mocked(parkRepository.upsertMany).mockReturnValue({ success: true, data: { count: 2 } });

      const result = await importParksFromCsv({
        filePath: '/test/parks.csv',
        batchSize: 1000,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imported).toBe(2);
        expect(result.data.skipped).toBe(0);
      }
    });

    it('should skip invalid rows in non-strict mode', async () => {
      const mockRl = new EventEmitter();
      const lines = [
        'reference,name,active,latitude,longitude,grid,entityId,locationDesc',
        'K-0001,Test Park 1,1,40.0,-100.0,AB12cd,390,US-TX',
        ',Invalid Park,1,invalid,0,,,', // Missing reference and invalid coords
        'K-0002,Test Park 2,1,41.0,-101.0,AB23de,390,US-CA',
      ];

      (mockRl as unknown as AsyncIterable<string>)[Symbol.asyncIterator] = function* () {
        for (const line of lines) {
          yield line;
        }
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockRl as ReturnType<typeof readline.createInterface>);
      vi.mocked(createReadStream).mockReturnValue({} as ReturnType<typeof createStream>);
      vi.mocked(parkRepository.upsertMany).mockReturnValue({ success: true, data: { count: 2 } });

      const result = await importParksFromCsv({
        filePath: '/test/parks.csv',
        batchSize: 1000,
        strict: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imported).toBe(2);
        expect(result.data.skipped).toBe(1);
      }
    });

    it('should fail on invalid row in strict mode', async () => {
      const mockRl = new EventEmitter();
      const lines = [
        'reference,name,active,latitude,longitude,grid,entityId,locationDesc',
        'K-0001,Test Park 1,1,40.0,-100.0,AB12cd,390,US-TX',
        ',Invalid Park,1,invalid,0,,,', // Missing reference
      ];

      (mockRl as unknown as AsyncIterable<string>)[Symbol.asyncIterator] = function* () {
        for (const line of lines) {
          yield line;
        }
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockRl as ReturnType<typeof readline.createInterface>);
      vi.mocked(createReadStream).mockReturnValue({} as ReturnType<typeof createReadStream>);
      vi.mocked(parkRepository.upsertMany).mockReturnValue({ success: true, data: { count: 1 } });

      const result = await importParksFromCsv({
        filePath: '/test/parks.csv',
        batchSize: 1000,
        strict: true,
      });

      expect(result.success).toBe(false);
    });

    it('should call progress callback', async () => {
      const mockRl = new EventEmitter();
      const lines = [
        'reference,name,active,latitude,longitude,grid,entityId,locationDesc',
        'K-0001,Test Park 1,1,40.0,-100.0,AB12cd,390,US-TX',
      ];

      (mockRl as unknown as AsyncIterable<string>)[Symbol.asyncIterator] = function* () {
        for (const line of lines) {
          yield line;
        }
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockRl as ReturnType<typeof readline.createInterface>);
      vi.mocked(createReadStream).mockReturnValue({} as ReturnType<typeof createReadStream>);
      vi.mocked(parkRepository.upsertMany).mockReturnValue({ success: true, data: { count: 1 } });

      const onProgress = vi.fn();

      await importParksFromCsv({
        filePath: '/test/parks.csv',
        batchSize: 1, // Small batch to trigger progress
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockRl = new EventEmitter();
      const lines = [
        'reference,name,active,latitude,longitude,grid,entityId,locationDesc',
        'K-0001,Test Park 1,1,40.0,-100.0,AB12cd,390,US-TX',
      ];

      (mockRl as unknown as AsyncIterable<string>)[Symbol.asyncIterator] = function* () {
        for (const line of lines) {
          yield line;
        }
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockRl as ReturnType<typeof readline.createInterface>);
      vi.mocked(createReadStream).mockReturnValue({} as ReturnType<typeof createReadStream>);
      vi.mocked(parkRepository.upsertMany).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const result = await importParksFromCsv({
        filePath: '/test/parks.csv',
        batchSize: 1,
      });

      expect(result.success).toBe(false);
    });
  });
});
