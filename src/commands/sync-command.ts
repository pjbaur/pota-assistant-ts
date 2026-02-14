/**
 * Sync command - synchronize data from external sources.
 *
 * Provides commands to download and update local data from:
 * - POTA.app API (park database)
 *
 * Data is cached locally for offline access.
 *
 * @module commands/sync-command
 */

import { Command } from 'commander';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { success, error, warning } from '../ui/status.js';
import { getErrorSuggestions } from '../utils/index.js';
import * as parkService from '../services/park-service.js';
import * as parkRepository from '../data/repositories/park-repository.js';

/**
 * Registers the sync command and its subcommands with the CLI program.
 *
 * Subcommands:
 * - `sync parks`: Download park data from POTA.app
 * - `sync all`: Sync all data sources
 *
 * @param program - The Commander program instance
 * @param _config - Application configuration (unused in this command)
 * @param _logger - Logger instance (unused in this command)
 *
 * @example
 * ```bash
 * pota sync parks --region US
 * pota sync parks --force
 * pota sync all
 * ```
 */
export function registerSyncCommand(
  program: Command,
  _config: AppConfig,
  _logger: Logger
): void {
  const syncCmd = program
    .command('sync')
    .description('Synchronize data from external sources');

  // pota sync parks
  syncCmd
    .command('parks')
    .description('Synchronize park database from POTA.app')
    .option('-r, --region <region>', 'Region to sync (e.g., US, CA, EU)', 'US')
    .option('--force', 'Force full resync (ignore cache)')
    .action(async (options) => {
      try {
        console.log(`Syncing parks for region: ${options.region}...`);
        console.log('This may take a few minutes on first sync.\n');

        const result = await parkService.syncParks({
          region: options.region,
          force: options.force,
        });

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        if (result.data.staleWarning) {
          warning(result.data.staleWarning);
        }

        success(`Synced ${result.data.count} parks successfully`);

        const lastSyncResult = parkRepository.getLastSyncTime();
        if (lastSyncResult.success && lastSyncResult.data) {
          console.log(`Last sync: ${lastSyncResult.data.toISOString()}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to sync parks: ${msg}`, [
          'Check your internet connection',
          'Try again in a few minutes',
          'The POTA API may be temporarily unavailable',
        ]);
        process.exit(1);
      }
    });

  // pota sync (all)
  syncCmd
    .command('all')
    .description('Sync all data sources')
    .option('-r, --region <region>', 'Region to sync (e.g., US, CA, EU)', 'US')
    .option('--force', 'Force full resync')
    .action(async (options) => {
      console.log('Syncing all data sources...\n');

      // Sync parks
      console.log('1. Syncing parks...');
      const result = await parkService.syncParks({
        region: options.region,
        force: options.force,
      });

      if (!result.success) {
        error(result.error.message, getErrorSuggestions(result.error));
        process.exit(1);
      }

      success(`  Synced ${result.data.count} parks`);

      console.log('\nSync complete!');
    });
}
