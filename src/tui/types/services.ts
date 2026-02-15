/**
 * Service adapter interfaces for TUI data fetching.
 *
 * These interfaces abstract the service layer to make
 * testing and mocking easier.
 *
 * @module tui/types/services
 */

import type { Result } from '../../types/index.js';
import type { Park, ParkSearchResult, PlanWithPark, WeatherForecast, BandConditions } from '../../types/index.js';

/**
 * Service adapter for park operations.
 */
export interface ParkServiceAdapter {
  /** Search parks by query */
  search(query: string, options?: { state?: string; limit?: number }): Promise<Result<ParkSearchResult>>;

  /** Get a park by reference */
  getByReference(ref: string): Promise<Result<Park | null>>;

  /** Get count of parks in database */
  getCount(): Promise<Result<number>>;

  /** Check if any parks exist */
  hasParks(): boolean;
}

/**
 * Service adapter for plan operations.
 */
export interface PlanServiceAdapter {
  /** Get all plans with park data */
  getAll(options?: { status?: string; upcoming?: boolean; limit?: number }): Promise<Result<PlanWithPark[]>>;

  /** Get a plan by ID */
  getById(id: number): Promise<Result<PlanWithPark | null>>;

  /** Create a new plan */
  create(data: { parkReference: string; plannedDate: string; plannedTime?: string; durationHours?: number }): Promise<Result<PlanWithPark>>;

  /** Update a plan */
  update(id: number, data: Record<string, unknown>): Promise<Result<PlanWithPark>>;

  /** Delete a plan */
  delete(id: number): Promise<Result<boolean>>;
}

/**
 * Service adapter for weather operations.
 */
export interface WeatherServiceAdapter {
  /** Get forecast for a location and date */
  getForecast(lat: number, lon: number, date: string): Promise<Result<WeatherForecast>>;

  /** Get multi-day forecast for a location */
  getMultiDayForecast(lat: number, lon: number): Promise<Result<WeatherForecast>>;
}

/**
 * Service adapter for band condition operations.
 */
export interface BandServiceAdapter {
  /** Get band conditions for a date */
  getConditions(date: string): BandConditions;
}

/**
 * Combined service adapters for dependency injection.
 */
export interface ServiceAdapters {
  parks: ParkServiceAdapter;
  plans: PlanServiceAdapter;
  weather: WeatherServiceAdapter;
  bands: BandServiceAdapter;
}
