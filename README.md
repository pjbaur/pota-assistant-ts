# POTA Activation Planner

A CLI tool for amateur radio operators to plan Parks on the Air (POTA) activations. Consolidates park discovery, weather forecasts, band/propagation recommendations, and equipment presets into a single planning workflow.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Interactive Mode (TUI)](#interactive-mode-tui)
  - [Classic CLI Mode](#classic-cli-mode)
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

- **Interactive TUI**: Modern split-pane terminal interface with keyboard navigation
- **Park Discovery**: Search and browse POTA parks by name, reference, or location
- **Activation Planning**: Create detailed activation plans with date, time, and equipment
- **Weather Forecasts**: View weather conditions for your planned activation location
- **Band Recommendations**: Get time-of-day and seasonal band condition recommendations
- **Equipment Presets**: Choose from pre-configured equipment loadouts (QRP, portable, mobile)
- **Offline Capable**: Works offline after initial park data sync
- **Command Palette**: Quick access to all commands with Cmd/Ctrl+K
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
# Start interactive TUI mode
pota

# Or run directly
node dist/index.js

# First time: sync park database
pota sync parks

# In the TUI:
# - Use j/k or arrows to navigate parks
# - Press Enter to select a park
# - Press ? for keyboard shortcuts
# - Press Cmd/Ctrl+K for command palette

# Direct CLI commands also work:
pota park search yellowstone
pota plan create K-0039 --date 2024-06-15
pota plan list
```

## Usage

### Interactive Mode (TUI)

Running `pota` without arguments starts an interactive terminal UI:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ POTA Activation Planner v2.0                         [?-help]            │
├────────────────────┬─────────────────────────────────────────────────────┤
│ PARKS              │ DASHBOARD                                          │
│   ▸ K-0039 Yellow..│                                                    │
│     K-4561 El Morro│ Current: K-0039 - Yellowstone NP                   │
│     K-1234 Sandy.. │ Grid: DN44xk | 44.4N, -110.7W                      │
│                    │                                                    │
│ PLANS              │ Today's Bands: 40m Good, 20m Fair                  │
│   ▸ 2024-06-15 K-..│ Weather: Sunny 72F                                 │
│     2024-06-22 K-..│                                                    │
│                    │                                                    │
│ [Tab: switch]      │ [d:dashboard w:weather b:bands]                    │
├────────────────────┴─────────────────────────────────────────────────────┤
│ > Type a command...                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl+K` | Open command palette |
| `?` | Show help overlay |
| `Tab` | Cycle focus (sidebar → main → input) |
| `j/k` or `↑/↓` | Navigate lists |
| `Enter` | Select item |
| `d` | Show dashboard |
| `w` | Focus weather |
| `b` | Focus bands |
| `Esc` | Close overlay / return to sidebar |
| `q` | Quit (when in sidebar) |

#### Command Palette Commands

Press `Cmd/Ctrl+K` to open the command palette, then type to search:

- `Search Parks` - Search parks by name
- `Go to Dashboard` - Show the main dashboard
- `View Plans` - Switch to plans list
- `View Parks` - Switch to parks list
- `Sync Park Data` - Download latest park data
- `Show Help` - Display keyboard shortcuts
- `Quit` - Exit the application

#### Command Bar

Type commands in the input bar at the bottom:

```bash
> search yellowstone    # Search for parks
> help                  # Show help
> quit                  # Exit
```

### Classic CLI Mode

If you prefer the traditional REPL, use the `--cli` flag:

```bash
pota --cli
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
├── repl/             # Classic REPL implementation
├── services/         # Business logic services
├── tui/              # Terminal UI (Ink + React)
│   ├── components/   # UI components (layout, sidebar, main, overlay)
│   ├── hooks/        # React hooks for data fetching
│   ├── store/        # Zustand state management
│   └── types/        # TUI-specific types
├── types/            # TypeScript type definitions
├── ui/               # Terminal UI utilities (formatters, colors)
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

All APIs are free. Open-Meteo requires no authentication. The POTA API may require authentication for some endpoints - see troubleshooting below.

## Troubleshooting

### "403 Forbidden" when syncing parks

The POTA API has changed and now requires authentication for the `/parks` endpoint. This is a known issue as of 2026. Options:

1. **Contact POTA Support**: Email help@parksontheair.com to request API access
2. **Manual Data Entry**: Look up parks on [pota.app](https://pota.app) and use the reference ID directly
3. **Use Individual Park Lookup**: The `/park/{reference}` endpoint may still work for individual parks

### "Park not found" after search

The local database may be empty. Due to the POTA API authentication change, you'll need to:
1. Get the park reference from [pota.app](https://pota.app)
2. Use it directly: `pota park show K-0039`

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
