// Data layer barrel export

// Database connection
export { getDatabase, closeDatabase } from './database.js';
export type { Migration } from './database.js';

// Migrations (for explicit import if needed)
export { migration as initialSchemaMigration } from './migrations/001-initial-schema.js';

// Repositories
export * as parkRepository from './repositories/park-repository.js';
export * as planRepository from './repositories/plan-repository.js';
export * as weatherCacheRepository from './repositories/weather-cache-repository.js';

// Re-export types from repositories for convenience
export type { ParkUpsertInput, ParkSearchOptions } from './repositories/park-repository.js';
export type { PlanFindOptions } from './repositories/plan-repository.js';
export type { WeatherCacheEntry, WeatherCacheInput } from './repositories/weather-cache-repository.js';
