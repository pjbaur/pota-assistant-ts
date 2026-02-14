// Tests for initial schema migration

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';

// Mock database
const mockDb = {
  exec: vi.fn(),
};

describe('001-initial-schema migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('migration object', () => {
    it('should have correct id', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      expect(migration.id).toBe('001');
    });

    it('should have correct name', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      expect(migration.name).toBe('initial-schema');
    });

    it('should have up function', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      expect(typeof migration.up).toBe('function');
    });
  });

  describe('migration.up', () => {
    it('should create parks table', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall).toBeDefined();
    });

    it('should create plans table', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const plansCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS plans')
      );

      expect(plansCall).toBeDefined();
    });

    it('should create weather_cache table', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const weatherCacheCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS weather_cache')
      );

      expect(weatherCacheCall).toBeDefined();
    });

    it('should create user_config table', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const userConfigCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS user_config')
      );

      expect(userConfigCall).toBeDefined();
    });

    it('should create parks reference index', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('idx_parks_reference')
      );

      expect(indexCall).toBeDefined();
    });

    it('should create parks state index', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('idx_parks_state')
      );

      expect(indexCall).toBeDefined();
    });

    it('should create plans plannedDate index', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('idx_plans_plannedDate')
      );

      expect(indexCall).toBeDefined();
    });

    it('should create plans parkId index', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('idx_plans_parkId')
      );

      expect(indexCall).toBeDefined();
    });

    it('should create weather cache lookup index', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('idx_weather_cache_lookup')
      );

      expect(indexCall).toBeDefined();
    });

    it('should use IF NOT EXISTS for idempotency', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const tableCalls = mockDb.exec.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
      );

      for (const call of tableCalls) {
        expect(call[0]).toContain('IF NOT EXISTS');
      }
    });

    it('should use IF NOT EXISTS for indexes', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const indexCalls = mockDb.exec.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE INDEX')
      );

      for (const call of indexCalls) {
        expect(call[0]).toContain('IF NOT EXISTS');
      }
    });
  });

  describe('parks table schema', () => {
    it('should include reference column as unique', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall![0]).toContain('reference TEXT NOT NULL UNIQUE');
    });

    it('should include latitude and longitude columns', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall![0]).toContain('latitude REAL NOT NULL');
      expect(parksCall![0]).toContain('longitude REAL NOT NULL');
    });

    it('should include gridSquare column', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall![0]).toContain('gridSquare TEXT');
    });

    it('should include isActive column with default', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall![0]).toContain('isActive INTEGER NOT NULL DEFAULT 1');
    });

    it('should include syncedAt column with default', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const parksCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS parks')
      );

      expect(parksCall![0]).toContain("syncedAt TEXT NOT NULL DEFAULT (datetime('now'))");
    });
  });

  describe('plans table schema', () => {
    it('should include foreign key to parks', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const plansCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS plans')
      );

      expect(plansCall![0]).toContain('FOREIGN KEY (parkId) REFERENCES parks(id)');
      expect(plansCall![0]).toContain('ON DELETE CASCADE');
    });

    it('should include status column with CHECK constraint', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const plansCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS plans')
      );

      expect(plansCall![0]).toContain("status TEXT NOT NULL DEFAULT 'draft'");
      expect(plansCall![0]).toContain("CHECK (status IN ('draft', 'finalized', 'completed', 'cancelled'))");
    });

    it('should include timestamp columns with defaults', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const plansCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS plans')
      );

      expect(plansCall![0]).toContain("createdAt TEXT NOT NULL DEFAULT (datetime('now'))");
      expect(plansCall![0]).toContain("updatedAt TEXT NOT NULL DEFAULT (datetime('now'))");
    });
  });

  describe('weather_cache table schema', () => {
    it('should have unique constraint on location and date', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const weatherCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS weather_cache')
      );

      expect(weatherCall![0]).toContain('UNIQUE (latitude, longitude, forecastDate)');
    });

    it('should include expiresAt column', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const weatherCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS weather_cache')
      );

      expect(weatherCall![0]).toContain('expiresAt TEXT NOT NULL');
    });
  });

  describe('user_config table schema', () => {
    it('should enforce single row with CHECK constraint', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const userConfigCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS user_config')
      );

      expect(userConfigCall![0]).toContain('CHECK (id = 1)');
    });

    it('should include units column with CHECK constraint', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const userConfigCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS user_config')
      );

      expect(userConfigCall![0]).toContain("CHECK (units IN ('imperial', 'metric'))");
    });

    it('should include timezone column with default', async () => {
      const { migration } = await import('../../../src/data/migrations/001-initial-schema.js');

      migration.up(mockDb as unknown as Database.Database);

      const userConfigCall = mockDb.exec.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('CREATE TABLE IF NOT EXISTS user_config')
      );

      expect(userConfigCall![0]).toContain("timezone TEXT NOT NULL DEFAULT 'UTC'");
    });
  });
});
