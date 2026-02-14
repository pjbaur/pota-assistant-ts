// Tests for park command

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerParkCommand } from '../../src/commands/park-command.js';
import type { AppConfig, Park, ParkSearchResult } from '../../src/types/index.js';

// Mock the park service
vi.mock('../../src/services/park-service.js', () => ({
  searchParks: vi.fn(),
  getParkByReference: vi.fn(),
  getStaleWarning: vi.fn(),
}));

// Mock validators
vi.mock('../../src/utils/validators.js', () => ({
  validateParkRef: vi.fn((ref: string) => {
    if (!ref || ref.trim() === '') {
      return { success: false, error: { message: 'Park reference is required', code: 'INVALID_INPUT' } };
    }
    const normalized = ref.toUpperCase().trim();
    if (!/^[A-Z]{1,3}-\d{4,5}$/.test(normalized)) {
      return { success: false, error: { message: `Invalid park reference format: ${ref}`, code: 'INVALID_PARK_REF' } };
    }
    return { success: true, data: normalized };
  }),
  validateStateCode: vi.fn((state: string) => {
    const normalized = state.toUpperCase().trim();
    if (normalized.length !== 2) {
      return { success: false, error: { message: `Invalid state code: ${state}`, code: 'INVALID_STATE' } };
    }
    return { success: true, data: normalized };
  }),
  validateLimit: vi.fn((limit: string | number) => {
    const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (isNaN(num) || num < 1 || num > 1000) {
      return { success: false, error: { message: `Invalid limit: ${limit}`, code: 'INVALID_LIMIT' } };
    }
    return { success: true, data: num };
  }),
}));

// Mock UI status functions
vi.mock('../../src/ui/status.js', () => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

// Mock formatters
vi.mock('../../src/ui/formatters.js', () => ({
  formatParkCard: vi.fn((park: Park) => `PARK CARD: ${park.reference} - ${park.name}`),
  formatParkList: vi.fn((parks: Park[]) => `PARK LIST: ${parks.length} parks`),
}));

// Mock utils
vi.mock('../../src/utils/index.js', () => ({
  getErrorSuggestions: vi.fn((err: Error & { suggestions?: string[] }) => err.suggestions ?? []),
}));

// Mock console.log
vi.spyOn(console, 'log').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

import * as parkService from '../../src/services/park-service.js';

describe('park-command', () => {
  let program: Command;
  let mockConfig: AppConfig;

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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
    syncedAt: new Date(),
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

  describe('registerParkCommand', () => {
    it('should register park command with program', () => {
      registerParkCommand(program, mockConfig, mockLogger);

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      expect(parkCmd).toBeDefined();
    });

    it('should register search subcommand', () => {
      registerParkCommand(program, mockConfig, mockLogger);

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const searchCmd = parkCmd?.commands.find(cmd => cmd.name() === 'search');
      expect(searchCmd).toBeDefined();
    });

    it('should register show subcommand', () => {
      registerParkCommand(program, mockConfig, mockLogger);

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const showCmd = parkCmd?.commands.find(cmd => cmd.name() === 'show');
      expect(showCmd).toBeDefined();
    });
  });

  describe('park search', () => {
    it('should handle search errors', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.searchParks).mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const searchCmd = parkCmd?.commands.find(cmd => cmd.name() === 'search');

      await expect(
        searchCmd?.parseAsync(['node', 'test', 'yellowstone'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle invalid limit', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const searchCmd = parkCmd?.commands.find(cmd => cmd.name() === 'search');

      await expect(
        searchCmd?.parseAsync(['node', 'test', 'park', '--limit', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle unexpected errors', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.searchParks).mockRejectedValue(new Error('Unexpected error'));

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const searchCmd = parkCmd?.commands.find(cmd => cmd.name() === 'search');

      await expect(
        searchCmd?.parseAsync(['node', 'test', 'yellowstone'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('park show', () => {
    it('should handle park not found', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.getParkByReference).mockResolvedValue({
        success: true,
        data: null,
      });

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const showCmd = parkCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', 'K-9999'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle service errors', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.getParkByReference).mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const showCmd = parkCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', 'K-0039'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle invalid park reference format', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const showCmd = parkCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle unexpected errors', async () => {
      registerParkCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.getParkByReference).mockRejectedValue(new Error('Unexpected error'));

      const parkCmd = program.commands.find(cmd => cmd.name() === 'park');
      const showCmd = parkCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', 'K-0039'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });
});
