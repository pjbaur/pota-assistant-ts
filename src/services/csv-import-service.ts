/**
 * CSV Import Service - orchestrates importing park data from CSV files.
 *
 * Handles streaming large CSV files for memory efficiency, transforms
 * CSV rows to park repository format, and performs batch upserts.
 *
 * @module services/csv-import-service
 */

import { createReadStream } from 'fs';
import readline from 'readline';
import * as parkRepository from '../data/repositories/park-repository.js';
import { parseCsvLine } from '../utils/csv-parser.js';
import { calculateGridSquare } from '../utils/grid-square.js';
import type { Result } from '../types/index.js';
import { AppError } from '../types/index.js';

/**
 * Raw CSV row structure from POTA all_parks_ext.csv file.
 */
export interface PotaCsvRow {
  reference: string;
  name: string;
  active: string; // "0" or "1"
  latitude: string;
  longitude: string;
  grid: string;
  entityId: string;
  locationDesc: string;
}

/**
 * Options for CSV import operations.
 */
export interface CsvImportOptions {
  /** Path to the CSV file */
  filePath: string;
  /** Number of records to batch together for database inserts (default: 1000) */
  batchSize?: number;
  /** Fail on any invalid record instead of continuing */
  strict?: boolean;
  /** Show all warnings including skipped records */
  showWarnings?: boolean;
  /** Callback for progress updates */
  onProgress?: (current: number, total: number | null) => void;
}

/**
 * Warning generated during CSV import.
 */
export interface CsvImportWarning {
  /** 1-based line number in the CSV file */
  lineNumber: number;
  /** Description of the issue */
  message: string;
  /** The raw line content (truncated if too long) */
  rawLine?: string;
}

/**
 * Result of a CSV import operation.
 */
export interface CsvImportResult {
  /** Number of parks successfully imported */
  imported: number;
  /** Number of parks skipped due to validation errors */
  skipped: number;
  /** Warnings generated during import */
  warnings: CsvImportWarning[];
  /** Total time taken in milliseconds */
  durationMs: number;
}

/**
 * Internal tracking for validation results.
 */
interface ValidationResult {
  valid: boolean;
  warnings: CsvImportWarning[];
}

/**
 * Extracts a US state code from a location description string.
 *
 * For parks spanning multiple states (e.g., "US-CA,US-NV"), returns
 * the first state code. For non-US parks, returns null.
 *
 * @param locationDesc - Location description from CSV (e.g., "US-CA,US-NV", "CA-ON")
 * @returns Two-letter state code or null
 *
 * @example
 * ```typescript
 * extractStateFromLocation('US-CA,US-NV'); // 'CA'
 * extractStateFromLocation('US-TX'); // 'TX'
 * extractStateFromLocation('CA-ON'); // null (Canadian park)
 * ```
 */
export function extractStateFromLocation(locationDesc: string): string | null {
  if (!locationDesc) {
    return null;
  }

  // Match US state pattern: US-XX where XX is a state code
  const usStatePattern = /US-([A-Z]{2})/g;
  const matches = locationDesc.matchAll(usStatePattern);

  const states: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      states.push(match[1]);
    }
  }

  // Return the first US state found
  return states.length > 0 ? states[0] ?? null : null;
}

/**
 * Validates a CSV row for required fields and data integrity.
 *
 * @param row - The parsed CSV row
 * @param lineNumber - The 1-based line number for error reporting
 * @returns Validation result with any warnings
 */
export function validateCsvRow(
  row: PotaCsvRow,
  lineNumber: number
): ValidationResult {
  const warnings: CsvImportWarning[] = [];

  // Check required fields
  if (!row.reference || row.reference.trim() === '') {
    warnings.push({
      lineNumber,
      message: 'Missing required field: reference',
    });
    return { valid: false, warnings };
  }

  if (!row.name || row.name.trim() === '') {
    warnings.push({
      lineNumber,
      message: `Missing required field: name for park ${row.reference}`,
    });
    return { valid: false, warnings };
  }

  // Validate coordinates
  const lat = parseFloat(row.latitude);
  const lon = parseFloat(row.longitude);

  if (isNaN(lat) || isNaN(lon)) {
    warnings.push({
      lineNumber,
      message: `Invalid coordinates for park ${row.reference}: lat=${row.latitude}, lon=${row.longitude}`,
    });
    return { valid: false, warnings };
  }

  // Check for suspicious coordinates (0,0) - common placeholder
  if (lat === 0 && lon === 0) {
    warnings.push({
      lineNumber,
      message: `Park ${row.reference} has coordinates at (0,0) - may be a placeholder`,
    });
  }

  // Validate latitude range
  if (lat < -90 || lat > 90) {
    warnings.push({
      lineNumber,
      message: `Invalid latitude for park ${row.reference}: ${lat}`,
    });
    return { valid: false, warnings };
  }

  // Validate longitude range
  if (lon < -180 || lon > 180) {
    warnings.push({
      lineNumber,
      message: `Invalid longitude for park ${row.reference}: ${lon}`,
    });
    return { valid: false, warnings };
  }

  return { valid: true, warnings };
}

/**
 * Transforms a validated CSV row to repository input format.
 *
 * @param row - The validated CSV row
 * @param lineNumber - Line number for metadata
 * @returns Park upsert input ready for database insertion
 */
export function transformCsvRowToRepository(
  row: PotaCsvRow,
  lineNumber: number
): parkRepository.ParkUpsertInput {
  const lat = parseFloat(row.latitude);
  const lon = parseFloat(row.longitude);

  // Calculate grid square if not provided
  const gridSquare = row.grid && row.grid.trim() !== ''
    ? row.grid.trim()
    : calculateGridSquare(lat, lon);

  // Extract state for US parks
  const state = extractStateFromLocation(row.locationDesc);

  // Generate POTA URL
  const potaUrl = `https://pota.app/#/park/${row.reference.toUpperCase()}`;

  // Build metadata JSON
  const metadata = {
    entityId: row.entityId || null,
    locationDesc: row.locationDesc || null,
    source: 'csv-import',
    importLineNumber: lineNumber,
  };

  return {
    reference: row.reference.toUpperCase(),
    name: row.name.trim(),
    latitude: lat,
    longitude: lon,
    gridSquare,
    state,
    country: null, // Not available in CSV
    region: null, // Not available in CSV
    parkType: null, // Not available in CSV
    isActive: row.active === '1',
    potaUrl,
    metadata: JSON.stringify(metadata),
  };
}

/**
 * Imports parks from a CSV file using streaming for memory efficiency.
 *
 * Reads the file line by line, validates each row, transforms to
 * repository format, and performs batch upserts to the database.
 *
 * @param options - Import options including file path and batch size
 * @returns Result with import statistics or error
 *
 * @example
 * ```typescript
 * const result = await importParksFromCsv({
 *   filePath: './data/all_parks_ext.csv',
 *   batchSize: 1000,
 *   onProgress: (current, total) => console.log(`${current} records processed`),
 * });
 * ```
 */
export async function importParksFromCsv(
  options: CsvImportOptions
): Promise<Result<CsvImportResult>> {
  const { filePath, batchSize = 1000, strict = false, showWarnings = false, onProgress } = options;

  const startTime = Date.now();
  const warnings: CsvImportWarning[] = [];
  const batch: parkRepository.ParkUpsertInput[] = [];

  let imported = 0;
  let skipped = 0;
  let lineNumber = 0;
  let headers: string[] = [];

  try {
    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      lineNumber++;

      // Skip header row
      if (lineNumber === 1) {
        headers = parseCsvLine(line);
        continue;
      }

      // Skip empty lines
      if (!line || line.trim() === '') {
        continue;
      }

      // Parse the CSV line
      const values = parseCsvLine(line);

      // Map to CSV row object
      const row: PotaCsvRow = {
        reference: values[0] ?? '',
        name: values[1] ?? '',
        active: values[2] ?? '1',
        latitude: values[3] ?? '',
        longitude: values[4] ?? '',
        grid: values[5] ?? '',
        entityId: values[6] ?? '',
        locationDesc: values[7] ?? '',
      };

      // Validate the row
      const validation = validateCsvRow(row, lineNumber);

      if (validation.warnings.length > 0) {
        warnings.push(...validation.warnings);
      }

      if (!validation.valid) {
        skipped++;
        if (strict) {
          // In strict mode, fail on first error
          rl.close();
          fileStream.destroy();
          return {
            success: false,
            error: new AppError(
              `Import failed at line ${lineNumber}: ${validation.warnings[0]?.message}`,
              'CSV_IMPORT_STRICT_ERROR',
              ['Fix the CSV data', 'Remove --strict flag to continue on errors']
            ),
          };
        }
        continue;
      }

      // Transform to repository input
      const repoInput = transformCsvRowToRepository(row, lineNumber);
      batch.push(repoInput);

      // Process batch when full
      if (batch.length >= batchSize) {
        const upsertResult = parkRepository.upsertMany([...batch]);
        if (!upsertResult.success) {
          rl.close();
          fileStream.destroy();
          return {
            success: false,
            error: new AppError(
              `Failed to import batch at line ${lineNumber}: ${upsertResult.error.message}`,
              'CSV_IMPORT_BATCH_ERROR',
              ['Check database permissions', 'Ensure sufficient disk space']
            ),
          };
        }
        imported += batch.length;
        batch.length = 0; // Clear batch

        // Report progress
        if (onProgress) {
          onProgress(imported, null);
        }
      }
    }

    // Process remaining records in the final batch
    if (batch.length > 0) {
      const upsertResult = parkRepository.upsertMany(batch);
      if (!upsertResult.success) {
        return {
          success: false,
          error: new AppError(
            `Failed to import final batch: ${upsertResult.error.message}`,
            'CSV_IMPORT_BATCH_ERROR',
            ['Check database permissions', 'Ensure sufficient disk space']
          ),
        };
      }
      imported += batch.length;
    }

    // Filter warnings if not showing all
    const displayWarnings = showWarnings ? warnings : warnings.filter(w =>
      w.message.includes('(0,0)') === false // Only hide (0,0) warnings by default
    );

    return {
      success: true,
      data: {
        imported,
        skipped,
        warnings: displayWarnings,
        durationMs: Date.now() - startTime,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: new AppError(
        `Failed to import CSV file: ${message}`,
        'CSV_IMPORT_ERROR',
        [
          'Verify the file path is correct',
          'Check file permissions',
          'Ensure the file is valid CSV format',
        ]
      ),
    };
  }
}
