// Park command - search and show parks

import { Command } from 'commander';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { validateParkRef, validateStateCode, validateLimit } from '../utils/validators.js';
import { getErrorSuggestions } from '../utils/index.js';
import { error, warning } from '../ui/status.js';
import { formatParkCard, formatParkList } from '../ui/formatters.js';
import * as parkService from '../services/park-service.js';

export function registerParkCommand(
  program: Command,
  _config: AppConfig,
  _logger: Logger
): void {
  const parkCmd = program
    .command('park')
    .description('Park search and information commands');

  // pota park search <query>
  parkCmd
    .command('search <query>')
    .description('Search for parks by name or reference')
    .option('-s, --state <state>', 'Filter by state code (e.g., WA, CA)')
    .option('-l, --limit <number>', 'Maximum number of results', '20')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (query: string, options) => {
      try {
        // Validate options
        const limitResult = validateLimit(options.limit);
        if (!limitResult.success) {
          error(limitResult.error.message, getErrorSuggestions(limitResult.error));
          process.exit(1);
        }

        let stateCode: string | undefined;
        if (options.state) {
          const stateResult = validateStateCode(options.state);
          if (!stateResult.success) {
            error(stateResult.error.message, getErrorSuggestions(stateResult.error));
            process.exit(1);
          }
          stateCode = stateResult.data;
        }

        const result = await parkService.searchParks(query, {
          state: stateCode,
          limit: limitResult.data,
        });

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        if (result.data.parks.length === 0) {
          warning(`No parks found matching "${query}"`, [
            'Try a different search term',
            'Check the spelling',
            'Run "pota sync parks" to update the database',
          ]);
          return;
        }

        if (result.data.staleWarning) {
          warning(result.data.staleWarning);
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result.data.parks, null, 2));
        } else {
          console.log(formatParkList(result.data.parks));
          console.log(`\nFound ${result.data.parks.length} of ${result.data.total} parks`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Search failed: ${msg}`, [
          'Check your internet connection',
          'Try running "pota sync parks" first',
        ]);
        process.exit(1);
      }
    });

  // pota park show <ref>
  parkCmd
    .command('show <reference>')
    .description('Show detailed information for a park')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (reference: string, options) => {
      try {
        const refResult = validateParkRef(reference);
        if (!refResult.success) {
          error(refResult.error.message, getErrorSuggestions(refResult.error));
          process.exit(1);
        }

        const parkResult = await parkService.getParkByReference(refResult.data);

        if (!parkResult.success) {
          error(parkResult.error.message, getErrorSuggestions(parkResult.error));
          process.exit(1);
        }

        if (!parkResult.data) {
          error(`Park not found: ${reference}`, [
            'Check the reference format (e.g., K-0039)',
            'Run "pota park search <query>" to find parks',
            'Run "pota sync parks" to update the database',
          ]);
          process.exit(1);
        }

        const staleWarning = parkService.getStaleWarning();
        if (staleWarning) {
          warning(staleWarning);
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(parkResult.data, null, 2));
        } else {
          console.log(formatParkCard(parkResult.data));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to show park: ${msg}`);
        process.exit(1);
      }
    });
}
