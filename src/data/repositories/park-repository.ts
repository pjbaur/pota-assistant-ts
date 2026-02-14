// Park repository - handles all park-related database operations

import type Database from 'better-sqlite3';
import { getDatabase } from '../database.js';
import type { Park, ParkSearchResult, Result } from '../../types/index.js';
import { AppError } from '../../types/index.js';

// Input type for upsert operations
export interface ParkUpsertInput {
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  gridSquare?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  parkType?: string | null;
  isActive?: boolean;
  potaUrl?: string | null;
  metadata?: string | null;
}

// Search options
export interface ParkSearchOptions {
  state?: string;
  limit?: number;
}

/**
 * Convert a database row to a Park object
 */
function rowToPark(row: Record<string, unknown>): Park {
  return {
    id: row.id as number,
    reference: row.reference as string,
    name: row.name as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    gridSquare: (row.gridSquare as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    parkType: (row.parkType as string | null) ?? null,
    isActive: Boolean(row.isActive),
    potaUrl: (row.potaUrl as string | null) ?? null,
    syncedAt: new Date(row.syncedAt as string),
  };
}

/**
 * Get all parks with pagination
 */
export function findAll(limit = 50, offset = 0): Result<Park[]> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const rows = db
      .prepare(
        `SELECT * FROM parks
         ORDER BY reference ASC
         LIMIT ? OFFSET ?`
      )
      .all(limit, offset) as Record<string, unknown>[];

    const parks = rows.map(rowToPark);
    return { success: true, data: parks };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to fetch parks: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_FETCH_ERROR'
      ),
    };
  }
}

/**
 * Find a park by its POTA reference (e.g., "K-0039")
 */
export function findByReference(reference: string): Result<Park | null> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db
      .prepare('SELECT * FROM parks WHERE reference = ?')
      .get(reference.toUpperCase()) as Record<string, unknown> | undefined;

    if (!row) {
      return { success: true, data: null };
    }

    return { success: true, data: rowToPark(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to find park ${reference}: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_FIND_ERROR'
      ),
    };
  }
}

/**
 * Search parks by name, reference, or location
 */
export function search(
  query: string,
  options: ParkSearchOptions = {}
): Result<ParkSearchResult> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const limit = options.limit ?? 50;
    const searchPattern = `%${query}%`;

    let sql = `
      SELECT * FROM parks
      WHERE (reference LIKE ? OR name LIKE ?)
    `;
    const params: (string | number)[] = [searchPattern, searchPattern];

    if (options.state) {
      sql += ` AND state = ?`;
      params.push(options.state.toUpperCase());
    }

    sql += ` ORDER BY reference ASC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    const parks = rows.map(rowToPark);

    // Get total count for the search
    let countSql = `
      SELECT COUNT(*) as count FROM parks
      WHERE (reference LIKE ? OR name LIKE ?)
    `;
    const countParams: (string | number)[] = [searchPattern, searchPattern];

    if (options.state) {
      countSql += ` AND state = ?`;
      countParams.push(options.state.toUpperCase());
    }

    const countRow = db.prepare(countSql).get(...countParams) as { count: number };
    const total = countRow.count;

    return {
      success: true,
      data: {
        parks,
        total,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to search parks: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_SEARCH_ERROR'
      ),
    };
  }
}

/**
 * Insert or update a park
 */
export function upsert(parkData: ParkUpsertInput): Result<Park> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const reference = parkData.reference.toUpperCase();

    const stmt = db.prepare(`
      INSERT INTO parks (
        reference, name, latitude, longitude, gridSquare,
        state, country, region, parkType, isActive, potaUrl, metadata, syncedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(reference) DO UPDATE SET
        name = excluded.name,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        gridSquare = excluded.gridSquare,
        state = excluded.state,
        country = excluded.country,
        region = excluded.region,
        parkType = excluded.parkType,
        isActive = excluded.isActive,
        potaUrl = excluded.potaUrl,
        metadata = excluded.metadata,
        syncedAt = datetime('now')
    `);

    stmt.run(
      reference,
      parkData.name,
      parkData.latitude,
      parkData.longitude,
      parkData.gridSquare ?? null,
      parkData.state ?? null,
      parkData.country ?? null,
      parkData.region ?? null,
      parkData.parkType ?? null,
      parkData.isActive ? 1 : 0,
      parkData.potaUrl ?? null,
      parkData.metadata ?? null
    );

    // Fetch the inserted/updated row
    const row = db
      .prepare('SELECT * FROM parks WHERE reference = ?')
      .get(reference) as Record<string, unknown>;

    return { success: true, data: rowToPark(row) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to upsert park ${parkData.reference}: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_UPSERT_ERROR'
      ),
    };
  }
}

/**
 * Batch insert or update multiple parks
 */
export function upsertMany(parks: ParkUpsertInput[]): Result<{ count: number }> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  if (parks.length === 0) {
    return { success: true, data: { count: 0 } };
  }

  try {
    const db = dbResult.data;

    const stmt = db.prepare(`
      INSERT INTO parks (
        reference, name, latitude, longitude, gridSquare,
        state, country, region, parkType, isActive, potaUrl, metadata, syncedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(reference) DO UPDATE SET
        name = excluded.name,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        gridSquare = excluded.gridSquare,
        state = excluded.state,
        country = excluded.country,
        region = excluded.region,
        parkType = excluded.parkType,
        isActive = excluded.isActive,
        potaUrl = excluded.potaUrl,
        metadata = excluded.metadata,
        syncedAt = datetime('now')
    `);

    const upsertManyTx = db.transaction((parkList: ParkUpsertInput[]) => {
      for (const park of parkList) {
        stmt.run(
          park.reference.toUpperCase(),
          park.name,
          park.latitude,
          park.longitude,
          park.gridSquare ?? null,
          park.state ?? null,
          park.country ?? null,
          park.region ?? null,
          park.parkType ?? null,
          park.isActive ? 1 : 0,
          park.potaUrl ?? null,
          park.metadata ?? null
        );
      }
    });

    upsertManyTx(parks);

    return { success: true, data: { count: parks.length } };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to batch upsert parks: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_BATCH_UPSERT_ERROR'
      ),
    };
  }
}

/**
 * Get total count of parks
 */
export function count(): Result<number> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db.prepare('SELECT COUNT(*) as count FROM parks').get() as { count: number };
    return { success: true, data: row.count };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to count parks: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_COUNT_ERROR'
      ),
    };
  }
}

/**
 * Get the last sync timestamp
 */
export function getLastSyncTime(): Result<Date | null> {
  const dbResult = getDatabase();
  if (!dbResult.success) {
    return dbResult;
  }

  try {
    const db = dbResult.data;
    const row = db
      .prepare('SELECT MAX(syncedAt) as lastSync FROM parks')
      .get() as { lastSync: string | null } | undefined;

    if (!row || !row.lastSync) {
      return { success: true, data: null };
    }

    return { success: true, data: new Date(row.lastSync) };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to get last sync time: ${error instanceof Error ? error.message : String(error)}`,
        'PARK_SYNC_TIME_ERROR'
      ),
    };
  }
}
