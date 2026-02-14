/**
 * Configuration loader - handles file-based config and environment variable overrides.
 *
 * Configuration is loaded in this order (later overrides earlier):
 * 1. Default values from schema.ts
 * 2. User config file (managed by conf package)
 * 3. Environment variables (POTA_*)
 *
 * Environment variables:
 * - POTA_CALLSIGN: Operator callsign
 * - POTA_GRID_SQUARE: Maidenhead grid locator
 * - POTA_HOME_LAT / POTA_HOME_LON: Home coordinates
 * - POTA_TIMEZONE: Timezone string
 * - POTA_UNITS: 'imperial' or 'metric'
 * - POTA_NO_COLOR: Disable colored output
 * - POTA_LOG_LEVEL: Log level (debug, info, warn, error)
 * - POTA_DATA_DIR: Custom data directory
 *
 * @module config/loader
 */

import Conf from 'conf';
import type { AppConfig } from '../types/index.js';
import {
  DEFAULT_CONFIG,
  DEFAULT_DATA_DIR,
} from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Type definition for the conf storage structure.
 */
type ConfigStore = Conf<{
  user: AppConfig['user'];
  display: AppConfig['display'];
  sync: AppConfig['sync'];
  logging: AppConfig['logging'];
  data: AppConfig['data'];
}>;

/** Config storage singleton */
let configStore: ConfigStore | null = null;

/**
 * Gets or creates the config store singleton.
 *
 * Creates the data directory if it doesn't exist.
 *
 * @returns The Conf store instance
 *
 * @internal
 */
function getConfigStore(): ConfigStore {
  if (!configStore) {
    // Ensure data directory exists
    if (!existsSync(DEFAULT_DATA_DIR)) {
      mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
    }

    configStore = new Conf<{
      user: AppConfig['user'];
      display: AppConfig['display'];
      sync: AppConfig['sync'];
      logging: AppConfig['logging'];
      data: AppConfig['data'];
    }>({
      configName: 'config',
      projectName: 'pota',
      projectSuffix: '',
      defaults: DEFAULT_CONFIG,
    });
  }
  return configStore;
}

/**
 * Loads configuration with defaults and environment variable overrides.
 *
 * Merges configuration in order:
 * 1. Default values
 * 2. Stored user preferences
 * 3. Environment variable overrides
 *
 * @returns The complete AppConfig object
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * console.log(`Callsign: ${config.user.callsign}`);
 * console.log(`Database: ${config.data.databasePath}`);
 * ```
 */
export function loadConfig(): AppConfig {
  const store = getConfigStore();
  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as AppConfig;

  // Load from store
  const storedUser = store.get('user');
  const storedDisplay = store.get('display');
  const storedSync = store.get('sync');
  const storedLogging = store.get('logging');
  const storedData = store.get('data');

  if (storedUser) config.user = { ...config.user, ...storedUser };
  if (storedDisplay) config.display = { ...config.display, ...storedDisplay };
  if (storedSync) config.sync = { ...config.sync, ...storedSync };
  if (storedLogging) config.logging = { ...config.logging, ...storedLogging };
  if (storedData) config.data = { ...config.data, ...storedData };

  // Apply environment variable overrides
  config = applyEnvOverrides(config);

  return config;
}

/**
 * Applies environment variable overrides to configuration.
 *
 * Processes POTA_* environment variables and applies them
 * to the appropriate config sections.
 *
 * @param config - Base configuration to override
 * @returns Configuration with env var overrides applied
 *
 * @internal
 */
function applyEnvOverrides(config: AppConfig): AppConfig {
  const envOverrides: Partial<AppConfig> = {};

  // User config env vars
  if (process.env.POTA_CALLSIGN) {
    envOverrides.user = { ...config.user, callsign: process.env.POTA_CALLSIGN };
  }
  if (process.env.POTA_GRID_SQUARE) {
    envOverrides.user = {
      ...(envOverrides.user ?? config.user),
      gridSquare: process.env.POTA_GRID_SQUARE.toUpperCase(),
    };
  }
  if (process.env.POTA_HOME_LAT) {
    const lat = parseFloat(process.env.POTA_HOME_LAT);
    if (!isNaN(lat)) {
      envOverrides.user = { ...(envOverrides.user ?? config.user), homeLatitude: lat };
    }
  }
  if (process.env.POTA_HOME_LON) {
    const lon = parseFloat(process.env.POTA_HOME_LON);
    if (!isNaN(lon)) {
      envOverrides.user = { ...(envOverrides.user ?? config.user), homeLongitude: lon };
    }
  }
  if (process.env.POTA_TIMEZONE) {
    envOverrides.user = { ...(envOverrides.user ?? config.user), timezone: process.env.POTA_TIMEZONE };
  }
  if (process.env.POTA_UNITS) {
    const units = process.env.POTA_UNITS.toLowerCase();
    if (units === 'imperial' || units === 'metric') {
      envOverrides.user = { ...(envOverrides.user ?? config.user), units };
    }
  }

  // Display config env vars
  if (process.env.POTA_NO_COLOR === '1' || process.env.POTA_NO_COLOR === 'true') {
    envOverrides.display = { ...config.display, color: false };
  }

  // Logging config env vars
  if (process.env.POTA_LOG_LEVEL) {
    const level = process.env.POTA_LOG_LEVEL.toLowerCase();
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      envOverrides.logging = { ...config.logging, level: level as AppConfig['logging']['level'] };
    }
  }

  // Data directory override
  if (process.env.POTA_DATA_DIR) {
    envOverrides.data = {
      databasePath: join(process.env.POTA_DATA_DIR, 'pota.db'),
      cacheDirectory: join(process.env.POTA_DATA_DIR, 'cache'),
      exportDirectory: join(process.env.POTA_DATA_DIR, 'exports'),
    };
  }

  // Merge overrides
  if (envOverrides.user) config.user = { ...config.user, ...envOverrides.user };
  if (envOverrides.display) config.display = { ...config.display, ...envOverrides.display };
  if (envOverrides.logging) config.logging = { ...config.logging, ...envOverrides.logging };
  if (envOverrides.data) config.data = { ...config.data, ...envOverrides.data };

  return config;
}

/**
 * Sets a configuration value.
 *
 * Supports dot-notation keys for nested values (e.g., 'user.callsign').
 *
 * @param key - Configuration key (e.g., 'user.callsign', 'display.color')
 * @param value - Value to set
 * @throws Error if the key format is invalid
 *
 * @example
 * ```typescript
 * setConfigValue('user.callsign', 'W1AW');
 * setConfigValue('display.color', false);
 * ```
 */
export function setConfigValue(key: string, value: string | number | boolean): void {
  const store = getConfigStore();
  const keyPath = key.split('.');

  if (keyPath.length === 1) {
    store.set(keyPath[0] as keyof AppConfig, value);
  } else if (keyPath.length === 2) {
    const [section, subkey] = keyPath as [keyof AppConfig, string];
    const sectionData = store.get(section) as Record<string, unknown>;
    sectionData[subkey] = value;
    store.set(section, sectionData);
  } else {
    throw new Error(`Invalid config key: ${key}`);
  }
}

/**
 * Gets a configuration value.
 *
 * Supports dot-notation keys for nested values.
 *
 * @param key - Configuration key (e.g., 'user.callsign')
 * @returns The configuration value, or undefined if not found
 *
 * @example
 * ```typescript
 * const callsign = getConfigValue('user.callsign');
 * console.log(callsign); // 'W1AW'
 * ```
 */
export function getConfigValue(key: string): unknown {
  const store = getConfigStore();
  const keyPath = key.split('.');

  if (keyPath.length === 1) {
    return store.get(keyPath[0] as keyof AppConfig);
  } else if (keyPath.length === 2) {
    const [section, subkey] = keyPath as [keyof AppConfig, string];
    const sectionData = store.get(section) as Record<string, unknown>;
    return sectionData?.[subkey];
  }

  return undefined;
}

/**
 * Checks if this is the first run (no user configuration set).
 *
 * Determines first-run status by checking if a callsign has been configured.
 *
 * @returns True if no user configuration exists
 *
 * @example
 * ```typescript
 * if (isFirstRun()) {
 *   // Show welcome/setup wizard
 * }
 * ```
 */
export function isFirstRun(): boolean {
  const store = getConfigStore();
  const user = store.get('user');
  return !user?.callsign;
}

/**
 * Initializes configuration with user profile data.
 *
 * Called during first-run setup to store the user's information.
 * Also creates necessary data directories.
 *
 * @param profile - User profile data
 * @param profile.callsign - Amateur radio callsign (required)
 * @param profile.gridSquare - Maidenhead grid locator
 * @param profile.homeLatitude - Home latitude coordinate
 * @param profile.homeLongitude - Home longitude coordinate
 * @param profile.units - Unit system ('imperial' or 'metric')
 *
 * @example
 * ```typescript
 * initConfig({
 *   callsign: 'W1AW',
 *   gridSquare: 'FN31pr',
 *   homeLatitude: 41.7148,
 *   homeLongitude: -72.7272,
 *   units: 'imperial'
 * });
 * ```
 */
export function initConfig(profile: {
  callsign: string;
  gridSquare?: string;
  homeLatitude?: number;
  homeLongitude?: number;
  units?: 'imperial' | 'metric';
}): void {
  const store = getConfigStore();

  store.set('user', {
    callsign: profile.callsign.toUpperCase(),
    gridSquare: profile.gridSquare?.toUpperCase() ?? null,
    homeLatitude: profile.homeLatitude ?? null,
    homeLongitude: profile.homeLongitude ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    units: profile.units ?? 'imperial',
  });

  // Ensure directories exist
  const config = loadConfig();
  for (const dir of [config.data.cacheDirectory, config.data.exportDirectory]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Gets the path to the configuration file.
 *
 * Useful for displaying to users where their config is stored.
 *
 * @returns Absolute path to the config file
 *
 * @example
 * ```typescript
 * console.log(`Config file: ${getConfigPath()}`);
 * ```
 */
export function getConfigPath(): string {
  const store = getConfigStore();
  return store.path;
}
