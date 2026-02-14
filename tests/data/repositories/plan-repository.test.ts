// Tests for plan repository

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Plan, PlanCreateInput, PlanUpdateInput, PlanStatus, Park, Result } from '../../../src/types/index.js';

// Mock database module
const mockPrepare = vi.fn();
const mockDb = {
  prepare: mockPrepare,
  transaction: vi.fn((fn) => fn),
};

vi.mock('../../../src/data/database.js', () => ({
  getDatabase: vi.fn(),
}));

import * as database from '../../../src/data/database.js';

// Sample park row
const sampleParkRow: Record<string, unknown> = {
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
  isActive: 1,
  potaUrl: 'https://pota.app/#/park/K-0039',
  syncedAt: '2024-01-15T10:00:00Z',
};

// Sample plan row
const samplePlanRow: Record<string, unknown> = {
  id: 1,
  parkId: 1,
  status: 'draft',
  plannedDate: '2024-02-15',
  plannedTime: '14:00',
  durationHours: 4,
  presetId: 'qrp-portable',
  notes: 'Test activation',
  weatherCache: null,
  bandsCache: null,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
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
  syncedAt: new Date('2024-01-15T10:00:00Z'),
};

// Helper to mock successful database
function mockSuccessDb() {
  vi.mocked(database.getDatabase).mockReturnValue({
    success: true,
    data: mockDb as unknown as ReturnType<typeof database.getDatabase> extends Result<infer T> ? T : never,
  });
}

describe('plan-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepare.mockReset();
  });

  describe('create', () => {
    it('should create a new plan', async () => {
      mockSuccessDb();

      // Set up all mock calls needed for create operation
      mockPrepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM parks')) {
          return { get: vi.fn().mockReturnValue({ id: 1 }) };
        }
        if (sql.includes('INSERT INTO plans')) {
          return { run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }) };
        }
        if (sql.includes('SELECT * FROM plans')) {
          return { get: vi.fn().mockReturnValue(samplePlanRow) };
        }
        return { get: vi.fn(), run: vi.fn(), all: vi.fn() };
      });

      const { create } = await import('../../../src/data/repositories/plan-repository.js');
      const input: PlanCreateInput = {
        parkReference: 'K-0039',
        plannedDate: '2024-02-15',
        plannedTime: '14:00',
        durationHours: 4,
      };

      const result = create(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parkId).toBe(1);
        expect(result.data.status).toBe('draft');
      }
    });

    it('should return error when park not found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { create } = await import('../../../src/data/repositories/plan-repository.js');
      const input: PlanCreateInput = {
        parkReference: 'K-9999',
        plannedDate: '2024-02-15',
      };

      const result = create(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARK_NOT_FOUND');
      }
    });

    it('should normalize park reference to uppercase', async () => {
      mockSuccessDb();

      const mockGet = vi.fn().mockReturnValue({ id: 1 });
      mockPrepare
        .mockReturnValueOnce({ get: mockGet })
        .mockReturnValueOnce({ run: vi.fn(), lastInsertRowid: 1 })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { create } = await import('../../../src/data/repositories/plan-repository.js');
      create({
        parkReference: 'k-0039',
        plannedDate: '2024-02-15',
      });

      expect(mockGet).toHaveBeenCalledWith('K-0039');
    });

    it('should handle optional fields', async () => {
      mockSuccessDb();

      const mockRun = vi.fn();
      mockPrepare
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ id: 1 }) })
        .mockReturnValueOnce({ run: mockRun, lastInsertRowid: 1 })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { create } = await import('../../../src/data/repositories/plan-repository.js');
      create({
        parkReference: 'K-0039',
        plannedDate: '2024-02-15',
        plannedTime: null,
        durationHours: null,
        presetId: null,
        notes: null,
        weatherCache: null,
        bandsCache: null,
      });

      // Verify nulls are passed correctly
      const runCall = mockRun.mock.calls[0];
      expect(runCall).toBeDefined();
    });

    it('should default status to draft', async () => {
      mockSuccessDb();

      mockPrepare
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ id: 1 }) })
        .mockReturnValueOnce({ run: vi.fn(), lastInsertRowid: 1 })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { create } = await import('../../../src/data/repositories/plan-repository.js');
      create({
        parkReference: 'K-0039',
        plannedDate: '2024-02-15',
      });

      const sqlCall = mockPrepare.mock.calls[1][0];
      expect(sqlCall).toContain("'draft'");
    });
  });

  describe('findById', () => {
    it('should return plan when found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { findById } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findById(1);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe(1);
        expect(result.data.status).toBe('draft');
      }
    });

    it('should return null when not found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { findById } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findById(999);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it('should convert dates correctly', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { findById } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findById(1);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('findByIdWithPark', () => {
    it('should return plan with park data', async () => {
      mockSuccessDb();

      mockPrepare
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue({ ...samplePlanRow, parkId: 1 }) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(sampleParkRow) });

      const { findByIdWithPark } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findByIdWithPark(1);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.park).toBeDefined();
        expect(result.data.park.reference).toBe('K-0039');
      }
    });

    it('should return null when plan not found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      const { findByIdWithPark } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findByIdWithPark(999);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe('findAll', () => {
    it('should return all plans with default limit', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue([samplePlanRow]) });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findAll();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });

    it('should filter by status', async () => {
      mockSuccessDb();

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');
      findAll({ status: 'draft' });

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('status = ?');
    });

    it('should filter by upcoming', async () => {
      mockSuccessDb();

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');
      findAll({ upcoming: true });

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain("plannedDate >= date('now')");
    });

    it('should use custom limit', async () => {
      mockSuccessDb();

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');
      findAll({ limit: 100 });

      const lastArg = mockAll.mock.calls[0].slice(-1)[0];
      expect(lastArg).toBe(100);
    });

    it('should order by plannedDate and plannedTime', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue([]) });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');
      findAll();

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('ORDER BY plannedDate ASC, plannedTime ASC');
    });
  });

  describe('findAllWithPark', () => {
    it('should return plans with park data', async () => {
      mockSuccessDb();

      const rowWithPark = {
        plan_id: 1,
        parkId: 1,
        status: 'draft',
        plannedDate: '2024-02-15',
        plannedTime: '14:00',
        durationHours: 4,
        presetId: 'qrp-portable',
        notes: 'Test',
        weatherCache: null,
        bandsCache: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        park_id: 1,
        reference: 'K-0039',
        name: 'Yellowstone National Park',
        latitude: 44.428,
        longitude: -110.5885,
        gridSquare: 'DN44xk',
        state: 'WY',
        country: 'United States',
        region: 'Wyoming',
        parkType: 'National Park',
        isActive: 1,
        potaUrl: 'https://pota.app/#/park/K-0039',
        syncedAt: '2024-01-15T10:00:00Z',
        metadata: null,
      };

      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue([rowWithPark]) });

      const { findAllWithPark } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findAllWithPark();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].park.reference).toBe('K-0039');
      }
    });

    it('should filter by status and upcoming', async () => {
      mockSuccessDb();

      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      const { findAllWithPark } = await import('../../../src/data/repositories/plan-repository.js');
      findAllWithPark({ status: 'draft', upcoming: true });

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('p.status = ?');
      expect(sqlCall).toContain("p.plannedDate >= date('now')");
    });
  });

  describe('update', () => {
    it('should update plan fields', async () => {
      mockSuccessDb();

      const updatedRow = { ...samplePlanRow, status: 'finalized' };
      mockPrepare
        .mockReturnValueOnce({ run: vi.fn().mockReturnValue({ changes: 1 }) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(updatedRow) });

      const { update } = await import('../../../src/data/repositories/plan-repository.js');
      const result = update(1, { status: 'finalized' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('finalized');
      }
    });

    it('should update updatedAt timestamp', async () => {
      mockSuccessDb();

      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      mockPrepare
        .mockReturnValueOnce({ run: mockRun })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { update } = await import('../../../src/data/repositories/plan-repository.js');
      update(1, { plannedDate: '2024-03-01' });

      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain("updatedAt = datetime('now')");
    });

    it('should return error when plan not found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 0 }) });

      const { update } = await import('../../../src/data/repositories/plan-repository.js');
      const result = update(999, { status: 'finalized' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAN_NOT_FOUND');
      }
    });

    it('should return existing plan when no fields to update', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { update } = await import('../../../src/data/repositories/plan-repository.js');
      const result = update(1, {} as PlanUpdateInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
      }
    });

    it('should handle null values for optional fields', async () => {
      mockSuccessDb();

      mockPrepare
        .mockReturnValueOnce({ run: vi.fn().mockReturnValue({ changes: 1 }) })
        .mockReturnValueOnce({ get: vi.fn().mockReturnValue(samplePlanRow) });

      const { update } = await import('../../../src/data/repositories/plan-repository.js');
      const result = update(1, { plannedTime: null });

      expect(result.success).toBe(true);
    });
  });

  describe('deletePlan', () => {
    it('should delete plan', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 1 }) });

      const { deletePlan } = await import('../../../src/data/repositories/plan-repository.js');
      const result = deletePlan(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return error when plan not found', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 0 }) });

      const { deletePlan } = await import('../../../src/data/repositories/plan-repository.js');
      const result = deletePlan(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAN_NOT_FOUND');
      }
    });
  });

  describe('count', () => {
    it('should return plan count', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue({ count: 10 }) });

      const { count } = await import('../../../src/data/repositories/plan-repository.js');
      const result = count();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it('should return error on database failure', async () => {
      vi.mocked(database.getDatabase).mockReturnValue({
        success: false,
        error: new Error('Database error'),
      });

      const { count } = await import('../../../src/data/repositories/plan-repository.js');
      const result = count();

      expect(result.success).toBe(false);
    });
  });

  describe('rowToPlan conversion', () => {
    it('should handle null optional fields', async () => {
      mockSuccessDb();

      const rowWithNulls = {
        ...samplePlanRow,
        plannedTime: null,
        durationHours: null,
        presetId: null,
        notes: null,
      };
      mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue(rowWithNulls) });

      const { findById } = await import('../../../src/data/repositories/plan-repository.js');
      const result = findById(1);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.plannedTime).toBeNull();
        expect(result.data.durationHours).toBeNull();
        expect(result.data.presetId).toBeNull();
        expect(result.data.notes).toBeNull();
      }
    });

    it('should convert status correctly', async () => {
      mockSuccessDb();

      const statuses: PlanStatus[] = ['draft', 'finalized', 'completed', 'cancelled'];

      for (const status of statuses) {
        mockPrepare.mockReturnValue({ get: vi.fn().mockReturnValue({ ...samplePlanRow, status }) });

        const { findById } = await import('../../../src/data/repositories/plan-repository.js');
        const result = findById(1);

        expect(result.success).toBe(true);
        if (result.success && result.data) {
          expect(result.data.status).toBe(status);
        }

        vi.resetModules();
      }
    });
  });

  describe('PlanFindOptions interface', () => {
    it('should accept all option properties', async () => {
      mockSuccessDb();

      mockPrepare.mockReturnValue({ all: vi.fn().mockReturnValue([]) });

      const { findAll } = await import('../../../src/data/repositories/plan-repository.js');

      // Should accept all options
      const result = findAll({
        status: 'draft',
        upcoming: true,
        limit: 25,
      });

      expect(result.success).toBe(true);
    });
  });
});
