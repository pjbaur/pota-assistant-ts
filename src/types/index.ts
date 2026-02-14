// Core domain types for POTA Activation Planner

// Park types
export interface Park {
  id: number;
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  gridSquare: string | null;
  state: string | null;
  country: string | null;
  region: string | null;
  parkType: string | null;
  isActive: boolean;
  potaUrl: string | null;
  syncedAt: Date;
}

export interface ParkSearchResult {
  parks: Park[];
  total: number;
  staleWarning?: string;
}

// Plan types
export type PlanStatus = 'draft' | 'finalized' | 'completed' | 'cancelled';

export interface Plan {
  id: number;
  parkId: number;
  status: PlanStatus;
  plannedDate: string; // YYYY-MM-DD
  plannedTime: string | null; // HH:MM
  durationHours: number | null;
  presetId: string | null;
  notes: string | null;
  weatherCache: string | null; // JSON
  bandsCache: string | null; // JSON
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanWithPark extends Plan {
  park: Park;
}

export interface PlanCreateInput {
  parkReference: string;
  plannedDate: string;
  plannedTime?: string | null;
  durationHours?: number | null;
  presetId?: string | null;
  notes?: string | null;
  weatherCache?: string | null;
  bandsCache?: string | null;
}

export interface PlanUpdateInput {
  plannedDate?: string;
  plannedTime?: string | null;
  durationHours?: number | null;
  presetId?: string | null;
  notes?: string | null;
  status?: PlanStatus;
}

// Weather types
export interface WeatherForecast {
  location: {
    lat: number;
    lon: number;
  };
  fetchedAt: string;
  staleWarning?: string;
  forecasts: DailyForecast[];
}

export interface DailyForecast {
  date: string;
  highTemp: number;
  lowTemp: number;
  precipitationChance: number;
  windSpeed: number;
  windDirection: string;
  conditions: string;
  sunrise?: string;
  sunset?: string;
}

// Band recommendation types
export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night';

export type BandRating = 'excellent' | 'good' | 'fair' | 'poor';

export interface BandRecommendation {
  timeSlot: string;
  band: string;
  mode: string;
  rating: BandRating;
  notes: string;
}

export interface BandConditions {
  date: string;
  recommendations: BandRecommendation[];
  disclaimer: string;
}

export interface SeasonalAdjustment {
  bands: string[];
  boost: boolean;
}

// Equipment preset types (hardcoded for MVP)
export type PresetId = 'qrp-portable' | 'standard-portable' | 'mobile-high-power';

export interface EquipmentPreset {
  id: PresetId;
  name: string;
  description: string;
  maxPower: number;
  items: EquipmentItem[];
}

export interface EquipmentItem {
  type: 'radio' | 'antenna' | 'power' | 'accessory';
  name: string;
  description?: string;
  quantity?: number;
}

// Config types
export type Units = 'imperial' | 'metric';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type TableStyle = 'rounded' | 'sharp' | 'minimal' | 'none';

export interface UserConfig {
  callsign: string | null;
  gridSquare: string | null;
  homeLatitude: number | null;
  homeLongitude: number | null;
  timezone: string;
  units: Units;
}

export interface DisplayConfig {
  color: boolean;
  tableStyle: TableStyle;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface SyncConfig {
  autoSync: boolean;
  syncIntervalHours: number;
  parkRegions: string[];
}

export interface LoggingConfig {
  level: LogLevel;
  file: string | null;
  maxSizeMb: number;
}

export interface AppConfig {
  user: UserConfig;
  display: DisplayConfig;
  sync: SyncConfig;
  logging: LoggingConfig;
  data: {
    databasePath: string;
    cacheDirectory: string;
    exportDirectory: string;
  };
}

// Result type for error handling
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestions?: string[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Export format types
export type ExportFormat = 'markdown' | 'text' | 'json';

// Cache metadata
export interface CacheMetadata {
  fetchedAt: Date;
  expiresAt: Date;
  isStale: boolean;
}
