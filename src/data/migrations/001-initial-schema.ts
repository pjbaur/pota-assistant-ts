// Initial schema migration - creates all tables and indexes

import type Database from 'better-sqlite3';
import type { Migration } from '../database.js';

export const migration: Migration = {
  id: '001',
  name: 'initial-schema',

  up: (db: Database.Database): void => {
    // Parks table - stores POTA park information
    db.exec(`
      CREATE TABLE IF NOT EXISTS parks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        gridSquare TEXT,
        state TEXT,
        country TEXT,
        region TEXT,
        parkType TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        potaUrl TEXT,
        syncedAt TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT
      )
    `);

    // Plans table - stores activation plans
    db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parkId INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft', 'finalized', 'completed', 'cancelled')),
        plannedDate TEXT NOT NULL,
        plannedTime TEXT,
        durationHours REAL,
        presetId TEXT,
        notes TEXT,
        weatherCache TEXT,
        bandsCache TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parkId) REFERENCES parks(id) ON DELETE CASCADE
      )
    `);

    // Weather cache table - stores cached weather forecasts
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        forecastDate TEXT NOT NULL,
        data TEXT NOT NULL,
        fetchedAt TEXT NOT NULL DEFAULT (datetime('now')),
        expiresAt TEXT NOT NULL,
        UNIQUE (latitude, longitude, forecastDate)
      )
    `);

    // User config table - stores user preferences (single row)
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        callsign TEXT,
        gridSquare TEXT,
        homeLat REAL,
        homeLon REAL,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        units TEXT NOT NULL DEFAULT 'imperial'
          CHECK (units IN ('imperial', 'metric'))
      )
    `);

    // Create indexes for common query patterns
    // Parks indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_parks_reference ON parks(reference)
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_parks_state ON parks(state)
    `);

    // Plans indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_plans_plannedDate ON plans(plannedDate)
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_plans_parkId ON plans(parkId)
    `);

    // Weather cache index
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_weather_cache_lookup
        ON weather_cache(latitude, longitude, forecastDate)
    `);
  },
};
