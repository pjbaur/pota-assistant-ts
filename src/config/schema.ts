// Configuration schema and defaults

import type {
  AppConfig,
  DisplayConfig,
  LoggingConfig,
  SyncConfig,
  UserConfig,
} from '../types/index.js';
import { homedir } from 'os';
import { join } from 'path';

export const DEFAULT_DATA_DIR = join(homedir(), '.pota');

export const DEFAULT_USER_CONFIG: UserConfig = {
  callsign: null,
  gridSquare: null,
  homeLatitude: null,
  homeLongitude: null,
  timezone: 'UTC',
  units: 'imperial',
};

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  color: true,
  tableStyle: 'rounded',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
};

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSync: true,
  syncIntervalHours: 24,
  parkRegions: ['US'],
};

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  file: null,
  maxSizeMb: 10,
};

export const DEFAULT_CONFIG: AppConfig = {
  user: DEFAULT_USER_CONFIG,
  display: DEFAULT_DISPLAY_CONFIG,
  sync: DEFAULT_SYNC_CONFIG,
  logging: DEFAULT_LOGGING_CONFIG,
  data: {
    databasePath: join(DEFAULT_DATA_DIR, 'pota.db'),
    cacheDirectory: join(DEFAULT_DATA_DIR, 'cache'),
    exportDirectory: join(DEFAULT_DATA_DIR, 'exports'),
  },
};

// Environment variable mappings
export const ENV_VAR_MAPPINGS: Record<string, string> = {
  POTA_CALLSIGN: 'user.callsign',
  POTA_GRID_SQUARE: 'user.gridSquare',
  POTA_HOME_LAT: 'user.homeLatitude',
  POTA_HOME_LON: 'user.homeLongitude',
  POTA_TIMEZONE: 'user.timezone',
  POTA_UNITS: 'user.units',
  POTA_NO_COLOR: 'display.color',
  POTA_LOG_LEVEL: 'logging.level',
  POTA_DATA_DIR: 'dataDir',
};

// Config schema for validation
export const CONFIG_SCHEMA = {
  user: {
    callsign: { type: 'string', nullable: true, pattern: /^[A-Z0-9]{3,6}$/ },
    gridSquare: {
      type: 'string',
      nullable: true,
      pattern: /^[A-R]{2}[0-9]{2}([a-x]{2})?$/i,
    },
    homeLatitude: { type: 'number', nullable: true, min: -90, max: 90 },
    homeLongitude: { type: 'number', nullable: true, min: -180, max: 180 },
    timezone: { type: 'string', default: 'UTC' },
    units: { type: 'string', enum: ['imperial', 'metric'], default: 'imperial' },
  },
  display: {
    color: { type: 'boolean', default: true },
    tableStyle: {
      type: 'string',
      enum: ['rounded', 'sharp', 'minimal', 'none'],
      default: 'rounded',
    },
    dateFormat: { type: 'string', default: 'YYYY-MM-DD' },
    timeFormat: { type: 'string', enum: ['12h', '24h'], default: '24h' },
  },
  sync: {
    autoSync: { type: 'boolean', default: true },
    syncIntervalHours: { type: 'number', default: 24, min: 1, max: 168 },
    parkRegions: { type: 'array', default: ['US'] },
  },
  logging: {
    level: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    file: { type: 'string', nullable: true },
    maxSizeMb: { type: 'number', default: 10, min: 1, max: 100 },
  },
};
