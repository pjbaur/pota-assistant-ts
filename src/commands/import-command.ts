/**
 * Import command - import data from local files.
 *
 * Provides commands to import park data from CSV files,
 * useful for offline setup or when API is unavailable.
 *
 * @module commands/import-command
 */

import { Command } from 'commander';
import { existsSync } from 'fs';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { success, error, warning, info } from '../ui/status.js';
import { getErrorSuggestions } from '../utils/index.js';
import {
  importParksFromCsv,
  type CsvImportOptions,
} from '../services/csv-import-service.js';
import * as parkRepository from '../data/repositories/park-repository.js';

/**
 * Registers the import command and its subcommands with the CLI program.
 *
 * Subcommands:
 * - `import parks <file>`: Import park data from a CSV file
 *
 * @param program - The Commander program instance
 * @param _config - Application configuration (unused in this command)
 * @param _logger - Logger instance (unused in this command)
 *
 * @example
 * ```bash
 * pota import parks ./data/all_parks_ext.csv
 * pota import parks ./data/parks.csv --strict
 * pota import parks ./data/parks.csv -b 500 --show-warnings
 * ```
 */
export function registerImportCommand(
  program: Command,
  _config: AppConfig,
  _logger: Logger
): void {
  const importCmd = program
    .command('import')
    .description('Import data from local files');

  // pota import parks <file>
  importCmd
    .command('parks <file>')
    .description('Import park data from a CSV file')
    .option('-b, --batch-size <size>', 'Number of records to process per batch', '1000')
    .option('--strict', 'Fail on any invalid record instead of skipping')
    .option('--show-warnings', 'Display all warnings including skipped records')
    .action(async (file: string, options: { batchSize: string; strict: boolean; showWarnings: boolean }) => {
      try {
        // Validate file exists
        if (!existsSync(file)) {
          error(`File not found: ${file}`, [
            'Verify the file path is correct',
            'Use an absolute path if the file is in a different directory',
          ]);
          process.exit(1);
        }

        const batchSize = parseInt(options.batchSize, 10);
        if (isNaN(batchSize) || batchSize < 1) {
          error(`Invalid batch size: ${options.batchSize}`, [
            'Batch size must be a positive integer',
            'Default is 1000',
          ]);
          process.exit(1);
        }

        console.log(`Importing parks from: ${file}`);
        console.log(`Batch size: ${batchSize}`);
        if (options.strict) {
          console.log('Strict mode: enabled');
        }
        console.log('');

        const importOptions: CsvImportOptions = {
          filePath: file,
          batchSize,
          strict: options.strict,
          showWarnings: options.showWarnings,
          onProgress: (current: number) => {
            // Simple progress indicator
            if (current % 10000 === 0) {
              info(`Processed ${current.toLocaleString()} records...`);
            }
          },
        };

        const result = await importParksFromCsv(importOptions);

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        const { imported, skipped, warnings: importWarnings, durationMs } = result.data;

        // Display warnings if any
        if (importWarnings.length > 0) {
          warning(`${importWarnings.length} warnings during import`);
          if (options.showWarnings && importWarnings.length <= 10) {
            importWarnings.forEach(w => {
              console.log(`  Line ${w.lineNumber}: ${w.message}`);
            });
          } else if (options.showWarnings) {
            console.log('  (showing first 10)');
            importWarnings.slice(0, 10).forEach(w => {
              console.log(`  Line ${w.lineNumber}: ${w.message}`);
            });
            console.log(`  ... and ${importWarnings.length - 10} more`);
          }
          console.log('');
        }

        // Display summary
        success(`Imported ${imported.toLocaleString()} parks successfully`);

        if (skipped > 0) {
          warning(`Skipped ${skipped.toLocaleString()} invalid records`);
        }

        // Show timing
        const duration = durationMs < 1000
          ? `${durationMs}ms`
          : durationMs < 60000
            ? `${(durationMs / 1000).toFixed(1)}s`
            : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
        console.log(`Duration: ${duration}`);

        // Show total count
        const countResult = parkRepository.count();
        if (countResult.success) {
          console.log(`Total parks in database: ${countResult.data.toLocaleString()}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to import parks: ${msg}`, [
          'Verify the CSV file format is correct',
          'Check file permissions',
          'Ensure sufficient disk space',
        ]);
        process.exit(1);
      }
    });
}
