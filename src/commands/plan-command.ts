// Plan command - manage activation plans

import { Command } from 'commander';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { validateParkRef, validateDate } from '../utils/validators.js';
import { getErrorSuggestions } from '../utils/index.js';
import { success, error } from '../ui/status.js';
import { formatPlanCard, formatPlanList } from '../ui/formatters.js';
import * as parkService from '../services/park-service.js';
import * as planRepository from '../data/repositories/plan-repository.js';
import { getForecast } from '../services/weather-service.js';
import { getBandConditions } from '../services/band-service.js';
import { isValidPresetId, getPresetOptions } from '../services/equipment-presets.js';
import { exportPlan } from '../services/export-service.js';
import { promptSelect, promptConfirm } from '../ui/prompts.js';

export function registerPlanCommand(
  program: Command,
  config: AppConfig,
  _logger: Logger
): void {
  const planCmd = program
    .command('plan')
    .description('Activation plan management commands');

  // pota plan create <ref> --date YYYY-MM-DD
  planCmd
    .command('create <parkRef>')
    .description('Create a new activation plan')
    .requiredOption('-d, --date <date>', 'Activation date (YYYY-MM-DD)')
    .option('-t, --time <time>', 'Start time (HH:MM)')
    .option('--duration <hours>', 'Expected duration in hours')
    .option('-p, --preset <preset>', 'Equipment preset (qrp-portable, standard-portable, mobile-high-power)')
    .option('--notes <notes>', 'Additional notes')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (parkRef: string, options) => {
      try {
        // Validate park reference
        const refResult = validateParkRef(parkRef);
        if (!refResult.success) {
          error(refResult.error.message, getErrorSuggestions(refResult.error));
          process.exit(1);
        }

        // Validate date
        const dateResult = validateDate(options.date, { allowPast: false });
        if (!dateResult.success) {
          error(dateResult.error.message, getErrorSuggestions(dateResult.error));
          process.exit(1);
        }

        // Validate or prompt for preset
        let presetId: string | undefined;
        if (options.preset) {
          if (!isValidPresetId(options.preset)) {
            error(`Invalid preset: ${options.preset}`, [
              'Available presets:',
              ...getPresetOptions().map(p => `  - ${p.value}: ${p.description}`),
            ]);
            process.exit(1);
          }
          presetId = options.preset;
        } else {
          // Prompt for preset selection
          const presetOptions = getPresetOptions();
          const selected = await promptSelect(
            'Select equipment preset:',
            presetOptions.map(p => `${p.value} - ${p.description}`)
          );
          presetId = selected.split(' - ')[0];
        }

        // Get park
        const parkResult = await parkService.getParkByReference(refResult.data);
        if (!parkResult.success) {
          error(parkResult.error.message, getErrorSuggestions(parkResult.error));
          process.exit(1);
        }
        if (!parkResult.data) {
          error(`Park not found: ${refResult.data}`);
          process.exit(1);
        }

        // Get weather and band conditions
        let weatherCache: string | null = null;
        let bandsCache: string | null = null;
        try {
          const forecast = await getForecast(
            parkResult.data.latitude,
            parkResult.data.longitude,
            dateResult.data
          );
          weatherCache = JSON.stringify(forecast);
        } catch {
          // Continue without weather
        }

        try {
          const conditions = getBandConditions(dateResult.data);
          bandsCache = JSON.stringify(conditions);
        } catch {
          // Continue without band conditions
        }

        // Create plan - use direct repository
        const createInput = {
          parkReference: refResult.data,
          status: 'draft' as const,
          plannedDate: dateResult.data,
          plannedTime: options.time ?? null,
          durationHours: options.duration ? parseFloat(options.duration) : null,
          presetId: presetId ?? null,
          notes: options.notes ?? null,
          weatherCache,
          bandsCache,
        };

        const createResult = planRepository.create(createInput);

        if (!createResult.success) {
          error(createResult.error.message, getErrorSuggestions(createResult.error));
          process.exit(1);
        }

        // Get plan with park
        const planWithParkResult = planRepository.findByIdWithPark(createResult.data.id);
        if (!planWithParkResult.success || !planWithParkResult.data) {
          error('Failed to retrieve created plan');
          process.exit(1);
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(planWithParkResult.data, null, 2));
        } else {
          success(`Plan created successfully: Plan #${createResult.data.id}`);
          console.log(formatPlanCard(planWithParkResult.data));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to create plan: ${msg}`);
        process.exit(1);
      }
    });

  // pota plan list
  planCmd
    .command('list')
    .description('List all activation plans')
    .option('--status <status>', 'Filter by status (draft, finalized, completed)')
    .option('--upcoming', 'Show only upcoming plans')
    .option('-l, --limit <number>', 'Maximum number of results', '20')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action((options) => {
      try {
        const result = planRepository.findAllWithPark({
          status: options.status,
          upcoming: options.upcoming,
          limit: parseInt(options.limit, 10),
        });

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        if (result.data.length === 0) {
          console.log('No plans found.');
          console.log('Create a plan with: pota plan create <parkRef> --date YYYY-MM-DD');
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(formatPlanList(result.data));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to list plans: ${msg}`);
        process.exit(1);
      }
    });

  // pota plan show <id>
  planCmd
    .command('show <id>')
    .description('Show detailed information for a plan')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action((id: string, options) => {
      try {
        const planId = parseInt(id, 10);
        if (isNaN(planId)) {
          error('Invalid plan ID. Must be a number.');
          process.exit(1);
        }

        const result = planRepository.findByIdWithPark(planId);

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        if (!result.data) {
          error(`Plan not found: ${id}`, ['Run "pota plan list" to see all plans']);
          process.exit(1);
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(formatPlanCard(result.data));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to show plan: ${msg}`);
        process.exit(1);
      }
    });

  // pota plan edit <id>
  planCmd
    .command('edit <id>')
    .description('Edit an existing plan')
    .option('-d, --date <date>', 'New activation date (YYYY-MM-DD)')
    .option('-t, --time <time>', 'New start time (HH:MM)')
    .option('--duration <hours>', 'New duration in hours')
    .option('-p, --preset <preset>', 'New equipment preset')
    .option('--notes <notes>', 'New notes')
    .option('--status <status>', 'New status (draft, finalized, completed, cancelled)')
    .action((id: string, options) => {
      try {
        const planId = parseInt(id, 10);
        if (isNaN(planId)) {
          error('Invalid plan ID. Must be a number.');
          process.exit(1);
        }

        const updates: Record<string, unknown> = {};

        if (options.date) {
          const dateResult = validateDate(options.date, { allowPast: false });
          if (!dateResult.success) {
            error(dateResult.error.message, getErrorSuggestions(dateResult.error));
            process.exit(1);
          }
          updates.plannedDate = dateResult.data;
        }

        if (options.time !== undefined) updates.plannedTime = options.time;
        if (options.duration !== undefined) updates.durationHours = parseFloat(options.duration);
        if (options.preset) {
          if (!isValidPresetId(options.preset)) {
            error(`Invalid preset: ${options.preset}`);
            process.exit(1);
          }
          updates.presetId = options.preset;
        }
        if (options.notes !== undefined) updates.notes = options.notes;
        if (options.status) updates.status = options.status;

        const result = planRepository.update(planId, updates);

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        const planWithParkResult = planRepository.findByIdWithPark(planId);
        if (!planWithParkResult.success || !planWithParkResult.data) {
          error('Failed to retrieve updated plan');
          process.exit(1);
        }

        success(`Plan #${planId} updated successfully`);
        console.log(formatPlanCard(planWithParkResult.data));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to edit plan: ${msg}`);
        process.exit(1);
      }
    });

  // pota plan delete <id>
  planCmd
    .command('delete <id>')
    .description('Delete a plan')
    .option('--force', 'Skip confirmation prompt')
    .action(async (id: string, options) => {
      try {
        const planId = parseInt(id, 10);
        if (isNaN(planId)) {
          error('Invalid plan ID. Must be a number.');
          process.exit(1);
        }

        if (!options.force) {
          const confirmed = await promptConfirm(
            `Are you sure you want to delete plan #${planId}?`,
            false
          );
          if (!confirmed) {
            console.log('Cancelled.');
            return;
          }
        }

        const result = planRepository.deletePlan(planId);

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        success(`Plan #${planId} deleted successfully`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to delete plan: ${msg}`);
        process.exit(1);
      }
    });

  // pota plan export <id>
  planCmd
    .command('export <id>')
    .description('Export a plan to a file')
    .requiredOption('-f, --format <format>', 'Output format (markdown, text, json)')
    .requiredOption('-o, --output <path>', 'Output file path')
    .action((id: string, options) => {
      try {
        const planId = parseInt(id, 10);
        if (isNaN(planId)) {
          error('Invalid plan ID. Must be a number.');
          process.exit(1);
        }

        if (!['markdown', 'text', 'json'].includes(options.format)) {
          error(`Invalid format: ${options.format}`, [
            'Supported formats: markdown, text, json',
          ]);
          process.exit(1);
        }

        const result = planRepository.findByIdWithPark(planId);

        if (!result.success) {
          error(result.error.message, getErrorSuggestions(result.error));
          process.exit(1);
        }

        if (!result.data) {
          error(`Plan not found: ${id}`);
          process.exit(1);
        }

        const exportResult = exportPlan(result.data, {
          format: options.format,
          outputPath: options.output,
          callsign: config.user.callsign ?? undefined,
          gridSquare: config.user.gridSquare ?? undefined,
        });

        if (!exportResult.success) {
          error(`Export failed: ${exportResult.error}`);
          process.exit(1);
        }

        success(`Plan exported to: ${exportResult.path}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to export plan: ${msg}`);
        process.exit(1);
      }
    });
}
