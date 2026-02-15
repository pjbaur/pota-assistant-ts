#!/usr/bin/env node

// POTA Activation Planner - CLI Entry Point

import { Command } from 'commander';
import { loadConfig, isFirstRun } from './config/index.js';
import { getLogger, initLogger } from './utils/logger.js';
import { registerParkCommand } from './commands/park-command.js';
import { registerPlanCommand } from './commands/plan-command.js';
import { registerSyncCommand } from './commands/sync-command.js';
import { registerConfigCommand } from './commands/config-command.js';
import { registerImportCommand } from './commands/import-command.js';
import { startTUI } from './tui/index.js';

const VERSION = '2.0.0';

async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();

  // Initialize logger
  initLogger(config.logging.level, config.logging.file, config.logging.maxSizeMb);
  const logger = getLogger();

  // Check if help or version flags are provided
  const wantsHelp = process.argv.includes('--help') || process.argv.includes('-h');
  const wantsVersion = process.argv.includes('--version') || process.argv.includes('-V');

  // Check if a subcommand was provided
  const hasSubcommand = process.argv.length > 2 && !process.argv[2]?.startsWith('-');

  // If no subcommand and no help/version flags, start interactive mode
  if (!hasSubcommand && !wantsHelp && !wantsVersion) {
    // Check for first run
    if (isFirstRun()) {
      console.log('Welcome to POTA Activation Planner!');
      console.log('Run "pota config init" to set up your operator profile.\n');
    }

    // Check for --cli flag
    const useCli = process.argv.includes('--cli') || process.argv.includes('-c');

    if (useCli) {
      // Fall back to old REPL
      const { startRepl } = await import('./repl/index.js');
      await startRepl(config, logger);
    } else {
      // Start TUI
      await startTUI();
    }
    return;
  }

  // Create main program for CLI commands
  const program = new Command();

  program
    .name('pota')
    .description('POTA Activation Planner - Plan your Parks on the Air activations')
    .version(VERSION)
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-q, --quiet', 'Suppress non-essential output', false)
    .option('--no-color', 'Disable colored output', !config.display.color)
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .option('-c, --config <path>', 'Path to config file');

  // Register subcommands
  registerParkCommand(program, config, logger);
  registerPlanCommand(program, config, logger);
  registerSyncCommand(program, config, logger);
  registerConfigCommand(program, config, logger);
  registerImportCommand(program, config, logger);

  // Parse arguments
  program.parse(process.argv);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
