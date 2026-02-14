// Tests for config command

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerConfigCommand } from '../../src/commands/config-command.js';
import type { AppConfig } from '../../src/types/index.js';

// Mock the config module
vi.mock('../../src/config/index.js', () => ({
  loadConfig: vi.fn(() => ({
    user: {
      callsign: 'W1ABC',
      gridSquare: 'FN42',
      homeLatitude: null,
      homeLongitude: null,
      timezone: 'UTC',
      units: 'imperial',
    },
    display: {
      color: true,
      tableStyle: 'rounded',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    },
    sync: {
      autoSync: true,
      syncIntervalHours: 24,
      parkRegions: ['US'],
    },
    logging: {
      level: 'info',
      file: null,
      maxSizeMb: 10,
    },
    data: {
      databasePath: '/mock/db/pota.db',
      cacheDirectory: '/mock/cache',
      exportDirectory: '/mock/exports',
    },
  })),
  setConfigValue: vi.fn(),
  initConfig: vi.fn(),
  getConfigPath: vi.fn(() => '/mock/home/.pota/config.json'),
}));

// Mock UI prompts
vi.mock('../../src/ui/prompts.js', () => ({
  promptText: vi.fn()
    .mockResolvedValueOnce('W1ABC')  // callsign
    .mockResolvedValueOnce('FN42'),  // grid square
  promptSelect: vi.fn().mockResolvedValue('Imperial (miles, °F)'),
  promptConfirm: vi.fn().mockResolvedValue(false),  // Don't sync parks in tests
}));

// Mock validators
vi.mock('../../src/utils/validators.js', () => ({
  validateCallsign: vi.fn((callsign: string) => {
    if (!callsign) {
      return { success: false, error: { message: 'Callsign is required', code: 'INVALID_INPUT' } };
    }
    return { success: true, data: callsign.toUpperCase() };
  }),
  validateGridSquare: vi.fn((grid: string) => {
    if (!grid) {
      return { success: false, error: { message: 'Grid square is required', code: 'INVALID_INPUT' } };
    }
    return { success: true, data: grid.toUpperCase() };
  }),
}));

// Mock UI status functions
vi.mock('../../src/ui/status.js', () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

// Mock console.log
vi.spyOn(console, 'log').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

import * as config from '../../src/config/index.js';

describe('config-command', () => {
  let program: Command;
  let mockConfig: AppConfig;

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    mockConfig = {
      user: {
        callsign: 'W1ABC',
        gridSquare: 'FN42',
        homeLatitude: null,
        homeLongitude: null,
        timezone: 'UTC',
        units: 'imperial',
      },
      display: {
        color: true,
        tableStyle: 'rounded',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      },
      sync: {
        autoSync: true,
        syncIntervalHours: 24,
        parkRegions: ['US'],
      },
      logging: {
        level: 'info',
        file: null,
        maxSizeMb: 10,
      },
      data: {
        databasePath: '/mock/db/pota.db',
        cacheDirectory: '/mock/cache',
        exportDirectory: '/mock/exports',
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerConfigCommand', () => {
    it('should register config command with program', () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      expect(configCmd).toBeDefined();
    });

    it('should register init subcommand', () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const initCmd = configCmd?.commands.find(cmd => cmd.name() === 'init');
      expect(initCmd).toBeDefined();
    });

    it('should register show subcommand', () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const showCmd = configCmd?.commands.find(cmd => cmd.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should register set subcommand', () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const setCmd = configCmd?.commands.find(cmd => cmd.name() === 'set');
      expect(setCmd).toBeDefined();
    });

    it('should register path subcommand', () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const pathCmd = configCmd?.commands.find(cmd => cmd.name() === 'path');
      expect(pathCmd).toBeDefined();
    });
  });

  describe('config set', () => {
    it('should reject invalid config key', async () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const setCmd = configCmd?.commands.find(cmd => cmd.name() === 'set');

      await expect(
        setCmd?.parseAsync(['node', 'test', 'set', 'invalid.key', 'value'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle set errors', async () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      vi.mocked(config.setConfigValue).mockImplementation(() => {
        throw new Error('Failed to set config');
      });

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const setCmd = configCmd?.commands.find(cmd => cmd.name() === 'set');

      await expect(
        setCmd?.parseAsync(['node', 'test', 'set', 'user.callsign', 'W1ABC'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('config path', () => {
    it('should display config file path', async () => {
      registerConfigCommand(program, mockConfig, mockLogger);

      const configCmd = program.commands.find(cmd => cmd.name() === 'config');
      const pathCmd = configCmd?.commands.find(cmd => cmd.name() === 'path');

      await pathCmd?.parseAsync(['node', 'test', 'path'], { from: 'user' });

      expect(config.getConfigPath).toHaveBeenCalled();
    });
  });
});
