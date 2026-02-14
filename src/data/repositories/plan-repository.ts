// Plan repository - handles all activation plan database operations

import type Database from 'better-sqlite3';
import { getDatabase } from '../database.js';
import type {
  Plan,
  PlanCreateInput,
  PlanUpdateInput,
  PlanStatus,
  PlanWithPark,
  Park,
  Result,
} from '../../types/index.js';
import { AppError } from '../../types/index.js';

// Query options for finding plans
export interface PlanFindOptions {
  status?: PlanStatus;
  upcoming?: boolean;
  limit?: number;
}

/**
 * Convert a database row to a Plan object
 */
function rowToPlan(row: Record<string, unknown>): Plan {
  return {
    id: row.id as number,
    parkId: row.parkId as number,
    status: row.status as PlanStatus,
    plannedDate: row.plannedDate as string,
    plannedTime: (row.plannedTime as string | null) ?? null,
    durationHours: (row.durationHours as number | null) ?? null,
    presetId: (row.presetId as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    weatherCache: (row.weatherCache as string | null) ?? null,
    bandsCache: (row.bandsCache as string | null) ?? null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

/**
 * Convert joined plan+park rows to PlanWithPark
 */
function rowsToPlanWithPark(planRow: Record<string, unknown>, parkRow: Record<string, unknown>): PlanWithPark {
  const park: Park = {
    id: parkRow.id as number,
    reference: parkRow.reference as string,
    name: parkRow.name as string,
    latitude: parkRow.latitude as number,
    longitude: parkRow.longitude as number,
    gridSquare: (parkRow.gridSquare as string | null) ?? null,
    state: (parkRow.state as string | null) ?? null,
    country: (parkRow.country as string | null) ?? null,
    region: (parkRow.region as string | null) ?? null,
    parkType: (parkRow.parkType as string | null) ?? null,
    isActive: Boolean(parkRow.isActive),
    potaUrl: (parkRow.potaUrl as string | null) ?? null,
    syncedAt: new Date(parkRow.syncedAt as string),
  };

  return {
    ...rowToPlan(planRow),
    park,
  };
}

/**
 * Create a new activation plan
 */
export function create(planData: PlanCreateInput): Result<Plan> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    // First, find the park by reference
    const parkRow = db
      .prepare('SELECT id FROM parks WHERE reference = ?')
      .get(planData.parkReference.toUpperCase()) as { id: number } | undefined;

    if (!parkRow) {
      return {
        success: false,
        error: new AppError(
          `Park not found: ${planData.parkReference}`,
          'PARK_NOT_FOUND',
          ['Verify the park reference is correct', 'Try syncing park data first']
        ),
      };
    }

    const result = db
      .prepare(
        `INSERT INTO plans (
          parkId, status, plannedDate, plannedTime, durationHours,
          presetId, notes, weatherCache, bandsCache
        ) VALUES (?, 'draft', ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parkRow.id,
        planData.plannedDate,
        planData.plannedTime ?? null,
        planData.durationHours ?? null,
        planData.presetId ?? null,
        planData.notes ?? null,
        planData.weatherCache ?? null,
        planData.bandsCache ?? null
      );

    const planId = result.lastInsertRowid as number;

    const row = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(planId) as Record<string, unknown>;

    return { success: true, data: rowToPlan(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to create plan: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_CREATE_ERROR'
      ),
    };
  }
}

/**
 * Find a plan by its ID
 */
export function findById(id: number): Result<Plan | null> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: rowToPlan(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to find plan ${id}: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_FIND_ERROR'
      ),
    };
  }
}

/**
 * Find a plan by ID with park information
 */
export function findByIdWithPark(id: number): Result<PlanWithPark | null> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db
      .prepare(
        `SELECT p.*, pk.*
         FROM plans p
         JOIN parks pk ON p.parkId = pk.id
         WHERE p.id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return { success: true, data: null };
    }

    // Separate plan and park columns (p.* then pk.*)
    // Columns: p.id, p.parkId, p.status, ..., pk.id, pk.reference, ...
    const planKeys = [
      'id', 'parkId', 'status', 'plannedDate', 'plannedTime',
      'durationHours', 'presetId', 'notes', 'weatherCache', 'bandsCache',
      'createdAt', 'updatedAt'
    ];

    const planRow: Record<string, unknown> = {};
    for (const key of planKeys) {
      planRow[key] = row[key];
    }

    // For park columns, we need to handle the duplicate 'id' column
    // SQLite returns the first occurrence, so we need to re-query for park
    const parkRow = db
      .prepare('SELECT * FROM parks WHERE id = ?')
      .get(row.parkId) as Record<string, unknown>;

    return { success: true, data: rowsToPlanWithPark(planRow, parkRow) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to find plan ${id}: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_FIND_ERROR'
      ),
    };
  }
}

/**
 * Find all plans with optional filtering
 */
export function findAll(options: PlanFindOptions = {}): Result<Plan[]> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const limit = options.limit ?? 50;

    let sql = 'SELECT * FROM plans WHERE 1=1';
    const params: (string | number)[] = [];

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options.upcoming) {
      sql += " AND plannedDate >= date('now')";
    }

    sql += ' ORDER BY plannedDate ASC, plannedTime ASC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    const plans = rows.map(rowToPlan);

    return { success: true, data: plans };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to fetch plans: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_FETCH_ERROR'
      ),
    };
  }
}

/**
 * Find all plans with park information
 */
export function findAllWithPark(options: PlanFindOptions = {}): Result<PlanWithPark[]> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const limit = options.limit ?? 50;

    let sql = `
      SELECT p.id as plan_id, p.parkId, p.status, p.plannedDate, p.plannedTime,
             p.durationHours, p.presetId, p.notes, p.weatherCache, p.bandsCache,
             p.createdAt, p.updatedAt,
             pk.id as park_id, pk.reference, pk.name, pk.latitude, pk.longitude,
             pk.gridSquare, pk.state, pk.country, pk.region, pk.parkType,
             pk.isActive, pk.potaUrl, pk.syncedAt, pk.metadata
      FROM plans p
      JOIN parks pk ON p.parkId = pk.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (options.status) {
      sql += ' AND p.status = ?';
      params.push(options.status);
    }

    if (options.upcoming) {
      sql += " AND p.plannedDate >= date('now')";
    }

    sql += ' ORDER BY p.plannedDate ASC, p.plannedTime ASC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

    const plansWithParks = rows.map((row) => {
      const planRow: Record<string, unknown> = {
        id: row.plan_id,
        parkId: row.parkId,
        status: row.status,
        plannedDate: row.plannedDate,
        plannedTime: row.plannedTime,
        durationHours: row.durationHours,
        presetId: row.presetId,
        notes: row.notes,
        weatherCache: row.weatherCache,
        bandsCache: row.bandsCache,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      const parkRow: Record<string, unknown> = {
        id: row.park_id,
        reference: row.reference,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        gridSquare: row.gridSquare,
        state: row.state,
        country: row.country,
        region: row.region,
        parkType: row.parkType,
        isActive: row.isActive,
        potaUrl: row.potaUrl,
        syncedAt: row.syncedAt,
        metadata: row.metadata,
      };

      return rowsToPlanWithPark(planRow, parkRow);
    });

    return { success: true, data: plansWithParks };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to fetch plans: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_FETCH_ERROR'
      ),
    };
  }
}

/**
 * Update an existing plan
 */
export function update(id: number, planData: PlanUpdateInput): Result<Plan> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;

    // Build dynamic update query
    const updates: string[] = ['updatedAt = datetime(\'now\')'];
    const values: (string | number | null)[] = [];

    if (planData.plannedDate !== undefined) {
      updates.push('plannedDate = ?');
      values.push(planData.plannedDate);
    }

    if (planData.plannedTime !== undefined) {
      updates.push('plannedTime = ?');
      values.push(planData.plannedTime);
    }

    if (planData.durationHours !== undefined) {
      updates.push('durationHours = ?');
      values.push(planData.durationHours);
    }

    if (planData.presetId !== undefined) {
      updates.push('presetId = ?');
      values.push(planData.presetId);
    }

    if (planData.notes !== undefined) {
      updates.push('notes = ?');
      values.push(planData.notes);
    }

    if (planData.status !== undefined) {
      updates.push('status = ?');
      values.push(planData.status);
    }

    if (updates.length === 1) {
      // Only updatedAt, nothing to update
      const existingRow = db
        .prepare('SELECT * FROM plans WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;

      if (!existingRow) {
        return {
          success: false,
          error: new AppError(`Plan not found: ${id}`, 'PLAN_NOT_FOUND'),
        };
      }

      return { success: true, data: rowToPlan(existingRow) };
    }

    const sql = `UPDATE plans SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    const result = db.prepare(sql).run(...values);

    if (result.changes === 0) {
      return {
        success: false,
        error: new AppError(`Plan not found: ${id}`, 'PLAN_NOT_FOUND'),
      };
    }

    const row = db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(id) as Record<string, unknown>;

    return { success: true, data: rowToPlan(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to update plan ${id}: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_UPDATE_ERROR'
      ),
    };
  }
}

/**
 * Delete a plan
 */
export function deletePlan(id: number): Result<boolean> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const result = db.prepare('DELETE FROM plans WHERE id = ?').run(id);

    if (result.changes === 0) {
      return {
        success: false,
        error: new AppError(`Plan not found: ${id}`, 'PLAN_NOT_FOUND'),
      };
    }

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to delete plan ${id}: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_DELETE_ERROR'
      ),
    };
  }
}

/**
 * Get total count of plans
 */
export function count(): Result<number> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number };
    return { success: true, data: row.count };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to count plans: ${error instanceof Error ? error.message : String(error)}`,
        'PLAN_COUNT_ERROR'
      ),
    };
  }
}
