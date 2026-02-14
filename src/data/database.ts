/**
 * Database connection and migration runner.
 *
 * Manages the SQLite database connection using better-sqlite3 and
 * handles schema migrations. The database is stored locally and
 * supports offline operation after initial setup.
 *
 * @module data/database
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { loadConfig } from '../config/index.js';
import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

/**
 * Represents a database migration.
 *
 * Each migration has a unique ID, descriptive name, and an `up` function
 * that applies the schema changes.
 */
export interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
}

/** Database singleton instance */
let db: Database.Database | null = null;

/**
 * Gets or creates the database connection.
 *
 * On first call:
 * 1. Creates the database file if it doesn't exist
 * 2. Enables WAL mode and foreign key constraints
 * 3. Runs any pending migrations
 *
 * Subsequent calls return the existing connection.
 *
 * @returns A Result containing the Database instance or an error
 *
 * @example
 * ```typescript
 * const result = getDatabase();
 * if (result.success) {
 *   const db = result.data;
 *   const rows = db.prepare('SELECT * FROM parks').all();
 * }
 * ```
 */
export function getDatabase(): Result<Database.Database> {
  if (db) {
    return { success: true, data: db };
  }

  try {
    const config = loadConfig();
    const dbPath = config.data.databasePath;

    // Ensure parent directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migrations
    const migrationResult = runMigrations(db);
    if (!migrationResult.success) {
      db.close();
      db = null;
      return migrationResult;
    }

    return { success: true, data: db };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        'DATABASE_INIT_ERROR',
        ['Check that the database path is writable', 'Ensure sufficient disk space']
      ),
    };
  }
}

/**
 * Closes the database connection.
 *
 * Should be called when the application shuts down to ensure
 * clean termination of the database connection.
 *
 * @example
 * ```typescript
 * // In application shutdown
 * closeDatabase();
 * ```
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Runs all pending migrations.
 *
 * Migration process:
 * 1. Creates the _migrations tracking table if needed
 * 2. Queries already-applied migrations
 * 3. Runs pending migrations in order by ID
 * 4. Records each migration in the tracking table
 *
 * Migrations are run in a transaction to ensure atomicity.
 *
 * @param database - The database instance to migrate
 * @returns A Result indicating success or failure
 *
 * @internal
 */
function runMigrations(database: Database.Database): Result<void> {
  try {
    // Create migrations tracking table if it doesn't exist
    database.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get applied migrations
    const appliedMigrations = database
      .prepare('SELECT id FROM _migrations')
      .all() as { id: string }[];
    const appliedIds = new Set(appliedMigrations.map((m) => m.id));

    // Import and run migrations
    // Note: In a real app, you'd dynamically import all migration files
    // For now, we explicitly import the initial schema migration
    const migrations: Migration[] = [
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./migrations/001-initial-schema.js').migration,
    ];

    // Sort migrations by id to ensure correct order
    migrations.sort((a, b) => a.id.localeCompare(b.id));

    // Run pending migrations in a transaction
    const runMigration = database.transaction((migration: Migration) => {
      if (appliedIds.has(migration.id)) {
        return;
      }

      migration.up(database);

      database
        .prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)')
        .run(migration.id, migration.name);
    });

    for (const migration of migrations) {
      runMigration(migration);
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: new AppError(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_ERROR',
        ['Check migration files for syntax errors', 'Restore from backup if necessary']
      ),
    };
  }
}
