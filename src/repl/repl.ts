// Interactive REPL mode

import * as readline from 'readline';
import type { AppConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';
import type { AppError } from '../types/index.js';
import {
  createContext,
  setCurrentPark,
  setCurrentPlan,
  addToHistory,
  formatContextDisplay,
} from './context.js';
import { success, error, warning, info } from '../ui/status.js';
import { formatParkCard, formatPlanCard } from '../ui/formatters.js';
import { validateParkRef } from '../utils/validators.js';
import * as parkService from '../services/park-service.js';
import * as planRepository from '../data/repositories/plan-repository.js';
import { getPresetOptions } from '../services/equipment-presets.js';

const VERSION = '1.0.0';

export async function startRepl(_config: AppConfig, _logger: Logger): Promise<void> {
  const context = createContext();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'pota> ',
  });

  // Print welcome banner
  printWelcome();

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    addToHistory(context, input);

    try {
      await handleCommand(input, context, rl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      error(`Error: ${msg}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye! 73');
    process.exit(0);
  });
}

function printWelcome(): void {
  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│  POTA Activation Planner v${VERSION}                                   │
│  Type /help for commands, /quit to exit                         │
└─────────────────────────────────────────────────────────────────┘
`);
}

async function handleCommand(
  input: string,
  context: ReturnType<typeof createContext>,
  rl: readline.Interface
): Promise<void> {
  // Handle slash commands
  if (input.startsWith('/')) {
    await handleSlashCommand(input, context, rl);
    return;
  }

  // Handle natural language / direct commands
  const parts = input.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case 'search':
      await handleSearch(parts.slice(1).join(' '), context);
      break;
    case 'show':
      await handleShow(parts.slice(1), context);
      break;
    case 'plan':
      await handlePlan(parts.slice(1), context, rl);
      break;
    case 'list':
      await handleList(parts.slice(1));
      break;
    case 'sync':
      await handleSync(parts.slice(1));
      break;
    case 'help':
      printHelp();
      break;
    case 'exit':
    case 'quit':
      rl.close();
      break;
    default:
      error(`Unknown command: ${cmd}`, ['Type /help for available commands']);
  }
}

async function handleSlashCommand(
  input: string,
  context: ReturnType<typeof createContext>,
  rl: readline.Interface
): Promise<void> {
  const parts = input.slice(1).split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  switch (cmd) {
    case 'help':
    case '?':
      printHelp();
      break;
    case 'quit':
    case 'exit':
    case 'q':
      rl.close();
      break;
    case 'clear':
      console.clear();
      break;
    case 'context':
      console.log(formatContextDisplay(context));
      break;
    case 'select':
      await handleSelect(parts[1] ?? '', context);
      break;
    case 'plan':
      await handleQuickPlan(context);
      break;
    case 'weather':
      await handleWeather(context);
      break;
    case 'bands':
      await handleBands();
      break;
    case 'history':
      console.log('Command history:');
      context.commandHistory.slice(-10).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c}`);
      });
      break;
    default:
      error(`Unknown slash command: /${cmd}`, ['Type /help for available commands']);
  }
}

function printHelp(): void {
  console.log(`
Available Commands:

  search <query>       Search for parks by name or reference
  show [ref|plan]      Show park or plan details
  plan <ref> <date>    Create a new activation plan
  list plans           List all plans
  sync parks           Sync park database
  help                 Show this help

Slash Commands:

  /help, /?            Show this help
  /select <ref>        Set current park context
  /plan                Create plan for current park
  /weather             Show weather for current park
  /bands               Show band recommendations for current park
  /context             Show session context
  /history             Show command history
  /clear               Clear screen
  /quit, /exit         Exit REPL

Examples:

  pota> search yellowstone
  pota> /select K-0039
  pota> /plan
  pota> plan K-0039 2024-06-15
`);
}

async function handleSearch(
  query: string,
  context: ReturnType<typeof createContext>
): Promise<void> {
  if (!query) {
    error('Please provide a search query');
    return;
  }

  const result = await parkService.searchParks(query, { limit: 10 });

  if (!result.success) {
    const appErr = result.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  if (result.data.parks.length === 0) {
    warning(`No parks found matching "${query}"`);
    return;
  }

  const park = result.data.parks[0];
  if (park) {
    console.log(formatParkCard(park));
  }
  if (result.data.parks.length > 1) {
    console.log(`\n...and ${result.data.parks.length - 1} more results`);
    console.log('Use "show <ref>" to see details, or "/select <ref>" to set context');
  }

  if (result.data.staleWarning) {
    warning(result.data.staleWarning);
  }
}

async function handleShow(
  args: string[],
  context: ReturnType<typeof createContext>
): Promise<void> {
  const target = args[0];

  if (!target) {
    // Show current context
    if (context.currentPark) {
      console.log(formatParkCard(context.currentPark));
    } else {
      info('No park selected. Use /select <ref> or show <ref>');
    }
    return;
  }

  if (target === 'plan') {
    if (context.currentPlan) {
      console.log(formatPlanCard(context.currentPlan));
    } else {
      info('No plan in context. Use "plan <ref> <date>" to create one.');
    }
    return;
  }

  // Assume it's a park reference
  const refResult = validateParkRef(target);
  if (!refResult.success) {
    const appErr = refResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  const parkResult = await parkService.getParkByReference(refResult.data);
  if (!parkResult.success) {
    const appErr = parkResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  if (!parkResult.data) {
    error(`Park not found: ${target}`);
    return;
  }

  console.log(formatParkCard(parkResult.data));
}

async function handleSelect(
  ref: string,
  context: ReturnType<typeof createContext>
): Promise<void> {
  if (!ref) {
    error('Please provide a park reference (e.g., /select K-0039)');
    return;
  }

  const refResult = validateParkRef(ref);
  if (!refResult.success) {
    const appErr = refResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  const parkResult = await parkService.getParkByReference(refResult.data);
  if (!parkResult.success) {
    const appErr = parkResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  if (!parkResult.data) {
    error(`Park not found: ${ref}`);
    return;
  }

  setCurrentPark(context, parkResult.data);
  success(`Selected: ${parkResult.data.reference} - ${parkResult.data.name}`);
}

async function handlePlan(
  args: string[],
  context: ReturnType<typeof createContext>,
  rl: readline.Interface
): Promise<void> {
  // plan <ref> <date>
  if (args.length < 2) {
    error('Usage: plan <reference> <YYYY-MM-DD>', [
      'Example: plan K-0039 2024-06-15',
    ]);
    return;
  }

  const ref = args[0];
  const date = args[1];

  const refResult = validateParkRef(ref!);
  if (!refResult.success) {
    const appErr = refResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  // Get park first
  const parkResult = await parkService.getParkByReference(refResult.data);
  if (!parkResult.success || !parkResult.data) {
    error(`Park not found: ${ref}`);
    return;
  }

  // Prompt for preset
  console.log('\nSelect equipment preset:');
  const presets = getPresetOptions();
  presets.forEach((p, i) => console.log(`  ${i + 1}. ${p.label}: ${p.description}`));

  const answer = await new Promise<string>((resolve) => {
    rl.question('Enter choice (1-3): ', resolve);
  });

  const presetNum = parseInt(answer, 10);
  const presetId = presets[presetNum - 1]?.value ?? 'qrp-portable';

  // Create plan directly
  const createResult = planRepository.create({
    parkReference: refResult.data,
    plannedDate: date!,
    presetId,
  });

  if (!createResult.success) {
    const appErr = createResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  // Get plan with park
  const planWithParkResult = planRepository.findByIdWithPark(createResult.data.id);
  if (!planWithParkResult.success || !planWithParkResult.data) {
    error('Failed to retrieve created plan');
    return;
  }

  setCurrentPlan(context, planWithParkResult.data);
  setCurrentPark(context, planWithParkResult.data.park);

  success(`Plan #${createResult.data.id} created for ${planWithParkResult.data.park.reference}`);
  console.log(formatPlanCard(planWithParkResult.data));
}

async function handleQuickPlan(
  context: ReturnType<typeof createContext>
): Promise<void> {
  if (!context.currentPark) {
    error('No park selected. Use /select <ref> first');
    return;
  }

  const today = new Date();
  const nextWeekend = getNextSaturday(today);
  const defaultDate = nextWeekend.toISOString().split('T')[0];

  console.log(`\nCreating plan for ${context.currentPark.reference}`);
  console.log(`Default date: ${defaultDate} (next Saturday)`);

  const createResult = planRepository.create({
    parkReference: context.currentPark.reference,
    plannedDate: defaultDate!,
    presetId: 'qrp-portable',
  });

  if (!createResult.success) {
    const appErr = createResult.error as AppError;
    error(appErr.message, appErr.suggestions);
    return;
  }

  const planWithParkResult = planRepository.findByIdWithPark(createResult.data.id);
  if (!planWithParkResult.success || !planWithParkResult.data) {
    error('Failed to retrieve created plan');
    return;
  }

  setCurrentPlan(context, planWithParkResult.data);
  success(`Plan #${createResult.data.id} created`);
  console.log(formatPlanCard(planWithParkResult.data));
}

function getNextSaturday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  return d;
}

async function handleWeather(
  context: ReturnType<typeof createContext>
): Promise<void> {
  if (!context.currentPark) {
    error('No park selected. Use /select <ref> first');
    return;
  }

  const { getForecast } = await import('../services/weather-service.js');
  const { formatWeather } = await import('../ui/formatters.js');

  try {
    const result = await getForecast(
      context.currentPark.latitude,
      context.currentPark.longitude,
      new Date().toISOString().split('T')[0]!
    );

    if (!result.success) {
      error(`Failed to fetch weather: ${result.error.message}`);
      return;
    }

    console.log(formatWeather(result.data));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to fetch weather: ${msg}`);
  }
}

async function handleBands(): Promise<void> {
  const { getBandConditions } = await import('../services/band-service.js');
  const { formatBandConditions } = await import('../ui/formatters.js');

  const today = new Date().toISOString().split('T')[0]!;
  const conditions = getBandConditions(today);

  console.log(formatBandConditions(conditions));
}

async function handleList(args: string[]): Promise<void> {
  const target = args[0]?.toLowerCase();

  if (target === 'plans') {
    const result = planRepository.findAllWithPark({});

    if (!result.success) {
      error('Failed to fetch plans');
      return;
    }

    if (result.data.length === 0) {
      info('No plans found. Create one with: plan <ref> <date>');
      return;
    }

    console.log('Your Plans:\n');
    for (const plan of result.data) {
      console.log(`  #${plan.id}: ${plan.park.reference} - ${plan.plannedDate} (${plan.status})`);
    }
  } else {
    error('Usage: list plans');
  }
}

async function handleSync(args: string[]): Promise<void> {
  const target = args[0]?.toLowerCase();

  if (target === 'parks') {
    console.log('Syncing parks...');

    const result = await parkService.syncParks({ region: 'US' });

    if (!result.success) {
      const appErr = result.error as AppError;
      error(appErr.message, appErr.suggestions);
      return;
    }

    success(`Synced ${result.data.count} parks`);
  } else {
    error('Usage: sync parks');
  }
}
