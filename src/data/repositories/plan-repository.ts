/**
 * Plan repository - handles all activation plan database operations.
 *
 * Provides data access layer for activation plans including:
 * - CRUD operations for plans
 * - Plan queries with park data joins
 * - Filtering by status and date
 *
 * Plans store cached weather and band data for offline access.
 *
 * @module data/repositories/plan-repository
 */

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

/**
 * Options for querying plans.
 */
export interface PlanFindOptions {
  status?: PlanStatus;
  upcoming?: boolean;
  limit?: number;
}

/**
 * Converts a database row to a Plan object.
 *
 * @param row - Raw database row
 * @returns Typed Plan object
 *
 * @internal
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
 * Converts joined plan and park rows to a PlanWithPark object.
 *
 * Combines data from both tables into a single object with
 * the park nested inside the plan.
 *
 * @param planRow - Raw plan database row
 * @param parkRow - Raw park database row
 * @returns PlanWithPark object with nested park data
 *
 * @internal
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
 * Creates a new activation plan.
 *
 * Looks up the park by reference and creates a plan record
 * with status 'draft'. Weather and band data can be pre-cached.
 *
 * @param planData - Plan creation input including park reference
 * @returns A Result containing the created Plan
 *
 * @example
 * ```typescript
 * const result = create({
 *   parkReference: 'K-0039',
 *   plannedDate: '2024-07-15',
 *   plannedTime: '09:00',
 *   durationHours: 4,
 *   presetId: 'qrp-portable'
 * });
 * ```
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
 * Finds a plan by its ID.
 *
 * @param id - The plan ID
 * @returns A Result containing the Plan if found, null if not found
 *
 * @example
 * ```typescript
 * const result = findById(1);
 * if (result.success && result.data) {
 *   console.log(`Plan for: ${result.data.plannedDate}`);
 * }
 * ```
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
 * Finds a plan by ID with park information included.
 *
 * Joins the plan with its associated park to return
 * complete information for display or export.
 *
 * @param id - The plan ID
 * @returns A Result containing the PlanWithPark if found, null if not found
 *
 * @example
 * ```typescript
 * const result = findByIdWithPark(1);
 * if (result.success && result.data) {
 *   console.log(`Park: ${result.data.park.name}`);
 *   console.log(`Date: ${result.data.plannedDate}`);
 * }
 * ```
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
 * Finds all plans with optional filtering.
 *
 * Supports filtering by status and date. Results are ordered
 * by planned date and time.
 *
 * @param options - Query options
 * @param options.status - Filter by plan status
 * @param options.upcoming - Only include future plans
 * @param options.limit - Maximum results (default: 50)
 * @returns A Result containing an array of Plans
 *
 * @example
 * ```typescript
 * // Get all upcoming finalized plans
 * const result = findAll({ status: 'finalized', upcoming: true });
 * ```
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
 * Finds all plans with park information included.
 *
 * Joins plans with their associated parks for complete
 * display information. Useful for listing plans in the UI.
 *
 * @param options - Query options (same as findAll)
 * @returns A Result containing an array of PlanWithPark objects
 *
 * @example
 * ```typescript
 * const result = findAllWithPark({ upcoming: true, limit: 10 });
 * if (result.success) {
 *   result.data.forEach(plan => {
 *     console.log(`${plan.park.reference}: ${plan.park.name}`);
 *   });
 * }
 * ```
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
 * Updates an existing plan.
 *
 * Only provided fields are updated; others remain unchanged.
 * The updatedAt timestamp is automatically set.
 *
 * @param id - The plan ID to update
 * @param planData - Partial plan data to update
 * @returns A Result containing the updated Plan
 *
 * @example
 * ```typescript
 * const result = update(1, {
 *   status: 'finalized',
 *   plannedTime: '08:00'
 * });
 * ```
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
 * Deletes a plan by ID.
 *
 * @param id - The plan ID to delete
 * @returns A Result containing true if deleted, or an error if not found
 *
 * @example
 * ```typescript
 * const result = deletePlan(1);
 * if (result.success) {
 *   console.log('Plan deleted');
 * }
 * ```
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
 * Gets the total count of plans in the database.
 *
 * @returns A Result containing the plan count
 *
 * @example
 * ```typescript
 * const result = count();
 * if (result.success) {
 *   console.log(`${result.data} plans in database`);
 * }
 * ```
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
