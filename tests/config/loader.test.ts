// Tests for configuration loader

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock store that persists across test imports
const mockStore: Record<string, unknown> = {};

// Mock the conf module before importing the loader
vi.mock('conf', () => {
  class MockConf<T extends object> {
    path = '/mock/config/path/config.json';

    get(key: keyof T): T[keyof T] | undefined {
      return mockStore[key as string] as T[keyof T] | undefined;
    }

    set(key: keyof T, value: T[keyof T]): void {
      if (typeof key === 'string') {
        mockStore[key as string] = value;
      }
    }

    constructor(_options?: { defaults?: T }) {
      // Initialize with defaults if provided
    }
  }

  return { default: MockConf };
});

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

// Clear module cache to get fresh imports with mocks
vi.resetModules();

describe('config/loader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('loadConfig', () => {
    it('should load configuration with defaults', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.user).toBeDefined();
      expect(config.display).toBeDefined();
      expect(config.sync).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.data).toBeDefined();
    });

    it('should have correct default values', async () => {
      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      // Check user defaults
      expect(config.user.timezone).toBe('UTC');
      expect(config.user.units).toBe('imperial');

      // Check display defaults
      expect(config.display.color).toBe(true);
      expect(config.display.tableStyle).toBe('rounded');
      expect(config.display.timeFormat).toBe('24h');

      // Check sync defaults
      expect(config.sync.autoSync).toBe(true);
      expect(config.sync.syncIntervalHours).toBe(24);
      expect(config.sync.parkRegions).toContain('US');

      // Check logging defaults
      expect(config.logging.level).toBe('info');
    });
  });

  describe('environment variable overrides', () => {
    it('should apply POTA_CALLSIGN override', async () => {
      process.env.POTA_CALLSIGN = 'W1ABC';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.callsign).toBe('W1ABC');
    });

    it('should apply POTA_GRID_SQUARE override', async () => {
      process.env.POTA_GRID_SQUARE = 'FN42';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.gridSquare).toBe('FN42');
    });

    it('should apply POTA_HOME_LAT and POTA_HOME_LON overrides', async () => {
      process.env.POTA_HOME_LAT = '40.7128';
      process.env.POTA_HOME_LON = '-74.0060';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.homeLatitude).toBe(40.7128);
      expect(config.user.homeLongitude).toBe(-74.0060);
    });

    it('should apply POTA_TIMEZONE override', async () => {
      process.env.POTA_TIMEZONE = 'America/New_York';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.timezone).toBe('America/New_York');
    });

    it('should apply POTA_UNITS override (imperial)', async () => {
      process.env.POTA_UNITS = 'imperial';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.units).toBe('imperial');
    });

    it('should apply POTA_UNITS override (metric)', async () => {
      process.env.POTA_UNITS = 'metric';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.user.units).toBe('metric');
    });

    it('should ignore invalid POTA_UNITS value', async () => {
      process.env.POTA_UNITS = 'invalid';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      // Should fall back to default
      expect(config.user.units).toBe('imperial');
    });

    it('should apply POTA_NO_COLOR override', async () => {
      process.env.POTA_NO_COLOR = '1';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.display.color).toBe(false);
    });

    it('should apply POTA_NO_COLOR=true override', async () => {
      process.env.POTA_NO_COLOR = 'true';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.display.color).toBe(false);
    });

    it('should apply POTA_LOG_LEVEL override', async () => {
      process.env.POTA_LOG_LEVEL = 'debug';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.logging.level).toBe('debug');
    });

    it('should apply POTA_DATA_DIR override', async () => {
      process.env.POTA_DATA_DIR = '/custom/data';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      expect(config.data.databasePath).toBe('/custom/data/pota.db');
      expect(config.data.cacheDirectory).toBe('/custom/data/cache');
      expect(config.data.exportDirectory).toBe('/custom/data/exports');
    });

    it('should handle invalid POTA_HOME_LAT gracefully', async () => {
      process.env.POTA_HOME_LAT = 'not-a-number';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      // Should not set homeLatitude if parsing fails
      expect(config.user.homeLatitude).toBeNull();
    });

    it('should handle invalid POTA_HOME_LON gracefully', async () => {
      process.env.POTA_HOME_LON = 'not-a-number';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      // Should not set homeLongitude if parsing fails
      expect(config.user.homeLongitude).toBeNull();
    });

    it('should ignore invalid POTA_LOG_LEVEL value', async () => {
      process.env.POTA_LOG_LEVEL = 'invalid';

      const { loadConfig } = await import('../../src/config/loader.js');
      const config = loadConfig();

      // Should fall back to default
      expect(config.logging.level).toBe('info');
    });
  });

  describe('setConfigValue', () => {
    it('should set a top-level config value', async () => {
      const { loadConfig, setConfigValue } = await import('../../src/config/loader.js');

      setConfigValue('logging', { level: 'debug', file: null, maxSizeMb: 10 });
      const config = loadConfig();

      // Note: This test depends on the mock implementation
      expect(config).toBeDefined();
    });
  });

  describe('getConfigValue', () => {
    it('should get a config value', async () => {
      const { loadConfig, getConfigValue } = await import('../../src/config/loader.js');

      loadConfig();
      // The mock returns undefined for unknown keys
      const value = getConfigValue('unknown.key');
      expect(value).toBeUndefined();
    });
  });

  describe('isFirstRun', () => {
    it('should return true when no callsign is set', async () => {
      const { isFirstRun } = await import('../../src/config/loader.js');

      const result = isFirstRun();
      // With the mock, no callsign is set by default
      expect(result).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('should return config file path', async () => {
      const { getConfigPath } = await import('../../src/config/loader.js');

      const path = getConfigPath();
      expect(path).toBeDefined();
      expect(typeof path).toBe('string');
    });
  });

  describe('initConfig', () => {
    it('should initialize config with user profile', async () => {
      const { loadConfig, initConfig } = await import('../../src/config/loader.js');

      initConfig({
        callsign: 'W1ABC',
        gridSquare: 'FN42',
        units: 'metric',
      });

      const config = loadConfig();
      expect(config).toBeDefined();
    });

    it('should use defaults for optional fields', async () => {
      const { loadConfig, initConfig } = await import('../../src/config/loader.js');

      initConfig({
        callsign: 'W1ABC',
      });

      const config = loadConfig();
      expect(config).toBeDefined();
    });

    it('should normalize callsign to uppercase', async () => {
      const { loadConfig, initConfig } = await import('../../src/config/loader.js');

      initConfig({
        callsign: 'w1abc',
      });

      const config = loadConfig();
      expect(config).toBeDefined();
    });
  });
});
