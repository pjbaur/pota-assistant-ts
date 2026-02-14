// Tests for plan command

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerPlanCommand } from '../../src/commands/plan-command.js';
import type { AppConfig, Park, Plan, PlanWithPark } from '../../src/types/index.js';

// Mock the plan repository
vi.mock('../../src/data/repositories/plan-repository.js', () => ({
  create: vi.fn(),
  findAllWithPark: vi.fn(),
  findByIdWithPark: vi.fn(),
  update: vi.fn(),
  deletePlan: vi.fn(),
}));

// Mock the park service
vi.mock('../../src/services/park-service.js', () => ({
  getParkByReference: vi.fn(),
}));

// Mock the weather service
vi.mock('../../src/services/weather-service.js', () => ({
  getForecast: vi.fn(),
}));

// Mock the band service
vi.mock('../../src/services/band-service.js', () => ({
  getBandConditions: vi.fn(),
}));

// Mock equipment presets
vi.mock('../../src/services/equipment-presets.js', () => ({
  isValidPresetId: vi.fn((id: string) => ['qrp-portable', 'standard-portable', 'mobile-high-power'].includes(id)),
  getPresetOptions: vi.fn(() => [
    { value: 'qrp-portable', description: 'QRP Portable Setup' },
    { value: 'standard-portable', description: 'Standard Portable Setup' },
    { value: 'mobile-high-power', description: 'Mobile High Power Setup' },
  ]),
}));

// Mock export service
vi.mock('../../src/services/export-service.js', () => ({
  exportPlan: vi.fn(),
}));

// Mock UI prompts
vi.mock('../../src/ui/prompts.js', () => ({
  promptSelect: vi.fn().mockResolvedValue('qrp-portable - QRP Portable Setup'),
  promptConfirm: vi.fn().mockResolvedValue(true),
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
  validateDate: vi.fn((date: string, options?: { allowPast?: boolean }) => {
    if (!date) {
      return { success: false, error: { message: 'Date is required', code: 'INVALID_INPUT' } };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: { message: 'Invalid date format', code: 'INVALID_DATE_FORMAT' } };
    }
    if (options?.allowPast === false && new Date(date) < new Date('2024-06-15')) {
      return { success: false, error: { message: 'Date cannot be in the past', code: 'PAST_DATE' } };
    }
    return { success: true, data: date };
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
  formatPlanCard: vi.fn((plan: PlanWithPark) => `PLAN CARD: #${plan.id}`),
  formatPlanList: vi.fn((plans: PlanWithPark[]) => `PLAN LIST: ${plans.length} plans`),
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

import * as planRepository from '../../src/data/repositories/plan-repository.js';
import * as parkService from '../../src/services/park-service.js';

describe('plan-command', () => {
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

  const samplePlan: Plan = {
    id: 1,
    parkId: 1,
    status: 'draft',
    plannedDate: '2024-07-01',
    plannedTime: '10:00',
    durationHours: 4,
    presetId: 'qrp-portable',
    notes: 'Test activation',
    weatherCache: null,
    bandsCache: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const samplePlanWithPark: PlanWithPark = {
    ...samplePlan,
    park: samplePark,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('registerPlanCommand', () => {
    it('should register plan command with program', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      expect(planCmd).toBeDefined();
    });

    it('should register create subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const createCmd = planCmd?.commands.find(cmd => cmd.name() === 'create');
      expect(createCmd).toBeDefined();
    });

    it('should register list subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const listCmd = planCmd?.commands.find(cmd => cmd.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should register show subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const showCmd = planCmd?.commands.find(cmd => cmd.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should register edit subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const editCmd = planCmd?.commands.find(cmd => cmd.name() === 'edit');
      expect(editCmd).toBeDefined();
    });

    it('should register delete subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const deleteCmd = planCmd?.commands.find(cmd => cmd.name() === 'delete');
      expect(deleteCmd).toBeDefined();
    });

    it('should register export subcommand', () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const exportCmd = planCmd?.commands.find(cmd => cmd.name() === 'export');
      expect(exportCmd).toBeDefined();
    });
  });

  describe('plan create', () => {
    it('should reject invalid park reference', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const createCmd = planCmd?.commands.find(cmd => cmd.name() === 'create');

      await expect(
        createCmd?.parseAsync(['node', 'test', 'invalid', '--date', '2024-07-01'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should reject past date', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const createCmd = planCmd?.commands.find(cmd => cmd.name() === 'create');

      await expect(
        createCmd?.parseAsync(['node', 'test', 'K-0039', '--date', '2024-06-01'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should reject invalid preset', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const createCmd = planCmd?.commands.find(cmd => cmd.name() === 'create');

      await expect(
        createCmd?.parseAsync(['node', 'test', 'K-0039', '--date', '2024-07-01', '--preset', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle park not found', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(parkService.getParkByReference).mockResolvedValue({
        success: true,
        data: null,
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const createCmd = planCmd?.commands.find(cmd => cmd.name() === 'create');

      await expect(
        createCmd?.parseAsync(['node', 'test', 'K-9999', '--date', '2024-07-01', '--preset', 'qrp-portable'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('plan list', () => {
    it('should handle repository errors', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(planRepository.findAllWithPark).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const listCmd = planCmd?.commands.find(cmd => cmd.name() === 'list');

      await expect(
        listCmd?.parseAsync(['node', 'test', 'list'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('plan show', () => {
    it('should reject invalid plan ID', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const showCmd = planCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle plan not found', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(planRepository.findByIdWithPark).mockReturnValue({
        success: true,
        data: null,
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const showCmd = planCmd?.commands.find(cmd => cmd.name() === 'show');

      await expect(
        showCmd?.parseAsync(['node', 'test', '999'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('plan edit', () => {
    it('should reject invalid plan ID', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const editCmd = planCmd?.commands.find(cmd => cmd.name() === 'edit');

      await expect(
        editCmd?.parseAsync(['node', 'test', 'invalid', '--notes', 'test'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should reject invalid preset', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const editCmd = planCmd?.commands.find(cmd => cmd.name() === 'edit');

      await expect(
        editCmd?.parseAsync(['node', 'test', '1', '--preset', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle update failure', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(planRepository.update).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const editCmd = planCmd?.commands.find(cmd => cmd.name() === 'edit');

      await expect(
        editCmd?.parseAsync(['node', 'test', '1', '--notes', 'test'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('plan delete', () => {
    it('should reject invalid plan ID', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const deleteCmd = planCmd?.commands.find(cmd => cmd.name() === 'delete');

      await expect(
        deleteCmd?.parseAsync(['node', 'test', 'invalid'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle delete failure', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(planRepository.deletePlan).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const deleteCmd = planCmd?.commands.find(cmd => cmd.name() === 'delete');

      await expect(
        deleteCmd?.parseAsync(['node', 'test', '1', '--force'], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });

  describe('plan export', () => {
    it('should reject invalid format', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const exportCmd = planCmd?.commands.find(cmd => cmd.name() === 'export');

      await expect(
        exportCmd?.parseAsync([
          'node', 'test', '1',
          '--format', 'invalid',
          '--output', '/mock/exports/plan-1.txt',
        ], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should reject invalid plan ID', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const exportCmd = planCmd?.commands.find(cmd => cmd.name() === 'export');

      await expect(
        exportCmd?.parseAsync([
          'node', 'test', 'invalid',
          '--format', 'markdown',
          '--output', '/mock/exports/plan-1.md',
        ], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });

    it('should handle plan not found', async () => {
      registerPlanCommand(program, mockConfig, mockLogger);

      vi.mocked(planRepository.findByIdWithPark).mockReturnValue({
        success: true,
        data: null,
      });

      const planCmd = program.commands.find(cmd => cmd.name() === 'plan');
      const exportCmd = planCmd?.commands.find(cmd => cmd.name() === 'export');

      await expect(
        exportCmd?.parseAsync([
          'node', 'test', '999',
          '--format', 'markdown',
          '--output', '/mock/exports/plan-999.md',
        ], { from: 'user' })
      ).rejects.toThrow('process.exit called');
    });
  });
});
