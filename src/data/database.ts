// Database connection and migration runner

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { loadConfig } from '../config/index.js';
import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

// Migration type definition
export interface Migration {
  id: string;
  name: string;
  up: (db: Database.Database) => void;
}

// Database singleton
let db: Database.Database | null = null;

/**
 * Get or create the database connection
 * Initializes the database and runs migrations on first call
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
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run all pending migrations
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
