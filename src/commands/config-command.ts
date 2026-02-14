// Config command - manage configuration

import { Command } from 'commander';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import { success, error } from '../ui/status.js';
import {
  loadConfig,
  setConfigValue,
  initConfig,
  getConfigPath,
} from '../config/index.js';
import { promptText, promptSelect, promptConfirm } from '../ui/prompts.js';
import { validateCallsign, validateGridSquare } from '../utils/validators.js';

export function registerConfigCommand(
  program: Command,
  _config: AppConfig,
  _logger: Logger
): void {
  const configCmd = program
    .command('config')
    .description('Configuration management commands');

  // pota config init
  configCmd
    .command('init')
    .description('Initialize configuration with interactive setup')
    .action(async () => {
      try {
        console.log('Welcome to POTA Activation Planner!\n');
        console.log("Let's set up your operator profile.\n");

        // Prompt for callsign
        let callsign = await promptText('Enter your callsign (e.g., W1ABC):');
        const callsignResult = validateCallsign(callsign);
        if (!callsignResult.success) {
          console.log(`Warning: ${callsignResult.error.message}`);
          const continueAnyway = await promptConfirm('Continue anyway?', false);
          if (!continueAnyway) {
            console.log('Cancelled.');
            return;
          }
        }

        // Prompt for grid square
        const gridSquare = await promptText(
          'Enter your grid square (e.g., FN42) or press Enter to skip:',
          ''
        );
        if (gridSquare) {
          const gridResult = validateGridSquare(gridSquare);
          if (!gridResult.success) {
            console.log(`Warning: ${gridResult.error.message}`);
          }
        }

        // Prompt for units
        const units = await promptSelect('Select your preferred units:', [
          'Imperial (miles, °F)',
          'Metric (km, °C)',
        ]);

        // Initialize config
        initConfig({
          callsign: callsign.toUpperCase(),
          gridSquare: gridSquare.toUpperCase() || undefined,
          units: units.startsWith('Imperial') ? 'imperial' : 'metric',
        });

        console.log(`\nConfiguration saved to: ${getConfigPath()}\n`);

        // Ask about syncing parks
        const syncNow = await promptConfirm(
          'Would you like to sync the park database now?',
          true
        );

        if (syncNow) {
          console.log('\nSyncing parks...');
          const parkService = await import('../services/park-service.js');

          const result = await parkService.syncParks({ region: 'US' });
          if (result.success) {
            console.log(`Synced ${result.data.count} parks.\n`);
          } else {
            console.log(`Failed to sync parks: ${result.error.message}`);
          }
        }

        success('Setup complete! Type "pota --help" to get started.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to initialize config: ${msg}`);
        process.exit(1);
      }
    });

  // pota config show
  configCmd
    .command('show')
    .description('Display current configuration')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action((options) => {
      const currentConfig = loadConfig();

      if (options.format === 'json') {
        console.log(JSON.stringify(currentConfig, null, 2));
        return;
      }

      console.log('Current Configuration\n');
      console.log(`Config file: ${getConfigPath()}\n`);

      console.log('[User]');
      console.log(`  callsign: ${currentConfig.user.callsign ?? '(not set)'}`);
      console.log(`  gridSquare: ${currentConfig.user.gridSquare ?? '(not set)'}`);
      if (currentConfig.user.homeLatitude && currentConfig.user.homeLongitude) {
        console.log(`  homeLocation: ${currentConfig.user.homeLatitude}, ${currentConfig.user.homeLongitude}`);
      }
      console.log(`  timezone: ${currentConfig.user.timezone}`);
      console.log(`  units: ${currentConfig.user.units}\n`);

      console.log('[Display]');
      console.log(`  color: ${currentConfig.display.color}`);
      console.log(`  tableStyle: ${currentConfig.display.tableStyle}`);
      console.log(`  dateFormat: ${currentConfig.display.dateFormat}`);
      console.log(`  timeFormat: ${currentConfig.display.timeFormat}\n`);

      console.log('[Sync]');
      console.log(`  autoSync: ${currentConfig.sync.autoSync}`);
      console.log(`  syncIntervalHours: ${currentConfig.sync.syncIntervalHours}`);
      console.log(`  parkRegions: ${currentConfig.sync.parkRegions.join(', ')}\n`);

      console.log('[Data]');
      console.log(`  databasePath: ${currentConfig.data.databasePath}`);
      console.log(`  cacheDirectory: ${currentConfig.data.cacheDirectory}`);
      console.log(`  exportDirectory: ${currentConfig.data.exportDirectory}\n`);

      console.log('[Logging]');
      console.log(`  level: ${currentConfig.logging.level}`);
      if (currentConfig.logging.file) {
        console.log(`  file: ${currentConfig.logging.file}`);
      }
    });

  // pota config set <key> <value>
  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      const validKeys = [
        'user.callsign',
        'user.gridSquare',
        'user.timezone',
        'user.units',
        'display.color',
        'display.tableStyle',
        'display.timeFormat',
        'sync.autoSync',
        'sync.syncIntervalHours',
        'logging.level',
      ];

      if (!validKeys.includes(key)) {
        error(`Unknown config key: ${key}`, [
          'Valid keys:',
          ...validKeys.map(k => `  ${k}`),
        ]);
        process.exit(1);
      }

      // Parse value based on key
      let parsedValue: string | number | boolean = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      try {
        setConfigValue(key, parsedValue);
        success(`Set ${key} = ${parsedValue}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        error(`Failed to set config: ${msg}`);
        process.exit(1);
      }
    });

  // pota config path
  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });
}
