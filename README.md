# POTA Activation Planner

A CLI tool for amateur radio operators to plan Parks on the Air (POTA) activations. Consolidates park discovery, weather forecasts, band/propagation recommendations, and equipment presets into a single planning workflow.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Interactive Mode (REPL)](#interactive-mode-repl)
  - [Direct Commands](#direct-commands)
- [Command Reference](#command-reference)
  - [Park Commands](#park-commands)
  - [Plan Commands](#plan-commands)
  - [Sync Commands](#sync-commands)
  - [Config Commands](#config-commands)
- [Equipment Presets](#equipment-presets)
- [Band Recommendations](#band-recommendations)
- [Data Storage](#data-storage)
- [Offline Operation](#offline-operation)
- [Development](#development)
- [APIs Used](#apis-used)
- [License](#license)

## Features

- **Park Discovery**: Search and browse POTA parks by name, reference, or location
- **Activation Planning**: Create detailed activation plans with date, time, and equipment
- **Weather Forecasts**: View weather conditions for your planned activation location
- **Band Recommendations**: Get time-of-day and seasonal band condition recommendations
- **Equipment Presets**: Choose from pre-configured equipment loadouts (QRP, portable, mobile)
- **Offline Capable**: Works offline after initial park data sync
- **Interactive REPL**: Explore parks and plans with an interactive shell
- **Multiple Output Formats**: Table or JSON output for scripting and automation
- **Plan Export**: Export plans to Markdown, text, or JSON files

## Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Operating System**: macOS, Linux, or Windows

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/pota-assistant-ts.git
cd pota-assistant-ts

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional, for `pota` command)
npm link
```

### Run Without Installing

```bash
# Run directly with npx
npx pota-assistant
```

## Quick Start

```bash
# Start interactive mode
pota

# Or run directly
node dist/index.js

# Sync park database (first time)
pota sync parks

# Search for a park
pota park search yellowstone

# Create an activation plan
pota plan create K-0039 --date 2024-06-15

# View your plans
pota plan list
```

## Usage

### Interactive Mode (REPL)

Running `pota` without arguments starts an interactive shell:

```
┌─────────────────────────────────────────────────────────────────┐
│  POTA Activation Planner v1.0.0                                   │
│  Type /help for commands, /quit to exit                         │
└─────────────────────────────────────────────────────────────────┘

pota> search yellowstone
pota> /select K-0039
pota> /weather
pota> /bands
pota> /plan
pota> /quit
```

#### REPL Slash Commands

| Command | Description |
|---------|-------------|
| `/help`, `/?` | Show available commands |
| `/select <ref>` | Set current park context (e.g., `/select K-0039`) |
| `/plan` | Create a plan for the currently selected park |
| `/weather` | Show weather for the current park |
| `/bands` | Show band recommendations for today |
| `/context` | Display current session context |
| `/history` | Show command history |
| `/clear` | Clear the terminal screen |
| `/quit`, `/exit`, `/q` | Exit the REPL |

#### REPL Direct Commands

```bash
pota> search <query>       # Search parks by name or reference
pota> show [ref|plan]      # Show park or plan details
pota> plan <ref> <date>    # Create a new activation plan
pota> list plans           # List all saved plans
pota> sync parks           # Sync park database from POTA API
```

### Direct Commands

For scripting and automation, use direct CLI commands:

```bash
# Park operations
pota park search yellowstone
pota park show K-0039
pota park list --state CO

# Plan operations
pota plan create K-0039 --date 2024-06-15 --preset qrp-portable
pota plan list --upcoming
pota plan show 1
pota plan export 1 --format markdown --output activation-plan.md

# Sync operations
pota sync parks

# Configuration
pota config init
pota config set callsign W1AW
```

## Command Reference

### Park Commands

```bash
# Search for parks
pota park search <query> [options]

Options:
  -l, --limit <number>  Maximum results (default: 20)
  -f, --format <fmt>    Output format: table, json (default: table)

# Show park details
pota park show <reference>

# List parks with filters
pota park list [options]

Options:
  -s, --state <code>    Filter by state (e.g., CO, CA)
  --active              Show only active parks
  -l, --limit <number>  Maximum results (default: 50)
```

### Plan Commands

```bash
# Create a new activation plan
pota plan create <parkRef> --date <YYYY-MM-DD> [options]

Options:
  -d, --date <date>     Activation date (required)
  -t, --time <time>     Start time (HH:MM)
  --duration <hours>    Expected duration in hours
  -p, --preset <id>     Equipment preset (see Equipment Presets section)
  --notes <text>        Additional notes
  -f, --format <fmt>    Output format: table, json

# List all plans
pota plan list [options]

Options:
  --status <status>     Filter by status: draft, finalized, completed, cancelled
  --upcoming            Show only upcoming plans
  -l, --limit <number>  Maximum results (default: 20)

# Show plan details
pota plan show <id>

# Edit a plan
pota plan edit <id> [options]

Options:
  -d, --date <date>     New activation date
  -t, --time <time>     New start time
  --duration <hours>    New duration
  -p, --preset <id>     New equipment preset
  --notes <text>        New notes
  --status <status>     New status

# Delete a plan
pota plan delete <id> [--force]

# Export a plan
pota plan export <id> --format <fmt> --output <path>

Options:
  -f, --format <fmt>    Export format: markdown, text, json (required)
  -o, --output <path>   Output file path (required)
```

### Sync Commands

```bash
# Sync park database from POTA API
pota sync parks [options]

Options:
  -r, --region <code>   Region filter (default: US)
  --force               Force full re-sync
```

### Config Commands

```bash
# Initialize configuration
pota config init

# Set configuration values
pota config set <key> <value>

# Get configuration value
pota config get <key>

# Show all configuration
pota config list
```

## Equipment Presets

The planner includes three built-in equipment presets for common activation scenarios:

### QRP Portable (`qrp-portable`)

Low-power portable operation (5W max). Ideal for backpacking and minimal setups.

- QRP Transceiver (e.g., IC-705, KX2, KX3, Xiegu G90)
- Wire Antenna (EFHW, dipole, or end-fed random wire)
- Telescopic pole or tree support
- LiFePO4 Battery (6-9Ah)
- Logging notebook and headphones

### Standard Portable (`standard-portable`)

Medium-power portable operation (20-30W). Good balance of power and portability.

- Portable Transceiver (e.g., IC-7100, FT-891)
- EFHW Antenna (40/20/15/10m bands)
- 10m telescopic pole
- LiFePO4 Battery (15-20Ah)
- Folding chair and optional table

### Mobile / High Power (`mobile-high-power`)

High-power mobile or base operation (50-100W). For vehicle-based activations.

- Mobile Transceiver (e.g., IC-7100, FT-857D)
- Mobile antenna with mount
- Connected to vehicle electrical system
- Logging device (tablet, laptop, or notebook)

## Band Recommendations

The planner provides time-of-day band recommendations based on typical propagation patterns:

| Time Slot | Hours | Recommended Bands |
|-----------|-------|-------------------|
| Morning | 6-10am | 40m (excellent), 20m (good) |
| Midday | 10am-4pm | 20m (excellent), 17m (good), 15m (fair) |
| Evening | 4-8pm | 20m (good), 40m (good), 15m (fair) |
| Night | 8pm-6am | 80m (good), 40m (fair), 160m (fair) |

### Seasonal Adjustments

- **Summer (May-August)**: 15m and 17m boosted
- **Winter (November-February)**: 80m and 160m boosted
- **Equinox (March-April, September-October)**: All bands boosted

> **Note**: Band conditions vary based on solar activity, ionospheric conditions, and local noise. These are general guidelines.

## Data Storage

All data is stored locally in your home directory:

```
~/.pota-assistant/
├── config.json       # User configuration
├── pota.db           # SQLite database (parks, plans, cache)
└── logs/
    └── app.log       # Application logs
```

### Database Schema

The application uses SQLite with the following tables:

- **parks**: POTA park information (reference, name, location, grid square)
- **plans**: Activation plans (date, time, equipment, notes)
- **weather_cache**: Cached weather forecasts (1-hour TTL)
- **user_config**: User preferences (callsign, home grid square)

## Offline Operation

The planner is designed for offline use after initial setup:

1. **First Run**: Sync park database with `pota sync parks`
2. **Offline**: Search parks, create plans, view cached weather
3. **Degraded State**: Weather forecasts show stale warnings when offline

Cache TTLs:
- **Weather**: 1 hour
- **Park Data**: 30 days (manual sync recommended periodically)

## Development

### Scripts

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode for development
npm run start        # Run the compiled application
npm test             # Run tests with Vitest
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint with ESLint
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format with Prettier
npm run typecheck    # Type check without emitting
```

### Project Structure

```
src/
├── api/              # External API clients (POTA, Open-Meteo)
├── commands/         # CLI command definitions
├── config/           # Configuration management
├── data/             # Database and repositories
│   ├── migrations/   # Schema migrations
│   └── repositories/ # Data access layer
├── repl/             # Interactive REPL implementation
├── services/         # Business logic services
├── types/            # TypeScript type definitions
├── ui/               # Terminal UI components
└── utils/            # Utility functions
tests/                # Test files mirroring src/ structure
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/services/band-service.test.ts

# Run with coverage
npm test -- --coverage
```

### Code Conventions

- **ESM Modules**: Use `import`/`export` syntax
- **Named Exports**: Prefer named exports over default exports
- **Strict TypeScript**: No `any` types without justification
- **Error Handling**: Return `Result` types for expected failures
- **File Naming**: `kebab-case.ts` for files, `PascalCase` for types

## APIs Used

| API | Purpose | Auth Required |
|-----|---------|---------------|
| [POTA.app API](https://api.pota.app) | Park database and information | No |
| [Open-Meteo](https://open-meteo.com) | Weather forecasts | No |

All APIs are free and require no authentication. API keys are never needed or stored.

## Troubleshooting

### "Park not found" after search

The local database may be empty or outdated. Run:
```bash
pota sync parks
```

### "Network error" when syncing

Check your internet connection. The POTA API may also be experiencing issues.

### Plans show stale weather

Weather cache expires after 1 hour. Refresh with an internet connection:
```bash
pota plan show <id>  # Will fetch fresh weather if online
```

### Database errors

The SQLite database may be corrupted. Reset it:
```bash
rm ~/.pota-assistant/pota.db
pota sync parks
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Parks on the Air (POTA)](https://pota.app) for the park database API
- [Open-Meteo](https://open-meteo.com) for free weather forecasts
- The amateur radio community for inspiration and feedback

---

73 de POTA Assistant
