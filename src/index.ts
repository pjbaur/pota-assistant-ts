#!/usr/bin/env node

// POTA Activation Planner - CLI Entry Point

import { Command } from 'commander';
import { loadConfig, isFirstRun } from './config/index.js';
import { getLogger, initLogger } from './utils/logger.js';
import { registerParkCommand } from './commands/park-command.js';
import { registerPlanCommand } from './commands/plan-command.js';
import { registerSyncCommand } from './commands/sync-command.js';
import { registerConfigCommand } from './commands/config-command.js';
import { startTUI } from './tui/index.js';

const VERSION = '2.0.0';

async function main(): Promise<void> {
  // Load configuration
  const config = loadConfig();

  // Initialize logger
  initLogger(config.logging.level, config.logging.file, config.logging.maxSizeMb);
  const logger = getLogger();

  // Create main program
  const program = new Command();

  program
    .name('pota')
    .description('POTA Activation Planner - Plan your Parks on the Air activations')
    .version(VERSION)
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-q, --quiet', 'Suppress non-essential output', false)
    .option('--no-color', 'Disable colored output', !config.display.color)
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .option('-c, --config <path>', 'Path to config file')
    .option('--cli', 'Use traditional CLI mode instead of TUI', false);

  // Register subcommands
  registerParkCommand(program, config, logger);
  registerPlanCommand(program, config, logger);
  registerSyncCommand(program, config, logger);
  registerConfigCommand(program, config, logger);

  // Parse arguments
  program.parse(process.argv);

  // If no command provided, start interactive TUI (or CLI if --cli flag)
  const options = program.opts();
  if (process.argv.length === 2 || (process.argv.length === 3 && process.argv[2]?.startsWith('-'))) {
    // Check for first run
    if (isFirstRun()) {
      console.log('Welcome to POTA Activation Planner!');
      console.log('Run "pota config init" to set up your operator profile.\n');
    }

    // Start TUI by default, or CLI mode if --cli flag
    if (options.cli) {
      // Fall back to old REPL (lazy import to avoid issues)
      const { startRepl } = await import('./repl/index.js');
      await startRepl(config, logger);
    } else {
      await startTUI();
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
