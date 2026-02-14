// Tests for sync command

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerSyncCommand } from '../../src/commands/sync-command.js';
import type { AppConfig } from '../../src/types/index.js';

// Mock the park service
vi.mock('../../src/services/park-service.js', () => ({
  syncParks: vi.fn(),
}));

// Mock the park repository
vi.mock('../../src/data/repositories/park-repository.js', () => ({
  getLastSyncTime: vi.fn(),
}));

// Mock UI status functions
vi.mock('../../src/ui/status.js', () => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

// Mock utils
vi.mock('../../src/utils/index.js', () => ({
  getErrorSuggestions: vi.fn((err: Error & { suggestions?: string[] }) => err.suggestions ?? []),
}));

// Mock console.log to capture output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

import * as parkService from '../../src/services/park-service.js';
import * as parkRepository from '../../src/data/repositories/park-repository.js';

describe('sync-command', () => {
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

  describe('registerSyncCommand', () => {
    it('should register sync command with program', () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      expect(syncCmd).toBeDefined();
    });

    it('should register parks subcommand', () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');
      expect(parksCmd).toBeDefined();
    });

    it('should register all subcommand', () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const allCmd = syncCmd?.commands.find(cmd => cmd.name() === 'all');
      expect(allCmd).toBeDefined();
    });
  });

  describe('sync parks', () => {
    it('should sync parks successfully', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: { count: 100 },
      });

      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date('2024-06-15T12:00:00Z'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['node', 'test', 'parks'], { from: 'user' });

      expect(parkService.syncParks).toHaveBeenCalledWith({
        region: 'US',
        force: undefined,
      });
    });

    it('should sync parks with custom region', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: { count: 50 },
      });

      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date('2024-06-15T12:00:00Z'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['node', 'test', 'parks', '--region', 'CA'], { from: 'user' });

      expect(parkService.syncParks).toHaveBeenCalledWith({
        region: 'CA',
        force: undefined,
      });
    });

    it('should sync parks with force flag', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: { count: 100 },
      });

      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date('2024-06-15T12:00:00Z'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['node', 'test', 'parks', '--force'], { from: 'user' });

      expect(parkService.syncParks).toHaveBeenCalledWith({
        region: 'US',
        force: true,
      });
    });

    it('should handle sync failure', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: false,
        error: new Error('Network error'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['node', 'test', 'parks'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle sync with stale warning', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: {
          count: 100,
          staleWarning: 'Data was synced 10 days ago',
        },
      });

      vi.mocked(parkRepository.getLastSyncTime).mockReturnValue({
        success: true,
        data: new Date('2024-06-15T12:00:00Z'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['node', 'test', 'parks'], { from: 'user' });

      // Warning should have been called
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockRejectedValue(new Error('Unexpected error'));

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const parksCmd = syncCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['node', 'test', 'parks'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('sync all', () => {
    it('should sync all data sources', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: { count: 100 },
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const allCmd = syncCmd?.commands.find(cmd => cmd.name() === 'all');

      await allCmd?.parseAsync(['node', 'test', 'all'], { from: 'user' });

      expect(parkService.syncParks).toHaveBeenCalled();
    });

    it('should pass region option to all sync', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: true,
        data: { count: 50 },
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const allCmd = syncCmd?.commands.find(cmd => cmd.name() === 'all');

      await allCmd?.parseAsync(['node', 'test', 'all', '--region', 'EU'], { from: 'user' });

      expect(parkService.syncParks).toHaveBeenCalledWith({
        region: 'EU',
        force: undefined,
      });
    });

    it('should handle sync all failure', async () => {
      registerSyncCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.syncParks).mockResolvedValue({
        success: false,
        error: new Error('API error'),
      });

      const syncCmd = program.commands.find(cmd => cmd.name() === 'sync');
      const allCmd = syncCmd?.commands.find(cmd => cmd.name() === 'all');

      await expect(
        allCmd?.parseAsync(['node', 'test', 'all'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });
});
