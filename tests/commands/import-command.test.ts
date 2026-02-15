// Tests for import command

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerImportCommand } from '../../src/commands/import-command.js';
import type { AppConfig } from '../../src/types/index.js';

// Mock the csv import service
vi.mock('../../src/services/csv-import-service.js', () => ({
  importParksFromCsv: vi.fn(),
}));

// Mock the park repository
vi.mock('../../src/data/repositories/park-repository.js', () => ({
  count: vi.fn(),
}));

// Mock fs existsSync
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock UI status functions
vi.mock('../../src/ui/status.js', () => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
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

import * as csvImportService from '../../src/services/csv-import-service.js';
import * as parkRepository from '../../src/data/repositories/park-repository.js';
import { existsSync } from 'fs';

describe('import-command', () => {
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

  describe('registerImportCommand', () => {
    it('should register import command with program', () => {
      registerImportCommand(program, mockConfig, mockLogger);

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      expect(importCmd).toBeDefined();
    });

    it('should register parks subcommand', () => {
      registerImportCommand(program, mockConfig, mockLogger);

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');
      expect(parksCmd).toBeDefined();
    });
  });

  describe('import parks', () => {
    it('should import parks successfully', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      // Ensure file exists mock returns true
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: true,
        data: {
          imported: 100,
          skipped: 0,
          warnings: [],
          durationMs: 500,
        },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      // When parsing subcommand directly with from:'user', args should be just the subcommand's args
      await parksCmd?.parseAsync(['/data/parks.csv'], { from: 'user' });

      expect(csvImportService.importParksFromCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/data/parks.csv',
          batchSize: 1000,
          // strict and showWarnings are undefined when not specified (Commander behavior)
        })
      );
    });

    it('should import parks with custom batch size', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: true,
        data: {
          imported: 100,
          skipped: 0,
          warnings: [],
          durationMs: 500,
        },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['/data/parks.csv', '-b', '500'], { from: 'user' });

      expect(csvImportService.importParksFromCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          batchSize: 500,
        })
      );
    });

    it('should import parks with strict mode', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: true,
        data: {
          imported: 100,
          skipped: 0,
          warnings: [],
          durationMs: 500,
        },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['/data/parks.csv', '--strict'], { from: 'user' });

      expect(csvImportService.importParksFromCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          strict: true,
        })
      );
    });

    it('should import parks with show-warnings flag', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: true,
        data: {
          imported: 100,
          skipped: 5,
          warnings: [
            { lineNumber: 10, message: 'Test warning' },
          ],
          durationMs: 500,
        },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['/data/parks.csv', '--show-warnings'], { from: 'user' });

      expect(csvImportService.importParksFromCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          showWarnings: true,
        })
      );
    });

    it('should handle file not found', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(existsSync).mockReturnValue(false);

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['/nonexistent.csv'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle invalid batch size', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['/data/parks.csv', '-b', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle import failure', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: false,
        error: new Error('Import failed'),
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['/data/parks.csv'], { from: 'user' })
      ).rejects.toThrow('process.exit called');

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle unexpected errors', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      vi.mocked(csvImportService.importParksFromCsv).mockRejectedValue(new Error('Unexpected error'));

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await expect(
        parksCmd?.parseAsync(['/data/parks.csv'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should display warnings when present', async () => {
      registerImportCommand(program, mockConfig, mockLogger);

      // Ensure file exists mock returns true
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(csvImportService.importParksFromCsv).mockResolvedValue({
        success: true,
        data: {
          imported: 100,
          skipped: 2,
          warnings: [
            { lineNumber: 10, message: 'Park has (0,0) coordinates' },
          ],
          durationMs: 500,
        },
      });

      vi.mocked(parkRepository.count).mockReturnValue({
        success: true,
        data: 100,
      });

      const importCmd = program.commands.find(cmd => cmd.name() === 'import');
      const parksCmd = importCmd?.commands.find(cmd => cmd.name() === 'parks');

      await parksCmd?.parseAsync(['/data/parks.csv', '--show-warnings'], { from: 'user' });

      // The warning function should have been called
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});
