// Configuration loader - handles file-based config and env var overrides

import Conf from 'conf';
import type { AppConfig } from '../types/index.js';
import {
  DEFAULT_CONFIG,
  DEFAULT_DATA_DIR,
} from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Config type for Conf storage
type ConfigStore = Conf<{
  user: AppConfig['user'];
  display: AppConfig['display'];
  sync: AppConfig['sync'];
  logging: AppConfig['logging'];
  data: AppConfig['data'];
}>;

// Config storage using conf package
let configStore: ConfigStore | null = null;

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
 * Load configuration with defaults and env var overrides
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
 * Apply environment variable overrides to config
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
 * Save configuration value
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
 * Get configuration value
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
 * Check if this is first run (no config set)
 */
export function isFirstRun(): boolean {
  const store = getConfigStore();
  const user = store.get('user');
  return !user?.callsign;
}

/**
 * Initialize config with user profile
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
 * Get config file path
 */
export function getConfigPath(): string {
  const store = getConfigStore();
  return store.path;
}
