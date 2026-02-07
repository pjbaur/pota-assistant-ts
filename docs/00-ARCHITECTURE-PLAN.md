# POTA Activation Planner - CLI Architecture Plan

> **Purpose:** Language/platform-agnostic design specification for a Claude Code-inspired CLI application.
> **Status:** Planning complete. Implementation not started.
> **Supersedes:** REST API web application architecture.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Application Overview](#2-application-overview)
2.5. [Architectural Decision Records](#25-architectural-decision-records)
3. [CLI Design Philosophy](#3-cli-design-philosophy)
4. [User Interface Specification](#4-user-interface-specification)
5. [Command Reference](#5-command-reference)
5.5. [MVP Scope Definition](#55-mvp-scope-definition)
6. [Data Architecture](#6-data-architecture)
7. [External Service Integration](#7-external-service-integration)
8. [Configuration System](#8-configuration-system)
9. [Output Formats](#9-output-formats)
9.5. [Non-Functional Requirements](#95-non-functional-requirements)
10. [Error Handling](#10-error-handling)
10.4. [State Management](#104-state-management)
10.5. [Security Considerations](#105-security-considerations)
11. [Implementation Guidelines](#11-implementation-guidelines)
11.5. [Distribution Strategy](#115-distribution-strategy)
11.6. [Observability](#116-observability)
12. [Appendices](#appendices)

---

## 1. Executive Summary

### What This Application Does

The POTA Activation Planner helps amateur radio operators plan Parks on the Air (POTA) activations. It consolidates park discovery, weather forecasts, band/propagation recommendations, and equipment checklists into a single planning workflow.

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **CLI-first interface** | Portable, scriptable, works over SSH, matches ham radio operator culture |
| **Local-first data** | Offline capability, privacy, no server costs |
| **Embedded database** | Single-file portability, no external dependencies |
| **Interactive + batch modes** | Supports both exploration and automation |
| **Platform-agnostic design** | Implementable in any language with terminal support |

### What Changed from Web Architecture

| Removed | Replaced With |
|---------|---------------|
| REST API endpoints | Direct function calls within CLI |
| JWT authentication | Local configuration file with API keys |
| Server-side rendering | Terminal UI rendering |
| PostgreSQL + PostGIS | Embedded SQLite with spatial extensions |
| Browser-based maps | Text-based park listings with coordinates |
| React components | Terminal UI components (tables, prompts, spinners) |

---

## 2. Application Overview

### Core Value Proposition

> "As an activator, I can search for a park, pick a date, see weather + band conditions, and get a printable plan."

### Primary Workflows

```
┌─────────────────────────────────────────────────────────────────┐
│                    POTA CLI MAIN WORKFLOWS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PARK DISCOVERY                                              │
│     search parks → view details → save favorites                │
│                                                                 │
│  2. PLAN CREATION                                               │
│     select park → pick date → choose gear → generate plan       │
│                                                                 │
│  3. PLAN MANAGEMENT                                             │
│     list plans → view plan → export → mark complete             │
│                                                                 │
│  4. EQUIPMENT MANAGEMENT                                        │
│     add gear → organize presets → select for plans              │
│                                                                 │
│  5. ACTIVATION LOGGING                                          │
│     import ADIF → view history → track progress                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Target Users

- **Primary:** POTA activators who are comfortable with command-line tools
- **Secondary:** Automation-minded operators who want scriptable planning
- **Tertiary:** Operators seeking offline-capable planning tools

---

## 2.5 Architectural Decision Records

This section documents the rationale behind key architectural decisions. Each decision follows the pattern: **Context → Decision → Consequences → Alternatives Considered**.

### ADR-001: CLI-First vs Web Application

**Context:** The application could be built as a web application (browser-based) or a CLI tool. The target audience (amateur radio operators) uses both interfaces regularly.

**Decision:** Build as a CLI-first application with optional web components deferred.

**Consequences:**
- ✓ Portable across devices without browser compatibility issues
- ✓ Works over SSH connections (common for remote station control)
- ✓ Scriptable and automation-friendly
- ✓ Lower resource requirements (no browser overhead)
- ✓ Natural fit for ham radio operator culture (comfortable with terminals)
- ✗ Steeper learning curve for non-technical users
- ✗ Limited visual capabilities compared to web UI

**Alternatives Considered:**
1. **Web-only application:** Rejected due to offline requirements and SSH workflow needs
2. **Hybrid (CLI + Web):** Deferred to post-MVP due to complexity
3. **Desktop GUI application:** Rejected due to cross-platform complexity

**Status:** Final

---

### ADR-002: Local-First Data Approach

**Context:** Users operate in areas with poor or no connectivity (remote parks, field locations). Data privacy and ownership are concerns for amateur radio operators.

**Decision:** Store all primary data locally with optional cloud sync.

**Consequences:**
- ✓ Full offline operation capability
- ✓ No ongoing server hosting costs
- ✓ User owns their data completely
- ✓ Fast local queries (no network latency)
- ✗ Users must manage their own backups
- ✗ No shared/community features without online component
- ✗ Multiple device sync requires additional complexity

**Alternatives Considered:**
1. **Cloud-first with local cache:** Rejected due to offline dependency
2. **Peer-to-peer sync:** Rejected due to implementation complexity
3. **Hybrid (local + periodic sync):** Selected approach

**Status:** Final

---

### ADR-003: Embedded Database Choice

**Context:** Application requires persistent local storage with relational capabilities, spatial queries (distance calculations), and cross-platform support.

**Decision:** Use SQLite (or language-equivalent embedded database).

**Consequences:**
- ✓ Zero configuration required
- ✓ Single-file portability (easy backup/transfer)
- ✓ Cross-platform support (Windows, macOS, Linux)
- ✓ Mature ecosystem with spatial extensions (SpatiaLite)
- ✓ Small footprint (~50MB for full US park database)
- ✗ Limited concurrent write performance (not needed for this use case)
- ✗ No built-in replication (not needed for single-user application)

**Alternatives Considered:**
1. **JSON files:** Rejected due to poor query performance and lack of relationships
2. **PostgreSQL:** Rejected due to installation complexity and resource requirements
3. **Key-value store (Redis, BoltDB):** Rejected due to limited query capabilities
4. **Custom binary format:** Rejected due to maintenance burden

**Status:** Final

---

### ADR-004: Interactive + Batch Modes

**Context:** Users have different workflows - some prefer interactive exploration, others want scripted automation for repeated tasks.

**Decision:** Support both interactive REPL mode and direct command execution.

**Consequences:**
- ✓ Interactive mode for discovery and learning
- ✓ Scriptable batch mode for automation
- ✓ Consistent command structure across modes
- ✓ Session state in REPL improves UX (remembers context)
- ✗ Increased complexity in command parsing
- ✗ Must maintain two interaction patterns

**Alternatives Considered:**
1. **Interactive only:** Rejected - limits automation
2. **Batch only:** Rejected - poor UX for exploration
3. **Separate commands for each mode:** Rejected - inconsistency

**Status:** Final

---

### ADR-005: Platform-Agnostic Design

**Context:** Implementation language choice has implications for distribution, maintenance, and community contribution. Different team members have different language expertise.

**Decision:** Design as language-agnostic specification; defer language choice to implementation phase.

**Consequences:**
- ✓ Architecture can be validated before language commitment
- ✓ Allows technology choice based on actual needs
- ✓ Facilitates cross-language implementation if needed
- ✗ Delayed feedback on language-specific issues
- ✗ Requires abstract design (no concrete code examples)

**Alternatives Considered:**
1. **Pick Rust first:** Considered but deferred - excellent performance but learning curve
2. **Pick Python first:** Considered but deferred - rapid development but distribution complexity
3. **Pick Go first:** Considered but deferred - good balance but verbose
4. **Language-agnostic design:** Selected - provides flexibility

**Status:** Final - language decision will be made during implementation planning

**Recommended Languages (in priority order):**
1. **Rust** (clap + ratatui + SQLite): Best performance, single binary distribution
2. **Go** (cobra + bubbletea + SQLite): Good tooling, fast compilation
3. **Python** (click + rich + SQLite): Rapid development, wide adoption

---

## 3. CLI Design Philosophy

### Inspiration: Claude Code Patterns

The interface draws from Claude Code's interaction model:

| Claude Code Pattern | POTA CLI Adaptation |
|---------------------|---------------------|
| Conversational flow | Interactive mode with contextual prompts |
| Tool-based actions | Commands that perform discrete operations |
| Rich terminal output | Formatted tables, colored status, progress indicators |
| Slash commands | Quick actions within interactive mode |
| Background tasks | Async data sync and plan generation |
| Context awareness | Session state remembers current park/plan |

### Interaction Modes

#### Mode 1: Interactive REPL

```
$ pota
┌─────────────────────────────────────────────────────────────────┐
│  POTA Activation Planner v1.0                                   │
│  Type /help for commands, /quit to exit                         │
└─────────────────────────────────────────────────────────────────┘

pota> search yellowstone
Found 3 parks matching "yellowstone":

  REF       NAME                                    STATE   DIST
  ────────────────────────────────────────────────────────────────
  K-0039    Yellowstone National Park               WY      342mi
  K-4521    Yellowstone Lake State Park             WI       89mi
  K-7832    Upper Yellowstone River                 MT      298mi

pota> select K-0039
Selected: K-0039 - Yellowstone National Park

pota> plan 2024-06-15
Creating plan for K-0039 on 2024-06-15...

  Weather forecast loaded ✓
  Band conditions calculated ✓
  Equipment preset applied: QRP Portable ✓

Plan created: PLAN-2024-0615-K0039

pota> show plan
[displays formatted plan]

pota> export plan --format markdown
Exported to: ~/pota-plans/2024-06-15-K0039.md
```

#### Mode 2: Direct Commands

```bash
# One-shot commands for scripting
$ pota search "mount rainier" --state WA --format json
$ pota plan create K-0728 --date 2024-06-20 --preset qrp
$ pota plan export PLAN-001 --format pdf --output ./my-plan.pdf
$ pota sync parks --region US-WA
```

#### Mode 3: Guided Wizard

```
$ pota wizard
┌─────────────────────────────────────────────────────────────────┐
│  POTA Activation Planning Wizard                                │
└─────────────────────────────────────────────────────────────────┘

Step 1 of 5: Find a Park

How would you like to find a park?
  [1] Search by name
  [2] Search by reference (K-1234)
  [3] Parks near me
  [4] Parks I haven't activated

> 3

Enter search radius in miles [50]: 25
Searching for parks within 25 miles of your home QTH...

Found 12 parks. Select one:
  [1] K-1234 - Mount Si Natural Area (8mi)
  [2] K-5678 - Tiger Mountain State Forest (12mi)
  [3] K-9012 - Rattlesnake Lake Recreation Area (15mi)
  ...

> 1

Step 2 of 5: Choose a Date
...
```

---

## 4. User Interface Specification

### Terminal UI Components

#### 4.1 Tables

Used for listing parks, plans, equipment.

```
┌──────────┬────────────────────────────────┬───────┬────────┐
│ REF      │ NAME                           │ STATE │ DIST   │
├──────────┼────────────────────────────────┼───────┼────────┤
│ K-0039   │ Yellowstone National Park      │ WY    │ 342mi  │
│ K-4521   │ Yellowstone Lake State Park    │ WI    │  89mi  │
│ K-7832   │ Upper Yellowstone River        │ MT    │ 298mi  │
└──────────┴────────────────────────────────┴───────┴────────┘
```

#### 4.2 Detail Cards

Used for park details, plan summaries.

```
┌─────────────────────────────────────────────────────────────────┐
│ K-0039 - Yellowstone National Park                              │
├─────────────────────────────────────────────────────────────────┤
│ Location:    44.4280° N, 110.5885° W                            │
│ Grid:        DN44xk                                             │
│ State:       Wyoming                                            │
│ Status:      Active                                             │
├─────────────────────────────────────────────────────────────────┤
│ Your Status: Not Activated                                      │
│ Community:   ★★★★☆ (23 notes)                                   │
│              "Good cell service at Old Faithful parking"        │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3 Progress Indicators

```
Syncing park database...
[████████████████████░░░░░░░░░░] 67% (34,521 / 51,432 parks)

Fetching weather data...
⠋ Loading forecast for 44.43°N, 110.59°W
```

#### 4.4 Status Messages

```
✓ Plan created successfully: PLAN-2024-0615-K0039
⚠ Weather data is 4 hours old (API unavailable)
✗ Error: Park K-9999 not found in database
ℹ Tip: Run 'pota sync' to update park database
```

#### 4.5 Prompts

```
# Single selection
Select equipment preset:
  > [1] QRP Portable (5W)
    [2] Standard Portable (25W)
    [3] Mobile (50W)
    [4] Custom...

# Multi-selection
Select bands to include (space to toggle, enter to confirm):
  [x] 20m
  [x] 40m
  [ ] 15m
  [ ] 80m
  [x] 10m

# Text input
Enter activation date (YYYY-MM-DD): 2024-06-15

# Confirmation
Export plan to PDF? [Y/n]: y
```

### Color Scheme

| Element | Color | Semantic Meaning |
|---------|-------|------------------|
| Success | Green | Operation completed |
| Warning | Yellow | Degraded state, needs attention |
| Error | Red | Operation failed |
| Info | Cyan | Informational message |
| Prompt | White/Bold | User input expected |
| Muted | Gray | Secondary information |
| Highlight | Magenta | Important values |

### Responsive Layout

The interface adapts to terminal width:

| Width | Behavior |
|-------|----------|
| < 60 cols | Compact mode: abbreviated columns, stacked layouts |
| 60-120 cols | Standard mode: full tables with wrapping |
| > 120 cols | Wide mode: additional columns, side-by-side panels |

---

## 5. Command Reference

### Command Structure

```
pota [command] [subcommand] [arguments] [--flags]
```

### Global Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help for command |
| `--version` | `-v` | Show version |
| `--config` | `-c` | Use alternate config file |
| `--quiet` | `-q` | Suppress non-essential output |
| `--verbose` | | Show detailed output |
| `--format` | `-f` | Output format: `table`, `json`, `csv` |
| `--no-color` | | Disable colored output |

### Command Categories

#### 5.1 Session Commands

```bash
pota                      # Start interactive mode
pota wizard               # Start guided planning wizard
pota status               # Show current session context
```

#### 5.2 Park Commands

```bash
pota park search <query>  # Search parks by name
  --state <ST>            # Filter by state code
  --near <lat,lon>        # Filter by proximity
  --radius <miles>        # Search radius (default: 50)
  --unactivated           # Only parks not yet activated
  --limit <n>             # Max results (default: 20)

pota park show <ref>      # Show park details
  --notes                 # Include community notes
  --weather               # Include current weather

pota park favorite <ref>  # Add to favorites
pota park unfavorite <ref>
pota park favorites       # List favorite parks
```

#### 5.3 Plan Commands

```bash
pota plan create <ref>    # Create new plan
  --date <YYYY-MM-DD>     # Activation date (required)
  --time <HH:MM>          # Start time (local)
  --duration <hours>      # Expected duration
  --preset <name>         # Equipment preset
  --notes <text>          # Personal notes

pota plan list            # List all plans
  --status <status>       # Filter: draft, finalized, completed
  --upcoming              # Future plans only
  --past                  # Past plans only

pota plan show <id>       # Show plan details
pota plan edit <id>       # Edit plan interactively
pota plan finalize <id>   # Lock plan for execution
pota plan complete <id>   # Mark as completed
  --qsos <count>          # QSOs made
  --bands <list>          # Bands used
  --import <adif>         # Import ADIF log

pota plan delete <id>     # Delete plan

pota plan export <id>     # Export plan
  --format <fmt>          # markdown, pdf, text, ics
  --output <path>         # Output file path
```

#### 5.4 Equipment Commands

```bash
pota gear list            # List all equipment
  --type <type>           # Filter: radio, antenna, power, accessory

pota gear add             # Add equipment interactively
pota gear add --type radio --make "Icom" --model "IC-705" --power 10

pota gear show <id>       # Show equipment details
pota gear edit <id>       # Edit equipment
pota gear delete <id>     # Delete equipment

pota gear preset list     # List equipment presets
pota gear preset create <name>  # Create preset from selected gear
pota gear preset show <name>
pota gear preset delete <name>
```

#### 5.5 Activation History Commands

```bash
pota log list             # List activation history
  --year <YYYY>           # Filter by year
  --park <ref>            # Filter by park

pota log import <file>    # Import ADIF file
  --dry-run               # Preview without importing

pota log export           # Export all logs
  --format <fmt>          # adif, csv, json
  --output <path>

pota log stats            # Show activation statistics
```

#### 5.6 Data Sync Commands

```bash
pota sync                 # Sync all data sources
pota sync parks           # Sync park database
  --region <code>         # Limit to region (US, CA, EU, etc.)
  --force                 # Force full resync

pota sync weather <ref>   # Refresh weather for park
```

#### 5.7 Configuration Commands

```bash
pota config show          # Show current configuration
pota config set <key> <value>  # Set config value
pota config edit          # Open config in editor
pota config init          # Interactive setup wizard
```

### Interactive Mode Slash Commands

When in interactive REPL mode:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/quit`, `/exit` | Exit interactive mode |
| `/clear` | Clear screen |
| `/context` | Show current session context |
| `/select <ref>` | Set current park context |
| `/plan` | Quick plan for current park |
| `/weather` | Weather for current context |
| `/bands` | Band recommendations for current context |
| `/export` | Export current plan |
| `/history` | Command history |

---

## 5.5 MVP Scope Definition

The following defines the explicit scope boundary for version 1.0. Any feature not listed as "IN MVP" is explicitly OUT of scope for the initial release.

### IN MVP (Must Have for v1.0)

#### Core Functionality
- ✅ Park search by name and reference
- ✅ Park detail view with coordinates and grid square
- ✅ Weather forecast fetching (OpenWeatherMap or Open-Meteo)
- ✅ Band condition recommendations (hardcoded heuristics)
- ✅ Plan creation workflow
- ✅ Plan export to Markdown and plain text formats
- ✅ Local configuration file management
- ✅ Park database synchronization from POTA.app
- ✅ Offline operation with cached data

#### Equipment Management
- ✅ Three (3) hardcoded equipment presets:
  - QRP Portable (≤5W)
  - Standard Portable (20-30W)
  - Mobile/High Power (≥50W)
- ✅ Preset selection during plan creation

#### User Interface
- ✅ Interactive REPL mode
- ✅ Direct command execution (batch mode)
- ✅ Terminal UI components (tables, prompts, progress indicators)
- ✅ Colored output (configurable)
- ✅ Help system with examples

#### Data Management
- ✅ Local SQLite database with migrations
- ✅ Park data caching (30-day TTL)
- ✅ Weather data caching (1-hour TTL)
- ✅ User profile storage (callsign, grid, home coordinates)
- ✅ Plan storage with edit/delete capabilities

#### Error Handling
- ✅ Graceful degradation for offline operation
- ✅ Meaningful error messages with suggestions
- ✅ Configurable logging levels

### OUT MVP (Deferred to Post-1.0)

#### Equipment Features
- ❌ Custom equipment creation/management (CRUD)
- ❌ User-defined equipment presets
- ❌ Equipment inventory tracking
- ❌ Power budget calculations

#### Activation Features
- ❌ Activation logging/QSO tracking
- ❌ ADIF file import/export
- ❌ Real-time spotting integration
- ❌ Activation statistics and progress tracking
- ❌ Awards progress (POTA awards, band entities, etc.)

#### Plan Features
- ❌ PDF export
- ❌ iCalendar export
- ❌ Multi-park planning (single activation at multiple parks)
- ❌ Plan sharing/collaboration
- ❌ Plan templates

#### Community Features
- ❌ Community notes viewing
- ❌ Note submission/contribution
- ❌ Park ratings and reviews
- ❌ Photo attachments

#### Advanced Features
- ❌ Real-time propagation data (VOACAP, hamQTH)
- ❌ Map visualization
- ❌ Route planning to parks
- ❌ Solar/terrestrial weather integration
- ❌ KML/GeoJSON export
- ❌ Web interface companion

#### Platform Features
- ❌ Mobile app (iOS/Android)
- ❌ Cross-device synchronization
- ❌ Cloud backup/restore
- ❌ Collaborative planning

### Phase 2 Candidates (Post-MVP Priority Order)

1. **Custom Equipment Management** - Users need personalized gear lists
2. **PDF Export** - Printable plans are highly requested
3. **ADIF Import/Export** - Integration with existing logging workflows
4. **Community Notes** - Valuable information for activation planning
5. **Activation Statistics** - Track personal POTA achievements
6. **iCalendar Export** - Integration with personal calendar systems

### Success Criteria for MVP

The MVP is considered complete when a user can:
1. ✅ Run `pota search <park>` and find a park
2. ✅ Run `pota plan create <ref>` and generate a complete activation plan
3. ✅ Export a plan to Markdown or plain text
4. ✅ View weather forecasts and band recommendations
5. ✅ Use the REPL mode to plan an activation
6. ✅ Operate fully offline (after initial park sync)

---

## 6. Data Architecture

### 6.1 Local Database Schema

The application uses an embedded database (SQLite or equivalent) with the following schema:

#### Users Table
```
users
├── id              INTEGER PRIMARY KEY
├── callsign        TEXT UNIQUE NOT NULL
├── grid_square     TEXT
├── home_lat        REAL
├── home_lon        REAL
├── timezone        TEXT DEFAULT 'UTC'
├── units           TEXT DEFAULT 'imperial'  -- imperial | metric
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

#### Equipment Table
```
equipment
├── id              INTEGER PRIMARY KEY
├── user_id         INTEGER REFERENCES users
├── type            TEXT NOT NULL  -- RADIO | ANTENNA | POWER | ACCESSORY
├── make            TEXT
├── model           TEXT NOT NULL
├── power_watts     INTEGER
├── modes           TEXT  -- JSON array: ["SSB", "CW", "FT8"]
├── notes           TEXT
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

#### Equipment Presets Table
```
equipment_presets
├── id              INTEGER PRIMARY KEY
├── user_id         INTEGER REFERENCES users
├── name            TEXT NOT NULL
├── description     TEXT
├── is_default      BOOLEAN DEFAULT FALSE
└── created_at      TIMESTAMP

equipment_preset_items
├── preset_id       INTEGER REFERENCES equipment_presets
├── equipment_id    INTEGER REFERENCES equipment
└── PRIMARY KEY (preset_id, equipment_id)
```

#### Parks Table
```
parks
├── id              INTEGER PRIMARY KEY
├── reference       TEXT UNIQUE NOT NULL  -- e.g., "K-0039"
├── name            TEXT NOT NULL
├── latitude        REAL NOT NULL
├── longitude       REAL NOT NULL
├── grid_square     TEXT
├── state           TEXT
├── country         TEXT
├── region          TEXT
├── park_type       TEXT
├── is_active       BOOLEAN DEFAULT TRUE
├── pota_url        TEXT
├── synced_at       TIMESTAMP
└── metadata        TEXT  -- JSON for extensible fields
```

#### Park Notes Table (Community Data Cache)
```
park_notes
├── id              INTEGER PRIMARY KEY
├── park_id         INTEGER REFERENCES parks
├── note_type       TEXT  -- CELL_SERVICE | NOISE | ACCESS | HAZARD | GENERAL
├── content         TEXT NOT NULL
├── author_call     TEXT
├── rating          INTEGER  -- Community vote score
├── fetched_at      TIMESTAMP
└── expires_at      TIMESTAMP
```

#### Plans Table
```
plans
├── id              INTEGER PRIMARY KEY
├── user_id         INTEGER REFERENCES users
├── park_id         INTEGER REFERENCES parks
├── status          TEXT DEFAULT 'draft'  -- draft | finalized | completed | cancelled
├── planned_date    DATE NOT NULL
├── planned_time    TIME
├── duration_hours  REAL
├── preset_id       INTEGER REFERENCES equipment_presets
├── notes           TEXT
├── weather_cache   TEXT  -- JSON cached weather data
├── bands_cache     TEXT  -- JSON cached band recommendations
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP
└── completed_at    TIMESTAMP
```

#### Activations Table
```
activations
├── id              INTEGER PRIMARY KEY
├── user_id         INTEGER REFERENCES users
├── park_id         INTEGER REFERENCES parks
├── plan_id         INTEGER REFERENCES plans  -- nullable
├── activation_date DATE NOT NULL
├── qso_count       INTEGER
├── bands_used      TEXT  -- JSON array
├── modes_used      TEXT  -- JSON array
├── adif_data       TEXT  -- Raw ADIF for reference
├── notes           TEXT
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

#### Weather Cache Table
```
weather_cache
├── id              INTEGER PRIMARY KEY
├── latitude        REAL NOT NULL
├── longitude       REAL NOT NULL
├── forecast_date   DATE NOT NULL
├── data            TEXT NOT NULL  -- JSON forecast data
├── fetched_at      TIMESTAMP NOT NULL
├── expires_at      TIMESTAMP NOT NULL
└── UNIQUE (latitude, longitude, forecast_date)
```

### 6.2 Data Directory Structure

```
~/.pota/
├── config.toml           # User configuration
├── pota.db               # SQLite database
├── cache/
│   ├── parks.json        # Cached park data for offline
│   └── weather/          # Weather cache files
├── exports/
│   └── plans/            # Exported plan files
└── logs/
    └── pota.log          # Application logs
```

### 6.3 Data Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA SYNC STRATEGY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PARKS DATABASE                                                 │
│  ├── Full sync: Weekly (or on demand)                           │
│  ├── Delta sync: Daily (new/changed parks only)                 │
│  ├── Offline: 30-day stale data acceptable                      │
│  └── Storage: ~50MB for full US database                        │
│                                                                 │
│  WEATHER DATA                                                   │
│  ├── Fetch: On demand when creating/viewing plans               │
│  ├── Cache TTL: 1 hour for current, 6 hours for forecasts       │
│  ├── Fallback: Show stale data with warning                     │
│  └── Storage: ~1KB per location per day                         │
│                                                                 │
│  COMMUNITY NOTES                                                │
│  ├── Fetch: When viewing park details                           │
│  ├── Cache TTL: 24 hours                                        │
│  └── Offline: Show cached, indicate staleness                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. External Service Integration

### 7.1 POTA.app API

**Purpose:** Park database, activation statistics, community data

```
Endpoints Used:
├── GET /parks                    # List all parks
├── GET /parks/{reference}        # Park details
├── GET /parks/{reference}/notes  # Community notes
└── GET /user/{callsign}/stats    # User statistics (optional)

Rate Limiting:
├── Respect: Unknown limits, assume conservative
├── Strategy: Batch requests, cache aggressively
└── Fallback: Use local cached data

Data Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ POTA.app │ ──► │  Sync    │ ──► │ Local DB │
│   API    │     │ Service  │     │ (SQLite) │
└──────────┘     └──────────┘     └──────────┘
     │                                  ▲
     │          ┌──────────┐            │
     └────────► │  Cache   │ ──────────┘
                │  Files   │
                └──────────┘
```

### 7.2 Weather Service

**Purpose:** 5-day forecasts for activation planning

**Recommended Provider:** OpenWeatherMap (free tier: 1,000 calls/day)

**Alternative Providers:** NOAA (US only), Open-Meteo (no API key required)

```
Request Flow:
1. Check cache for location + date
2. If cache miss or expired:
   a. Request forecast from primary provider
   b. Parse response to normalized format
   c. Cache result with TTL
3. Return forecast data

Normalized Weather Format:
{
  "location": {"lat": 44.43, "lon": -110.59},
  "fetched_at": "2024-06-10T14:00:00Z",
  "forecasts": [
    {
      "date": "2024-06-15",
      "high_temp": 72,
      "low_temp": 45,
      "precipitation_chance": 20,
      "precipitation_type": "rain",
      "wind_speed": 8,
      "wind_direction": "SW",
      "conditions": "Partly Cloudy",
      "sunrise": "05:32",
      "sunset": "21:04"
    }
  ]
}
```

### 7.3 Propagation Data (Optional Enhancement)

**Purpose:** Band condition recommendations

**MVP Approach:** Hardcoded heuristics (no external API)

```
Band Recommendation Heuristics:
┌─────────────────────────────────────────────────────────────────┐
│ TIME OF DAY        │ PRIMARY    │ SECONDARY  │ NOTES            │
├────────────────────┼────────────┼────────────┼──────────────────┤
│ Morning (6-10am)   │ 40m        │ 20m        │ Grayline DX      │
│ Midday (10am-4pm)  │ 20m        │ 17m, 15m   │ Peak activity    │
│ Evening (4-8pm)    │ 20m, 40m   │ 15m        │ Grayline DX      │
│ Night (8pm-6am)    │ 40m, 80m   │ 160m       │ Regional/local   │
├────────────────────┴────────────┴────────────┴──────────────────┤
│ SEASONAL ADJUSTMENTS:                                           │
│ • Summer: Favor higher bands (15m, 17m may open)                │
│ • Winter: Favor lower bands (80m, 160m better)                  │
│ • Equinox: Best overall conditions                              │
├─────────────────────────────────────────────────────────────────┤
│ DISCLAIMERS (always include):                                   │
│ "Band conditions vary based on solar activity, ionospheric      │
│  conditions, and local noise. These are general guidelines."    │
└─────────────────────────────────────────────────────────────────┘
```

**Future Enhancement:** VOACAP or hamQTH integration for real propagation data

---

## 8. Configuration System

### 8.1 Configuration File Format

**Location:** `~/.pota/config.toml`

```toml
# POTA Activation Planner Configuration
# Generated by: pota config init

[user]
callsign = "W1ABC"
grid_square = "FN42"
home_latitude = 42.3601
home_longitude = -71.0589
timezone = "America/New_York"

[preferences]
units = "imperial"              # imperial | metric
default_search_radius = 50      # miles or km based on units
default_equipment_preset = "qrp-portable"

[display]
color = true
table_style = "rounded"         # rounded | sharp | minimal | none
date_format = "YYYY-MM-DD"
time_format = "24h"             # 12h | 24h

[api_keys]
# OpenWeatherMap API key (optional, uses free tier)
openweathermap = "your-api-key-here"

[sync]
auto_sync = true
sync_interval_hours = 24
park_regions = ["US"]           # Regions to sync: US, CA, EU, etc.

[data]
database_path = "~/.pota/pota.db"
cache_directory = "~/.pota/cache"
export_directory = "~/.pota/exports"

[logging]
level = "info"                  # debug | info | warn | error
file = "~/.pota/logs/pota.log"
max_size_mb = 10
```

### 8.2 Environment Variables

Environment variables override config file values:

| Variable | Config Equivalent |
|----------|-------------------|
| `POTA_CALLSIGN` | `user.callsign` |
| `POTA_HOME_LAT` | `user.home_latitude` |
| `POTA_HOME_LON` | `user.home_longitude` |
| `POTA_CONFIG_PATH` | Config file location |
| `POTA_DATA_DIR` | Data directory location |
| `OPENWEATHERMAP_API_KEY` | `api_keys.openweathermap` |
| `POTA_NO_COLOR` | Force `display.color = false` |

### 8.3 First-Run Setup

```
$ pota
┌─────────────────────────────────────────────────────────────────┐
│  Welcome to POTA Activation Planner!                            │
│  Let's set up your operator profile.                            │
└─────────────────────────────────────────────────────────────────┘

Enter your callsign: W1ABC
Enter your grid square (e.g., FN42): FN42
Enter your home coordinates (or press Enter to skip):
  Latitude: 42.3601
  Longitude: -71.0589

Select your preferred units:
  [1] Imperial (miles, °F)
  [2] Metric (km, °C)
> 1

Configuration saved to ~/.pota/config.toml

Would you like to sync the park database now? [Y/n]: y
Syncing parks for region: US...
[████████████████████████████████] 100%
Synced 51,432 parks.

Setup complete! Type /help to get started.
```

---

## 9. Output Formats

### 9.1 Plan Output - Markdown

```markdown
# POTA Activation Plan

## Park Information
- **Reference:** K-0039
- **Name:** Yellowstone National Park
- **Location:** 44.4280°N, 110.5885°W
- **Grid Square:** DN44xk
- **State:** Wyoming

## Activation Details
- **Date:** Saturday, June 15, 2024
- **Time:** 10:00 AM - 2:00 PM (Local)
- **Duration:** 4 hours

## Weather Forecast
| Metric | Value |
|--------|-------|
| High | 72°F |
| Low | 45°F |
| Conditions | Partly Cloudy |
| Precipitation | 20% chance of rain |
| Wind | 8 mph SW |
| Sunrise | 5:32 AM |
| Sunset | 9:04 PM |

## Band Recommendations
| Time | Band | Mode | Notes |
|------|------|------|-------|
| 10:00-12:00 | 20m | SSB | Peak propagation |
| 10:00-12:00 | 17m | FT8 | Good opening likely |
| 12:00-14:00 | 20m | SSB | Continued activity |
| 12:00-14:00 | 15m | SSB | Summer opening possible |

> **Note:** Band conditions are estimates based on time of day and
> season. Actual propagation depends on solar conditions and
> ionospheric variability.

## Equipment Checklist
### Radio
- [ ] Icom IC-705 (10W)

### Antennas
- [ ] EFHW 20/40m
- [ ] Counterpoise wire

### Power
- [ ] LiFePO4 battery (6Ah)
- [ ] USB-C charging cable

### Accessories
- [ ] Logging notebook
- [ ] Pen (x2)
- [ ] Folding chair
- [ ] Sunscreen

## Community Notes
> "Good cell service at Old Faithful parking lot. Can use
> hotspot for spotting." - N7XYZ (May 2024)

> "Watch for bison near Hayden Valley operating spots." - K6ABC

---
*Generated by POTA Activation Planner on 2024-06-10*
*Callsign: W1ABC | Grid: FN42*
```

### 9.2 Plan Output - Plain Text

```
================================================================================
                        POTA ACTIVATION PLAN
================================================================================

PARK: K-0039 - Yellowstone National Park
      44.4280°N, 110.5885°W (DN44xk)
      Wyoming

DATE: Saturday, June 15, 2024
TIME: 10:00 AM - 2:00 PM (Local)

--------------------------------------------------------------------------------
WEATHER FORECAST
--------------------------------------------------------------------------------
High: 72°F    Low: 45°F    Conditions: Partly Cloudy
Precipitation: 20% chance of rain
Wind: 8 mph SW
Sunrise: 5:32 AM    Sunset: 9:04 PM

--------------------------------------------------------------------------------
BAND RECOMMENDATIONS
--------------------------------------------------------------------------------
10:00-12:00    20m SSB    Peak propagation
10:00-12:00    17m FT8    Good opening likely
12:00-14:00    20m SSB    Continued activity
12:00-14:00    15m SSB    Summer opening possible

Note: These are estimates. Actual conditions vary with solar activity.

--------------------------------------------------------------------------------
EQUIPMENT CHECKLIST
--------------------------------------------------------------------------------
[ ] Icom IC-705 (10W)
[ ] EFHW 20/40m antenna
[ ] Counterpoise wire
[ ] LiFePO4 battery (6Ah)
[ ] USB-C charging cable
[ ] Logging notebook
[ ] Pen (x2)
[ ] Folding chair
[ ] Sunscreen

--------------------------------------------------------------------------------
COMMUNITY NOTES
--------------------------------------------------------------------------------
* Good cell service at Old Faithful parking - N7XYZ
* Watch for bison near Hayden Valley - K6ABC

================================================================================
Generated: 2024-06-10 | Callsign: W1ABC | Grid: FN42
================================================================================
```

### 9.3 JSON Output

For scripting and integration:

```json
{
  "plan": {
    "id": "PLAN-2024-0615-K0039",
    "created_at": "2024-06-10T14:30:00Z",
    "status": "draft"
  },
  "park": {
    "reference": "K-0039",
    "name": "Yellowstone National Park",
    "latitude": 44.428,
    "longitude": -110.5885,
    "grid_square": "DN44xk",
    "state": "WY"
  },
  "activation": {
    "date": "2024-06-15",
    "start_time": "10:00",
    "end_time": "14:00",
    "timezone": "America/Denver"
  },
  "weather": {
    "high_temp": 72,
    "low_temp": 45,
    "conditions": "Partly Cloudy",
    "precipitation_chance": 20,
    "wind_speed": 8,
    "wind_direction": "SW"
  },
  "bands": [
    {"time": "10:00-12:00", "band": "20m", "mode": "SSB", "rating": "excellent"},
    {"time": "10:00-12:00", "band": "17m", "mode": "FT8", "rating": "good"},
    {"time": "12:00-14:00", "band": "20m", "mode": "SSB", "rating": "good"},
    {"time": "12:00-14:00", "band": "15m", "mode": "SSB", "rating": "fair"}
  ],
  "equipment": {
    "preset": "qrp-portable",
    "items": [
      {"type": "radio", "name": "Icom IC-705", "power": 10},
      {"type": "antenna", "name": "EFHW 20/40m"},
      {"type": "power", "name": "LiFePO4 6Ah"}
    ]
  },
  "operator": {
    "callsign": "W1ABC",
    "grid_square": "FN42"
  }
}
```

### 9.4 iCalendar Export

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//POTA Activation Planner//EN
BEGIN:VEVENT
UID:PLAN-2024-0615-K0039@pota-planner
DTSTART:20240615T100000
DTEND:20240615T140000
TZID:America/Denver
SUMMARY:POTA Activation: K-0039 Yellowstone NP
DESCRIPTION:Park: Yellowstone National Park (K-0039)\n
  Grid: DN44xk\n
  Bands: 20m, 17m, 15m\n
  Weather: Partly Cloudy, High 72°F\n
  \n
  Equipment: QRP Portable preset
LOCATION:44.428,-110.5885
GEO:44.428;-110.5885
CATEGORIES:POTA,Ham Radio
END:VEVENT
END:VCALENDAR
```

---

## 9.5 Non-Functional Requirements

This section defines measurable quality attributes that the implementation must achieve.

### 9.5.1 Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **CLI Startup Time** | < 200ms | Time from command execution to ready prompt |
| **Park Search (Cached)** | < 100ms | Database query with indexed fields |
| **Park Search (Full Text)** | < 2s | Unindexed search across full database |
| **Plan Creation** | < 3s | Including weather fetch and band calculation |
| **Park Sync (Delta)** | < 30s | Incremental sync of new/changed parks |
| **Park Sync (Full)** | < 5 min | Complete database refresh (~50K records) |
| **Memory Usage (Idle)** | < 50MB | Base application with no active session |
| **Memory Usage (Active)** | < 150MB | During plan creation with data loaded |
| **Database Size** | < 100MB | Full US park database with indexes |
| **Binary Size** | < 20MB | Single executable distribution (Rust/Go) |

**Performance Testing:**
- Use benchmarking tools appropriate to implementation language
- Test on minimum specified hardware (see below)
- Include cold start (first run) and warm start (cached) measurements

### 9.5.2 Reliability Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| **Offline Operation** | 100% | All core features work without network |
| **Cache Hit Rate** | > 80% | For repeated queries within TTL |
| **Graceful Degradation** | Always | No crashes on network/API failures |
| **Data Integrity** | 100% | No data loss on application crash |
| **Database Migration** | 100% | Zero data loss on schema upgrades |
| **Error Recovery** | Automatic | Transient network errors auto-retry |

**Failure Modes:**
- **Network unavailable:** Use cached data with timestamp warning
- **API rate limit exceeded:** Queue requests or use cached data
- **Corrupt database:** Automatic backup restoration, clear error message
- **Invalid config:** Use defaults with warning, log details
- **Outdated sync:** Show data age prominently, allow forced refresh

### 9.5.3 Availability Requirements

| Aspect | Target |
|--------|--------|
| **Application Uptime** | User-controlled (local application) |
| **Data Availability** | 100% (local-first) |
| **Feature Availability** | Core features: 100%, Enhanced features: best-effort |

### 9.5.4 Security Requirements

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| **API Key Storage** | Encrypted at rest | OS keychain or encrypted config |
| **API Key Transmission** | TLS 1.3 | HTTPS for all external API calls |
| **Input Validation** | 100% of user inputs | Sanitize all inputs, prevent injection |
| **SQL Injection Prevention** | 100% | Parameterized queries only |
| **Path Traversal Prevention** | 100% | Validate all file paths |
| **Secret Exclusion** | No secrets in logs | Structured logging with redaction |
| **Config File Permissions** | 0600 (user-only) | Set on creation, validate on load |

**Security Testing:**
- Static analysis for common vulnerabilities (OWASP CLI top 10)
- Dependency scanning for known CVEs
- Input fuzzing for crash/error handling
- Penetration testing of external API integrations

### 9.5.5 Usability Requirements

| Metric | Target |
|--------|--------|
| **Help Coverage** | 100% of commands have help text |
| **Error Messages** | Actionable (include suggestions) |
| **Command Discovery** | < 3 commands to reach any feature |
| **Learning Curve** | < 30 minutes for basic workflows |
| **Terminal Compatibility** | Works on 80x24 minimum |

### 9.5.6 Compatibility Requirements

| Platform | Minimum Version | Notes |
|----------|----------------|-------|
| **Windows** | Windows 10 1809 | Terminal API support |
| **macOS** | macOS 11 (Big Sur) | Modern terminal features |
| **Linux** | Any with glibc 2.17+ | Most distributions |
| **Terminal** | xterm-256color compatible | Color support required |

### 9.5.7 Maintainability Requirements

| Metric | Target |
|--------|--------|
| **Code Coverage** | > 80% for critical paths |
| **Test Automation** | All tests runnable in CI |
| **Documentation** | All public APIs documented |
| **Code Style** | Automated enforcement (linter/formatter) |
| **Dependency Updates** | Monthly review cycle |

### 9.5.8 Observability Requirements

| Requirement | Target |
|-------------|--------|
| **Logging** | Structured JSON logs to file |
| **Error Tracking** | Stack traces for all errors |
| **Performance Metrics** | Optional CLI flag for timing |
| **Debug Mode** | Verbose logging with request/response details |

---

## 10. Error Handling

### 10.1 Error Categories

| Category | Exit Code | User Message Pattern |
|----------|-----------|---------------------|
| User Input | 1 | "Invalid [field]: [reason]" |
| Not Found | 2 | "[Resource] not found: [identifier]" |
| Network | 3 | "Cannot reach [service]: [details]" |
| Configuration | 4 | "Configuration error: [details]" |
| Data | 5 | "Data error: [details]" |
| Internal | 99 | "Internal error. Please report this issue." |

### 10.2 Error Display

```
✗ Error: Park not found: K-9999

  The park reference "K-9999" was not found in the database.

  Suggestions:
  • Check the reference format (e.g., K-1234, VE-1234)
  • Run 'pota sync parks' to update the database
  • Search by name: pota park search "park name"

  If this park exists on POTA.app, please report this as a bug.
```

### 10.3 Graceful Degradation

| Failure | Degraded Behavior |
|---------|-------------------|
| Weather API down | Show cached data with warning, or omit weather section |
| POTA API down | Use local database, show sync age warning |
| Network offline | Full offline mode using cached data |
| Invalid config | Use defaults, warn user |

---

### 10.4 State Management

The CLI application maintains several layers of state, particularly in interactive REPL mode.

#### 10.4.1 Session State (REPL Mode)

State maintained during an interactive session:

| State Component | Lifetime | Description |
|-----------------|----------|-------------|
| **Current Park** | Session | Park reference selected via `/select` command |
| **Current Plan** | Session | Plan ID being worked on |
| **Command History** | Session | Last 100 commands (persisted to file) |
| **Search Context** | Transient | Last search query and filters |
| **User Preferences** | Application | Display settings, units, etc. |

**State Transitions:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     REPL SESSION STATE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [START]                                                        │
│     │                                                           │
│     ├──► Load config from ~/.pota/config.toml                  │
│     ├──► Initialize database connection                        │
│     ├──► Load user profile                                     │
│     └──► Display welcome banner                                │
│                                                                 │
│  [RUNNING LOOP]                                                 │
│     │                                                           │
│     ├──► Accept command input                                  │
│     ├──► Parse command and arguments                           │
│     ├──► Update session state based on command                 │
│     │   • /select <ref> → Set currentPark                      │
│     │   • plan create → Set currentPlan                        │
│     │   • /context → Display current state                     │
│     ├──► Execute command with current context                  │
│     └──► Return to prompt                                      │
│                                                                 │
│  [EXIT]                                                         │
│     │                                                           │
│     ├──► Save command history                                  │
│     ├──► Close database connection                             │
│     └──► Persist any unsaved changes                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.4.2 Current Park Context

When a park is selected in REPL mode, the following context is maintained:

```typescript
interface ParkContext {
  reference: string;        // e.g., "K-0039"
  name: string;
  location: {
    latitude: number;
    longitude: number;
    gridSquare: string;
  };
  loadedAt: Date;          // When context was set
  weatherCache?: WeatherData;  // Cached weather for this park
  notesCache?: ParkNote[];     // Cached community notes
}
```

**Commands Using Park Context:**
- `/plan` - Creates plan for current park
- `/weather` - Shows weather for current park
- `/bands` - Shows band recommendations for current park
- Any command that uses `<ref>` argument can omit it when context is set

#### 10.4.3 Current Plan Context

When a plan is being created/edited:

```typescript
interface PlanContext {
  planId: string;
  status: 'draft' | 'finalized' | 'completed';
  parkReference: string;
  plannedDate: Date;
  presetId?: string;
  modifiedAt: Date;
}
```

**Commands Using Plan Context:**
- `/show` - Displays current plan
- `/export` - Exports current plan
- `plan edit` - Edits current plan (omits `<id>` argument)

#### 10.4.4 Cache Management

**Cache Hierarchy:**

```
L1: In-Memory Cache (Session)
├── Current park details
├── Current plan data
├── Weather for current park
└── TTL: Session lifetime

L2: Database Cache (Persistent)
├── Park database (synced from POTA.app)
├── Park notes (fetched from API)
├── Weather cache (time-based expiry)
└── TTL: Configurable per data type

L3: File Cache (Offline Fallback)
├── ~/pota/cache/parks.json (backup)
├── Exported plans
└── TTL: Manual deletion
```

**Cache TTL Policies:**

| Data Type | TTL | Refresh Strategy |
|-----------|-----|------------------|
| Park database | 7 days | Delta sync daily, full sync weekly |
| Weather forecast | 1 hour | On-demand fetch |
| Weather historical | 6 hours | On-demand fetch |
| Community notes | 24 hours | On-demand fetch |
| User profile | Never | Manual update |

#### 10.4.5 Thread Safety Considerations

For single-threaded implementations (Python, Node.js):
- No concurrency concerns within single process
- File locks for database writes

For multi-threaded implementations (Rust, Go):
- Database connection pooling
- Mutex for session state mutations
- Atomic cache updates
- Read-write locks for config reload

#### 10.4.6 State Persistence

**What Gets Saved:**

| Data | Location | When |
|------|----------|------|
| User configuration | `~/.pota/config.toml` | On change |
| Database | `~/.pota/pota.db` | Transactional |
| Command history | `~/.pota/history.txt` | On REPL exit |
| Exported plans | `~/.pota/exports/plans/` | On export |

**What Is NOT Saved:**
- REPL session state (current park/plan context)
- Search history beyond command history
- In-memory cache

---

### 10.5 Security Considerations

This section defines the threat model and mitigation strategies for the CLI application.

#### 10.5.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| API key exposure in config | Medium | High | Encrypted storage, file permissions |
| SQL injection via search | Low | High | Parameterized queries, input validation |
| Path traversal in exports | Low | Medium | Path validation, sandbox directory |
| Supply chain attack | Low | High | Dependency pinning, SBOM |
| Config file tampering | Medium | Medium | Config validation, checksums |
| Log data leakage | Low | Medium | Secret redaction, log rotation |

#### 10.5.2 API Key Management

**Threat:** API keys stored in configuration files could be exposed if the file is compromised or accidentally shared.

**Mitigations:**

1. **Encrypted Storage (Recommended for production):**
   ```bash
   # Use OS keychain when available
   - macOS: Keychain
   - Windows: Credential Manager
   - Linux: Secret Service API (gnome-keyring, kwallet)

   # Fallback: Encrypted config file
   - AES-256-GCM encryption
   - Key derived from user password or hardware key
   ```

2. **File Permissions:**
   ```bash
   # Set restrictive permissions on config
   chmod 600 ~/.pota/config.toml  # User read/write only

   # Validate permissions on load
   if (file_mode & 077) != 0:
     warn("Config file has overly permissive permissions")
   ```

3. **Environment Variable Override:**
   ```bash
   # Allow runtime override without storing in file
   export OPENWEATHERMAP_API_KEY="sk-..."
   pota plan create K-0039
   ```

4. **Never Log Secrets:**
   ```go
   // Redact API keys in logs
   log.Debugf("Using API key: %s", redactKey(key))
   // Output: "Using API key: sk-****...****1234"
   ```

#### 10.5.3 Input Validation

**Threat:** Malicious input could cause SQL injection, path traversal, or command injection.

**Mitigations:**

1. **Park Reference Validation:**
   ```regex
   # Strict format: [A-Z]{1,3}-\d{4,5}
   # Valid: K-0039, VE-12345, G-1234
   # Invalid: k-0039, K-039, K-0039'; DROP TABLE parks--
   ^[A-Z]{1,3}-\d{4,5}$
   ```

2. **Date Validation:**
   ```python
   # Use proper date parsing, not string concatenation
   from datetime import datetime
   try:
       date = datetime.strptime(user_input, "%Y-%m-%d").date()
       # Enforce reasonable range
       if date < datetime.now().date() - timedelta(days=365*5):
           raise ValueError("Date too far in past")
       if date > datetime.now().date() + timedelta(days=365*2):
           raise ValueError("Date too far in future")
   except ValueError as e:
       return error(f"Invalid date: {e}")
   ```

3. **Path Validation for Exports:**
   ```rust
   // Enforce export directory sandbox
   fn validate_export_path(path: &str) -> Result<PathBuf> {
       let full_path = PathBuf::from(path);
       let export_dir = dirs::home_dir()
           .unwrap()
           .join(".pota/exports");

       // Canonicalize to resolve ".." and symlinks
       let canonical = full_path.canonicalize()?;

       if !canonical.starts_with(&export_dir) {
           return Err(Error::InvalidPath(
               "Export path must be within ~/.pota/exports"
           ));
       }

       Ok(canonical)
   }
   ```

4. **SQL Injection Prevention:**
   ```python
   # NEVER do this:
   query = f"SELECT * FROM parks WHERE reference = '{user_input}'"

   # ALWAYS use parameterized queries:
   query = "SELECT * FROM parks WHERE reference = ?"
   cursor.execute(query, (user_input,))
   ```

#### 10.5.4 Config File Security

**Threat:** Config file tampering or corruption could cause unexpected behavior.

**Mitigations:**

1. **Config Validation on Load:**
   ```yaml
   # Define schema with validation
   schema:
     user:
       callsign:
         type: string
         pattern: "^[A-Z0-9]{2,3}[A-Z]{1,3}$"
       grid_square:
         type: string
         pattern: "^[A-R]{2}[0-9]{2}$"
     api_keys:
       openweathermap:
         type: string
         format: "api-key"
   ```

2. **Config Checksum:**
   ```bash
   # Store SHA-256 hash of expected config
   ~/.pota/config.toml.sha256

   # On load, verify integrity
   if hash != expected_hash:
     warn("Config file modified externally")
     prompt("Revert to known-good configuration?")
   ```

3. **Default Config Template:**
   ```bash
   # Ship default config, copy on first run
   cp /usr/share/pota/config.template ~/.pota/config.toml
   ```

#### 10.5.5 Supply Chain Security

**Threat:** Malicious dependencies could compromise the application.

**Mitigations:**

1. **Dependency Pinning:**
   ```toml
   # Cargo.toml (Rust)
   [dependencies]
   clap = { version = "4.4", features = ["derive"] }
   sqlite = "0.31"

   # requirements.txt (Python)
   click==8.1.7
   rich==13.7.0
   ```

2. **SBOM Generation:**
   ```bash
   # Generate Software Bill of Materials
   cargo sbom > sbom.json
   # or
   pip install pip-audit
   pip-audit --format json > audit-report.json
   ```

3. **Automated Scanning:**
   ```yaml
   # CI/CD pipeline
   - name: Dependency Security Scan
     run: |
       cargo audit || true
       # or
       pip-audit
       # or
       npm audit
   ```

#### 10.5.6 Audit Logging

**Purpose:** Track security-relevant events for troubleshooting and forensic analysis.

**What to Log:**

| Event | Log Level | Fields |
|-------|-----------|--------|
| Config loaded | INFO | timestamp, config_path |
| API key used | DEBUG | timestamp, service, key_redacted |
| Database opened | INFO | timestamp, db_path |
| External API call | DEBUG | timestamp, endpoint, status |
- [ ] Database query executed | TRACE | timestamp, query, rows |
| Error occurred | ERROR | timestamp, error_type, message, stack_trace |
| Export created | INFO | timestamp, file_path, format |

**What NOT to Log:**

```
❌ Never log:
- API keys in plaintext
- Passwords
- User PII (home address, email, phone)
- Full query parameters with sensitive data
- Session tokens or cookies

✅ Instead log:
- API keys redacted: "sk-****...****1234"
- Query counts: "executed 5 queries"
- Operation success/failure
```

**Log Rotation:**

```toml
[logging]
level = "info"
file = "~/.pota/logs/pota.log"
max_size_mb = 10
max_files = 5  # Keep last 5 files
compress = true  # Gzip old logs
```

#### 10.5.7 Network Security

**HTTPS Enforcement:**

```go
// Never allow HTTP for API calls
client := &http.Client{
    Transport: &http.Transport{
        TLSClientConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    },
}
```

**Certificate Validation:**

```python
# Never disable certificate verification
requests.get(url, verify=True)  # Always verify

# For corporate proxies with custom CA:
import certifi
ca_bundle = certifi.where()
requests.get(url, verify=ca_bundle)
```

**Timeout Configuration:**

```rust
// Prevent hanging connections
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(30))
    .connect_timeout(Duration::from_secs(10))
    .build()?;
```

#### 10.5.8 Sandboxing Considerations

**For Enhanced Security Post-MVP:**

| Platform | Sandbox Technology | Notes |
|----------|-------------------|-------|
| Linux | Firejail, systemd user units | Limit file system access |
| macOS | Sandbox entitlements | Restrict network, files |
| Windows | AppContainer | Windows Store deployment |

**Current Approach (MVP):**
- Run with user privileges (no root/admin required)
- No network services (outbound connections only)
- No system-level modifications

---

## 11. Implementation Guidelines

### 11.1 Recommended Technology Choices

The design is language-agnostic. Here are suitable options per platform:

| Platform | Language | CLI Framework | DB | Notes |
|----------|----------|---------------|-----|-------|
| Cross-platform | Rust | clap + ratatui | SQLite | Best performance, single binary |
| Cross-platform | Go | cobra + bubbletea | SQLite | Good tooling, fast builds |
| Cross-platform | Python | click + rich | SQLite | Rapid development, wide adoption |
| Cross-platform | Node.js | commander + ink | better-sqlite3 | JS ecosystem familiarity |
| Cross-platform | .NET | System.CommandLine + Spectre | SQLite | Enterprise-friendly |

### 11.2 Project Structure (Generic)

```
pota-cli/
├── src/
│   ├── main              # Entry point, CLI parsing
│   ├── commands/         # Command implementations
│   │   ├── park/         # Park subcommands
│   │   ├── plan/         # Plan subcommands
│   │   ├── gear/         # Equipment subcommands
│   │   └── sync/         # Sync subcommands
│   ├── services/         # Business logic
│   │   ├── park_service
│   │   ├── plan_service
│   │   ├── weather_service
│   │   └── band_service
│   ├── data/             # Data access layer
│   │   ├── database
│   │   ├── migrations/
│   │   └── models/
│   ├── api/              # External API clients
│   │   ├── pota_client
│   │   └── weather_client
│   ├── ui/               # Terminal UI components
│   │   ├── tables
│   │   ├── prompts
│   │   └── formatters
│   └── config/           # Configuration handling
├── tests/
├── docs/
└── README.md
```

### 11.3 Implementation Phases

#### Phase 1: Foundation
1. Project scaffolding and CLI framework setup
2. Configuration system (file + env vars)
3. Database schema and migrations
4. Basic CRUD operations for all entities

#### Phase 2: Core Features
1. Park sync from POTA.app
2. Park search and display
3. Equipment management
4. Plan creation workflow

#### Phase 3: Intelligence
1. Weather integration
2. Band recommendation engine
3. Plan generation with all components

#### Phase 4: Polish
1. Interactive mode (REPL)
2. Guided wizard
3. Export formats (MD, PDF, ICS)
4. Offline mode refinements

#### Phase 5: Enhancement
1. Activation logging
2. ADIF import/export
3. Statistics and progress tracking
4. Multi-park planning

### 11.4 Testing Strategy

| Test Type | Coverage Target | Tools |
|-----------|-----------------|-------|
| Unit | Business logic, formatters | Language-native test framework |
| Integration | Database, API clients | In-memory DB, mock servers |
| CLI | Command parsing, output | Snapshot testing, CLI test runners |
| E2E | Full workflows | Script-based automation |

---

### 11.5 Distribution Strategy

This section defines how the CLI application will be packaged and distributed to users across different platforms.

#### 11.5.1 Distribution Channels

| Channel | Platform | Auto-Update | Notes |
|---------|----------|-------------|-------|
| Platform Package Manager | All | Varies | Preferred distribution method |
| Binary Release | All | Manual | Fallback for advanced users |
| Container Registry | All | Yes | For reproducible environments |

#### 11.5.2 Platform Package Managers

**Rust Implementation (Primary Recommendation):**

```bash
# crates.io (cross-platform)
cargo install pota-cli

# Homebrew (macOS/Linux)
brew tap pota-assistant/pota
brew install pota-cli

# Scoop (Windows)
scoop bucket add pota-assistant
scoop install pota-cli

# AUR (Arch Linux)
yay -S pota-cli
# or
paru -S pota-cli
```

**Go Implementation:**

```bash
# Go install (cross-platform)
go install github.com/pota-assistant/cli@latest

# Homebrew
brew tap pota-assistant/pota
brew install pota-cli

# Scoop
scoop bucket add pota-assistant
scoop install pota-cli

# AUR
yay -S pota-cli-go
```

**Python Implementation:**

```bash
# PyPI (cross-platform)
pip install pota-cli

# Homebrew (via pip)
brew install pota-cli
# Actually installs: brew install python && pip install pota-cli

# Scoop
scoop install pota-cli
```

#### 11.5.3 Homebrew Formula (macOS/Linux)

```ruby
# Formula/pota-cli.rb
class PotaCli < Formula
  desc "POTA Activation Planner CLI"
  homepage "https://github.com/pota-assistant/cli"
  url "https://github.com/pota-assistant/cli/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "a1b2c3d4e5f6..."

  depends_on "rust" => :build

  def install
    system "cargo", "install", *std_cargo_args
  end

  test do
    assert_match "POTA Activation Planner v#{version}",
      shell_output("#{bin}/pota --version")
  end
end
```

**Update Process:**
```bash
# Automatic update detection
brew update
brew upgrade pota-cli

# Manual update
brew reinstall pota-cli
```

#### 11.5.4 Scoop Manifest (Windows)

```json
// bucket/pota-cli.json
{
  "version": "1.0.0",
  "description": "POTA Activation Planner CLI",
  "homepage": "https://github.com/pota-assistant/cli",
  "license": "MIT",
  "url": "https://github.com/pota-assistant/cli/releases/download/v1.0.0/pota-cli-windows-x64.exe",
  "hash": "a1b2c3d4e5f6...",
  "bin": "pota-cli-windows-x64.exe",
  "post_install": [
    "Move-Item \"$dir\\pota-cli-windows-x64.exe\" \"$dir\\pota.exe\""
  ]
}
```

#### 11.5.5 AUR Package (Arch Linux)

```bash
# PKGBUILD
pkgname=pota-cli
pkgver=1.0.0
pkgrel=1
pkgdesc="POTA Activation Planner CLI"
arch=('x86_64' 'aarch64')
url="https://github.com/pota-assistant/cli"
license=('MIT')
makedepends=('rust' 'cargo')

build() {
  cd "$pkgname-$pkgver"
  cargo build --release
}

package() {
  cd "$pkgname-$pkgver"
  install -Dm755 "target/release/pota" "$pkgdir/usr/bin/pota"
}
```

#### 11.5.6 Binary Releases

**GitHub Release Structure:**

```
https://github.com/pota-assistant/cli/releases/v1.0.0/

Assets:
├── pota-cli-windows-x64.exe
├── pota-cli-windows-x64.exe.sha256
├── pota-cli-windows-arm64.exe
├── pota-cli-windows-arm64.exe.sha256
├── pota-cli-linux-x64
├── pota-cli-linux-x64.sha256
├── pota-cli-linux-arm64
├── pota-cli-linux-arm64.sha256
├── pota-cli-macos-x64
├── pota-cli-macos-x64.sha256
├── pota-cli-macos-apple-silicon
└── pota-cli-macos-apple-silicon.sha256
```

**Installation from Binary:**

```bash
# Download and verify
curl -LO https://github.com/.../pota-cli-linux-x64
curl -LO https://github.com/.../pota-cli-linux-x64.sha256
sha256sum -c pota-cli-linux-x64.sha256

# Install
chmod +x pota-cli-linux-x64
sudo mv pota-cli-linux-x64 /usr/local/bin/pota

# Verify
pota --version
```

#### 11.5.7 Container Distribution

**Docker Hub:**

```dockerfile
# Dockerfile
FROM rust:1.75-alpine AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM alpine:3.19
COPY --from=builder /app/target/release/pota /usr/local/bin/pota
ENTRYPOINT ["pota"]
```

**Usage:**

```bash
# Run interactively
docker run -it --rm \
  -v ~/.pota:/home/pota/.pota \
  pota-assistant/cli pota search yellowstone

# Run as alias
alias pota='docker run -it --rm -v ~/.pota:/home/pota/.pota pota-assistant/cli pota'
pota search yellowstone
```

#### 11.5.8 Update Notification

**Built-in Update Check:**

```bash
$ pota
┌─────────────────────────────────────────────────────────────────┐
│  A new version is available: v1.0.1 (current: v1.0.0)           │
│  Run 'pota upgrade' or 'brew upgrade pota-cli' to update.       │
│                                                                 │
│  [Upgrade Now]  [Skip This Version]  [Dismiss]                  │
└─────────────────────────────────────────────────────────────────┘

pota> /upgrade
Fetching release information...
Downloading v1.0.1...
Installing update...
Restarting...
```

**Implementation Notes:**

| Feature | Implementation |
|---------|----------------|
| Version check | GitHub releases API on startup (configurable) |
| Auto-update | Platform-specific (Homebrew: `brew upgrade`, etc.) |
| Changelog display | Show on update prompt |
| Rollback | Keep previous binary version |

#### 11.5.9 Installation Documentation

**Quick Install (one-liner per platform):**

```bash
# macOS/Linux (Homebrew)
brew install pota-assistant/pota/pota-cli

# Windows (Scoop)
scoop bucket add pota-assistant && scoop install pota-cli

# Arch Linux (AUR)
yay -S pota-cli

# Rust/Cargo
cargo install pota-cli

# Docker
docker pull pota-assistant/cli
```

---

### 11.6 Observability

This section defines the logging, debugging, and monitoring approach for the CLI application.

#### 11.6.1 Logging Architecture

**Structured JSON Logging:**

```json
{
  "timestamp": "2024-06-10T14:30:45.123Z",
  "level": "info",
  "message": "Plan created successfully",
  "context": {
    "requestId": "req-abc123",
    "userId": "W1ABC",
    "planId": "PLAN-2024-0615-K0039",
    "parkReference": "K-0039",
    "duration_ms": 1245
  },
  "labels": {
    "version": "1.0.0",
    "command": "plan.create",
    "os": "darwin"
  }
}
```

**Log Levels:**

| Level | When to Use | Example |
|-------|-------------|---------|
| **TRACE** | Extremely detailed diagnostics | "Database query: SELECT * FROM parks WHERE reference = ?" |
| **DEBUG** | Detailed information for debugging | "Weather cache miss for coordinates 44.43,-110.59" |
| **INFO** | Normal operational milestones | "Plan created: PLAN-2024-0615-K0039" |
| **WARN** | Unexpected but recoverable conditions | "Weather API rate limit exceeded, using cache" |
| **ERROR** | Error events that don't terminate the app | "Failed to fetch community notes, continuing without them" |
| **FATAL** | Errors that terminate the application | "Database corrupted: cannot open pota.db" |

#### 11.6.2 What to Log

**Required Fields for All Logs:**

```typescript
interface LogEntry {
  timestamp: ISO8601;    // Always UTC
  level: LogLevel;       // trace/debug/info/warn/error/fatal
  message: string;       // Human-readable description
  context: {
    requestId?: string;  // For correlation (UUID)
    command?: string;    // Command being executed
    userId?: string;     // Callsign (never PII)
    duration_ms?: number; // Operation timing
  };
}
```

**Context to Include:**

| Operation | Context Fields |
|-----------|----------------|
| Command execution | command, args (sanitized), duration_ms |
| API call | endpoint, status_code, response_time_ms |
| Database query | table, operation (SELECT/INSERT/UPDATE), row_count |
| Cache operation | key, hit/miss, ttl_remaining |
| Error | error_type, error_message, stack_trace |

**What NOT to Log:**

```
❌ NEVER log:
- API keys in plaintext: "sk-abc123..." → "sk-****...****1234"
- Passwords or secrets
- User's home address or coordinates (park coordinates are OK)
- Full query parameters with sensitive data
- Session tokens
- PII: email, phone, full name

✅ Instead log:
- Redacted values: "sk-****...****1234"
- Hashes: "api_key_sha256: a1b2c3..."
- Success/failure only: "Authentication succeeded"
```

#### 11.6.3 Log Formatting

**Console Output (Human-Readable):**

```bash
$ pota plan create K-0039 --date 2024-06-15
[2024-06-10 14:30:45] INFO  Plan created successfully
  Plan ID: PLAN-2024-0615-K0039
  Park: K-0039 (Yellowstone National Park)
  Duration: 1.2s
  Weather: Fetched from OpenWeatherMap
```

**File Output (Structured JSON):**

```json
{
  "timestamp": "2024-06-10T14:30:45.123Z",
  "level": "info",
  "message": "Plan created successfully",
  "context": {
    "planId": "PLAN-2024-0615-K0039",
    "parkReference": "K-0039",
    "parkName": "Yellowstone National Park",
    "duration_ms": 1245,
    "weatherSource": "OpenWeatherMap"
  }
}
```

#### 11.6.4 Log Configuration

**Configuration File:**

```toml
[logging]
level = "info"                  # Default level
file = "~/.pota/logs/pota.log"
max_size_mb = 10
max_files = 5
console_format = "human"        # human | json
file_format = "json"            # human | json

[logging.redaction]
redact_api_keys = true
redact_coordinates = false      # Park coords are OK
redact_user_data = true
```

**Environment Variables:**

```bash
# Override log level
export POTA_LOG_LEVEL=debug

# Log to file only (no console output)
export POTA_LOG_QUIET=true

# Structured console output
export POTA_LOG_FORMAT=json
```

#### 11.6.5 Debugging Features

**Verbose Mode:**

```bash
$ pota --verbose plan create K-0039 --date 2024-06-15
[DEBUG] Loading config from /home/user/.pota/config.toml
[DEBUG] Database opened: /home/user/.pota/pota.db
[DEBUG] Park lookup: K-0039
[TRACE] SQL: SELECT * FROM parks WHERE reference = ? LIMIT 1
[TRACE] SQL parameters: ["K-0039"]
[TRACE] SQL execution time: 2ms
[DEBUG] Park found: K-0039 - Yellowstone National Park
[DEBUG] Weather cache miss for (44.428, -110.588)
[DEBUG] Fetching weather from OpenWeatherMap API
[DEBUG] API request: GET https://api.openweathermap.org/... (redacted)
[DEBUG] API response: 200 OK (245ms)
[DEBUG] Weather cached with TTL: 3600s
[DEBUG] Calculating band recommendations for 2024-06-15
[INFO] Plan created successfully: PLAN-2024-0615-K0039
```

**Timing Information:**

```bash
$ pota --timing plan create K-0039 --date 2024-06-15
[INFO] Plan created successfully
[INFO] Timing breakdown:
       Config load:        5ms
       Park lookup:        12ms
       Weather fetch:      1245ms
       Band calculation:   8ms
       Plan save:          15ms
       ───────────────────
       Total:              1285ms
```

**Query Logging (TRACE level):**

```bash
$ POTA_LOG_LEVEL=trace pota search yellowstone
[TRACE] SQL: SELECT reference, name, state, latitude, longitude
         FROM parks
         WHERE name LIKE ?
         ORDER BY state, name
         LIMIT 20
[TRACE] Parameters: ["%yellowstone%"]
[TRACE] Query execution time: 8ms
[TRACE] Rows returned: 3
```

#### 11.6.6 Error Reporting

**Error Message Format:**

```typescript
interface ErrorContext {
  errorType: string;        // e.g., "NetworkError", "ValidationError"
  errorMessage: string;     // Human-readable description
  errorCode?: string;       // Machine-readable code
  suggestions?: string[];   // Recovery suggestions
  stackTrace?: string;      // Only in debug/trace modes
  requestId?: string;       // For correlation
}
```

**Example Error Output:**

```bash
$ pota plan create K-9999 --date 2024-06-15
✗ Error: Park not found: K-9999

  The park reference "K-9999" was not found in the database.

  Suggestions:
  • Check the reference format (e.g., K-1234, VE-1234)
  • Run 'pota sync parks' to update the database
  • Search by name: pota park search "park name"

  Request ID: req-abc123-def456
  Debug: Run with --verbose for more details
```

#### 11.6.7 Metrics (Optional Enhancement)

**Local Metrics Storage:**

```toml
[metrics]
enabled = true
file = "~/.pota/metrics.json"
retention_days = 30
```

**Metrics Collected:**

```json
{
  "timestamp": "2024-06-10T14:30:45Z",
  "version": "1.0.0",
  "commands": {
    "park.search": 45,
    "plan.create": 12,
    "sync.parks": 3
  },
  "performance": {
    "avg_plan_creation_ms": 1245,
    "p95_plan_creation_ms": 2100,
    "cache_hit_rate": 0.87
  },
  "errors": {
    "network_error": 2,
    "not_found_error": 5
  }
}
```

**Metrics Display:**

```bash
$ pota stats
Usage Statistics (Last 30 days)

┌────────────────────────────────┬──────────┐
│ Command                        │ Count    │
├────────────────────────────────┼──────────┤
│ park search                    │ 45       │
│ plan create                    │ 12       │
│ sync parks                     │ 3        │
└────────────────────────────────┴──────────┘

Performance:
  Average plan creation: 1.2s
  Cache hit rate: 87%
  Errors: 7

To report issues, include:
  Version: 1.0.0
  Request ID: (available in logs)
```

#### 11.6.8 Log File Management

**Rotation:**

```bash
~/.pota/logs/
├── pota.log              # Current log
├── pota.log.1.gz         # Previous (compressed)
├── pota.log.2.gz
├── pota.log.3.gz
├── pota.log.4.gz
└── pota.log.5.gz         # Oldest
```

**Cleanup:**

```bash
$ pota logs cleanup
Removed 23 log files older than 30 days.
Freed 145 MB of disk space.
```

**Log Inspection:**

```bash
# Tail logs with filtering
$ pota logs tail --level error
[2024-06-10 14:30:45] ERROR Failed to fetch weather: Connection timeout

# Search logs
$ pota logs search "K-0039"
[2024-06-10 14:30:45] INFO  Plan created: PLAN-2024-0615-K0039
[2024-06-10 14:28:12] DEBUG Park lookup: K-0039

# Export logs for bug report
$ pota logs export --since "2024-06-01" --format json > bug-report.json
```

---

## Appendices

### Appendix A: Maidenhead Grid Square Reference

Grid squares are 4-6 character codes representing geographic locations:
- Field (2 chars): 10° lat × 20° lon (e.g., "FN")
- Square (2 digits): 1° × 2° (e.g., "FN42")
- Subsquare (2 chars): 2.5' × 5' (e.g., "FN42ab")

### Appendix B: POTA Reference Format

| Prefix | Region |
|--------|--------|
| K- | United States |
| VE- | Canada |
| G- | England |
| DL- | Germany |
| JA- | Japan |

Full reference: `{prefix}{4-5 digit number}` (e.g., K-0039, VE-1234)

### Appendix C: ADIF Field Mapping

| POTA Field | ADIF Field |
|------------|------------|
| Park Reference | MY_SIG_INFO |
| Callsign | STATION_CALLSIGN |
| Grid Square | MY_GRIDSQUARE |
| Date | QSO_DATE |
| Time | TIME_ON |
| Band | BAND |
| Mode | MODE |

### Appendix D: Weather Condition Codes

Standardized condition strings for consistent display:

```
Clear, Partly Cloudy, Mostly Cloudy, Overcast,
Light Rain, Rain, Heavy Rain, Thunderstorms,
Light Snow, Snow, Heavy Snow, Sleet,
Fog, Mist, Haze, Windy
```

### Appendix E: Testing Examples

This appendix provides concrete testing scenarios and examples to guide implementation.

#### E.1 Unit Test Examples

**Business Logic Tests:**

```python
# tests/test_band_service.py
import pytest
from pota.services.band_service import BandService

class TestBandRecommendations:
    """Test band recommendation logic"""

    def test_morning_bands_spring(self):
        """Morning (6-10am) in spring should recommend 40m primary"""
        service = BandService()
        date = datetime(2024, 4, 15, 8, 0)  # 8am, April 15

        bands = service.get_bands_for_time(date)

        assert bands.primary == "40m"
        assert "40m" in bands.recommended
        assert "20m" in bands.recommended

    def test_summer_higher_bands(self):
        """Summer should include higher band recommendations"""
        service = BandService()
        date = datetime(2024, 7, 15, 14, 0)  # 2pm, July 15

        bands = service.get_bands_for_time(date)

        # Summer afternoons may have 15m/17m openings
        assert "15m" in bands.recommended or "17m" in bands.recommended

    def test_night_low_bands(self):
        """Night should recommend 40m/80m/160m"""
        service = BandService()
        date = datetime(2024, 1, 15, 2, 0)  # 2am, January 15

        bands = service.get_bands_for_time(date)

        assert "40m" in bands.recommended
        assert any(b in ["80m", "160m"] for b in bands.recommended)
```

**Formatter Tests:**

```python
# tests/test_formatters.py
from pota.ui.formatters import TableFormatter

def test_park_table_format():
    """Park tables display correctly"""
    parks = [
        {"ref": "K-0039", "name": "Yellowstone National Park", "state": "WY", "dist": 342},
        {"ref": "K-4521", "name": "Yellowstone Lake State Park", "state": "WI", "dist": 89},
    ]

    formatter = TableFormatter()
    output = formatter.format_parks(parks)

    assert "K-0039" in output
    assert "Yellowstone National Park" in output
    assert "342mi" in output

def test_distance_unit_conversion():
    """Distance converts based on user preference"""
    formatter = TableFormatter(units="metric")
    output = formatter.format_distance(342)  # miles

    assert "550" in output  # ~550 km
    assert "km" in output
```

**Validator Tests:**

```python
# tests/test_validators.py
import pytest
from pota.validation import validate_park_reference

def test_valid_park_references():
    """Valid park references pass validation"""
    assert validate_park_reference("K-0039") == "K-0039"
    assert validate_park_reference("VE-12345") == "VE-12345"
    assert validate_park_reference("G-1234") == "G-1234"

def test_invalid_park_references():
    """Invalid park references raise errors"""
    with pytest.raises(ValidationError):
        validate_park_reference("k-0039")  # lowercase

    with pytest.raises(ValidationError):
        validate_park_reference("K-039")  # too short

    with pytest.raises(ValidationError):
        validate_park_reference("K-0039'; DROP TABLE parks--")  # SQL injection
```

#### E.2 Integration Test Examples

**Database Integration Tests:**

```python
# tests/integration/test_database.py
import pytest
from pota.data.database import Database
from pota.data.models import Park

@pytest.fixture
async def db():
    """In-memory database for testing"""
    db = Database(":memory:")
    await db.initialize()
    yield db
    await db.close()

async def test_park_search_by_name(db):
    """Can search parks by name"""
    await db.insert_park(
        Park(reference="K-0039", name="Yellowstone National Park",
             latitude=44.428, longitude=-110.5885, state="WY")
    )

    results = await db.search_parks("yellowstone")

    assert len(results) == 1
    assert results[0].reference == "K-0039"

async def test_park_nearby_search(db):
    """Can find parks within radius"""
    await db.insert_park(
        Park(reference="K-0039", name="Yellowstone National Park",
             latitude=44.428, longitude=-110.5885, state="WY")
    )

    results = await db.find_parks_nearby(44.5, -110.5, radius_miles=50)

    assert len(results) >= 1
    assert results[0].distance_miles <= 50
```

**API Client Integration Tests:**

```python
# tests/integration/test_pota_api.py
import pytest
from httpx import TransportError
from pota.api.pota_client import POTAClient
from tests.fixtures.pota_mock_server import pota_server

@pytest.mark.asyncio
async def test_fetch_park_success(pota_server):
    """Successfully fetch park from API"""
    client = POTAClient(base_url=pota_server.url)

    park = await client.get_park("K-0039")

    assert park.reference == "K-0039"
    assert park.name == "Yellowstone National Park"

@pytest.mark.asyncio
async def test_fetch_park_retry_on_timeout(pota_server):
    """Retry on transient network errors"""
    client = POTAClient(
        base_url=pota_server.url,
        max_retries=3,
        retry_backoff=0.1  # Fast retry in tests
    )

    # Server will fail first 2 requests, succeed on 3rd
    pota_server.set_failure_count(2)

    park = await client.get_park("K-0039")

    assert park.reference == "K-0039"
    assert pota_server.request_count == 3

@pytest.mark.asyncio
async def test_fetch_park_fails_after_max_retries(pota_server):
    """Fail after max retries exhausted"""
    client = POTAClient(
        base_url=pota_server.url,
        max_retries=2
    )

    pota_server.set_always_fail()

    with pytest.raises(TransportError):
        await client.get_park("K-0039")
```

**Cache Integration Tests:**

```python
# tests/integration/test_cache.py
import pytest
from pota.cache import CacheManager

@pytest.mark.asyncio
async def test_weather_cache_ttl():
    """Weather cache respects TTL"""
    cache = CacheManager()

    # Cache weather data
    await cache.set_weather("44.43,-110.59", {"temp": 72}, ttl_seconds=1)

    # Immediate fetch hits cache
    data = await cache.get_weather("44.43,-110.59")
    assert data["temp"] == 72

    # Wait for expiry
    await asyncio.sleep(2)

    # Cache miss after TTL
    data = await cache.get_weather("44.43,-110.59")
    assert data is None
```

#### E.3 CLI Snapshot Tests

**Command Output Snapshots:**

```python
# tests/cli/test_snapshots.py
from typer.testing import CliRunner
from pota.cli import app

runner = CliRunner()

def test_park_search_output(snapshot):
    """Park search output matches snapshot"""
    result = runner.invoke(app, ["park", "search", "yellowstone"])

    assert result.exit_code == 0
    assert snapshot == result.stdout

def test_plan_create_output(snapshot):
    """Plan create output matches snapshot"""
    result = runner.invoke(app, [
        "plan", "create", "K-0039",
        "--date", "2024-06-15",
        "--preset", "qrp"
    ])

    assert result.exit_code == 0
    assert snapshot == result.stdout
```

**Snapshot File (tests/snapshots/test_snapshots/test_plan_create_output.ambr):**

```
# snapshot: plan_create_output
┌─────────────────────────────────────────────────────────────────┐
│  Creating plan for K-0039 - Yellowstone National Park           │
└─────────────────────────────────────────────────────────────────┘

  ✓ Weather forecast loaded
  ✓ Band conditions calculated
  ✓ Equipment preset applied: QRP Portable

Plan created: PLAN-2024-0615-K0039

Next steps:
  • View plan: pota plan show PLAN-2024-0615-K0039
  • Export plan: pota plan export PLAN-2024-0615-K0039
```

#### E.4 E2E Test Scenarios

**End-to-End Workflow Tests:**

```bash
#!/bin/bash
# tests/e2e/test_plan_workflow.sh

set -e

echo "=== E2E Test: Complete Plan Creation Workflow ==="

# 1. Initialize config
pota config init --callsign TEST1ABC --grid FN42

# 2. Sync parks (or load test data)
pota sync parks --region US

# 3. Search for a park
OUTPUT=$(pota park search "yellowstone" --format json)
REF=$(echo "$OUTPUT" | jq -r '.[0].reference')
assert "$REF" == "K-0039"

# 4. Create a plan
pota plan create "$REF" --date 2024-12-15 --preset qrp

# 5. Verify plan was created
PLANS=$(pota plan list --format json)
PLAN_COUNT=$(echo "$PLANS" | jq 'length')
assert "$PLAN_COUNT" -gt 0

# 6. Export plan
pota plan export PLAN-2024-1215-K0039 --format markdown --output /tmp/test-plan.md
assert -f /tmp/test-plan.md

# 7. Cleanup
pota plan delete PLAN-2024-1215-K0039

echo "✓ E2E test passed"
```

**Error Handling E2E Test:**

```bash
#!/bin/bash
# tests/e2e/test_error_handling.sh

echo "=== E2E Test: Error Handling ==="

# Test 1: Invalid park reference
OUTPUT=$(pota plan create "INVALID-999" --date 2024-12-15 2>&1)
echo "$OUTPUT" | grep -q "Park not found"
echo "✓ Invalid reference handled correctly"

# Test 2: Invalid date format
OUTPUT=$(pota plan create "K-0039" --date "invalid-date" 2>&1)
echo "$OUTPUT" | grep -q "Invalid date"
echo "✓ Invalid date handled correctly"

# Test 3: Network error (offline mode)
# Kill network, run command, verify graceful degradation
pota park search "yellowstone" --offline
echo "✓ Offline mode works"

echo "✓ All error handling tests passed"
```

#### E.5 Performance Test Examples

**Benchmark Tests:**

```python
# tests/performance/test_benchmarks.py
import pytest
import time
from pota.services.park_service import ParkService

def test_park_search_performance(benchmark):
    """Park search should be fast"""
    service = ParkService()

    # Benchmark: search should complete in < 100ms (cached)
    result = benchmark(service.search_parks, "yellowstone")

    assert result is not None

@pytest.mark.benchmark(min_rounds=10)
def test_plan_creation_performance(benchmark):
    """Plan creation should complete in < 3s"""
    service = PlanService()

    result = benchmark(
        service.create_plan,
        park_ref="K-0039",
        date="2024-06-15",
        preset="qrp"
    )

    assert result.id is not None
```

#### E.6 Test Coverage Targets

| Component | Coverage Target | Notes |
|-----------|----------------|-------|
| Business logic (band service, weather) | 95%+ | Critical path |
| Formatters | 90%+ | UI consistency |
| Validators | 100% | Security critical |
| Database operations | 85%+ | Error handling |
| API clients | 80%+ | Network failures |
| CLI parsing | 85%+ | User interactions |

**Coverage Commands:**

```bash
# Python
pytest --cov=pota --cov-report=html --cov-report=term

# Rust
cargo tarpaulin --out Html --verbose

# Go
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Appendix F: System Architecture Diagram

This appendix provides visual representations of the system architecture and component relationships.

#### F.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                               │
│                   (Terminal, Shell Scripts, Automation)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLI UI LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   REPL Mode  │  │  Batch Mode  │  │   Wizard     │  │   Help/Docs  │   │
│  │   (Interactive)│ │  (Direct Cmd)│ │   (Guided)   │  │   System     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMANDS LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Park Commands│  │ Plan Commands│  │ Gear Commands│  │ Log Commands │   │
│  │  - search    │  │  - create    │  │  - list      │  │  - import    │   │
│  │  - show      │  │  - edit      │  │  - add       │  │  - export    │   │
│  │  - favorite  │  │  - export    │  │  - preset    │  │  - stats     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ Sync Commands│  │ Config Cmds  │  │ Session Cmds │                       │
│  │  - parks     │  │  - init      │  │  - /context  │                       │
│  │  - weather   │  │  - set       │  │  - /select   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICES LAYER                                     │
│                         (Business Logic)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │Park Service  │  │Plan Service  │  │Weather Service│ │Band Service   │   │
│  │- Search      │  │- Create      │  │- Fetch       │  │- Calculate   │   │
│  │- Lookup      │  │- Generate    │  │- Cache       │  │- Recommend  │   │
│  │- Favorites   │  │- Export      │  │- Normalize   │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │Gear Service  │  │Sync Service  │  │Config Service│                       │
│  │- Manage      │  │- Delta       │  │- Load/Save   │                       │
│  │- Presets     │  │- Full        │  │- Validate    │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│    REPOSITORY LAYER          │  │         EXTERNAL API LAYER               │
├──────────────────────────────┤  ├──────────────────────────────────────────┤
│  ┌──────────────┐            │  │  ┌──────────────┐  ┌──────────────┐     │
│  │  Database    │            │  │  │ POTA.app API │  │ Weather API  │     │
│  │  Repository  │            │  │  │- Parks       │  │- OpenWeather │     │
│  │  - CRUD      │            │  │  │- Notes       │  │- Open-Meteo  │     │
│  │  - Queries   │            │  │  │- Stats       │  │              │     │
│  └──────────────┘            │  │  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐            │  └──────────────────────────────────────────┘
│  │  Cache       │            │
│  │  Manager     │            │
│  │  - TTL       │            │
│  │  - Invalidation│          │
│  └──────────────┘            │
└──────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL DATA STORE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Database    │  │  Cache Files │  │  Config      │  │  Exports     │   │
│  │  (SQLite)    │  │  (JSON)      │  │  (TOML)      │  │  (MD/PDF)    │   │
│  │              │  │              │  │              │  │              │   │
│  │  - Parks     │  │  - Weather   │  │  - User       │  │  - Plans     │   │
│  │  - Plans     │  │  - Notes     │  │  - API Keys   │  │  - Logs      │   │
│  │  - Gear      │  │              │  │  - Prefs     │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### F.2 Data Flow: Plan Creation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLAN CREATION DATA FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

User Input: pota plan create K-0039 --date 2024-06-15
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. COMMAND PARSING                                                          │
│    - Parse arguments: park_ref, date, preset                               │
│    - Validate input format                                                  │
│    - Load user configuration                                                │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. PARK LOOKUP (Service Layer)                                             │
│    - Query database for park reference                                     │
│    - If not found: error                                                   │
│    - If found: return park details (name, location, grid)                 │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├──┐
    │  └──► [Cache Miss] → Potentially fetch from API if database stale
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. WEATHER DATA (Service Layer + API)                                      │
│    - Check cache for location + date                                       │
│    - If cache miss or expired:                                             │
│      • Call weather API (OpenWeatherMap)                                  │
│      • Parse response to normalized format                                 │
│      • Store in cache with TTL                                             │
│    - Return weather forecast                                               │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. BAND RECOMMENDATIONS (Service Layer)                                    │
│    - Calculate based on:                                                   │
│      • Date/time of activation                                             │
│      • Season                                                              │
│      • Time of day                                                         │
│    - Apply hardcoded heuristics (MVP)                                      │
│    - Return band recommendations                                           │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. EQUIPMENT PRESET (Service Layer + Database)                             │
│    - Look up preset (hardcoded or user-defined)                            │
│    - Load equipment items for preset                                       │
│    - Return equipment list                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. PLAN ASSEMBLY (Service Layer)                                           │
│    - Combine all components:                                               │
│      • Park details                                                        │
│      • Weather forecast                                                    │
│      • Band recommendations                                                │
│      • Equipment checklist                                                 │
│      • Community notes (if available)                                      │
│    - Generate plan ID                                                      │
│    - Store plan in database                                                │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. OUTPUT FORMATTING (UI Layer)                                            │
│    - Format plan for display                                               │
│    - Show success message with plan ID                                     │
│    - Provide next step suggestions                                         │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
Output: Plan created: PLAN-2024-0615-K0039
```

#### F.3 Component Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPENDENCY GRAPH                                   │
└─────────────────────────────────────────────────────────────────────────────┘

CLI Layer (Commands)
    │
    ├─► Services Layer
    │     │
    │     ├─► Repository Layer
    │     │     │
    │     │     └─► Database (SQLite)
    │     │
    │     └─► External APIs
    │           ├─► POTA.app API
    │           └─► Weather APIs
    │
    └─► UI Layer
          ├─► Formatters
          ├─► Tables
          └─► Prompts

Config Layer (shared across all layers)
    ├─► Load from file/env
    └─► Provide settings to components
```

#### F.4 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

Error Occurs
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ERROR CATCHING                                                          │
│    - Detect error at appropriate layer                                     │
│    - Wrap in domain-specific error class                                   │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ERROR CLASSIFICATION                                                    │
│    - ValidationError: Input validation failures                           │
│    - NotFoundError: Resource not found                                     │
│    - NetworkError: External API failures                                   │
│    - ConfigurationError: Config issues                                     │
│    - DataError: Database/corruption issues                                │
│    - InternalError: Unexpected errors                                      │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. RECOVERY STRATEGY                                                       │
│    - Can we recover?                                                       │
│      • Retry (with backoff)                                               │
│      • Use cached data                                                    │
│      • Use default values                                                 │
│      • Fall back to offline mode                                          │
│    - If yes: apply recovery and continue                                  │
│    - If no: proceed to error display                                      │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. ERROR DISPLAY                                                           │
│    - Format user-friendly error message                                    │
│    - Include suggestions for resolution                                    │
│    - Set appropriate exit code                                            │
│    - Log details (with redaction)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
Exit with error code
```

### Appendix G: Error Recovery Flows

This appendix documents detailed error recovery patterns and retry logic for various failure scenarios.

#### G.1 Weather Fetch Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEATHER FETCH RECOVERY                              │
└─────────────────────────────────────────────────────────────────────────────┘

Request weather for location
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Check Cache                                                        │
│    - Is cached data available for location + date?                         │
│    - Is cache still valid (TTL not expired)?                               │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Cache Hit (valid) ──► Return cached data ✓
    │
    └── Cache Miss/Expired ───► Continue to STEP 2
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Try Primary Weather API                                            │
│    - API: OpenWeatherMap (or configured primary)                          │
│    - Timeout: 10 seconds                                                   │
│    - Max retries: 3                                                        │
│    - Backoff: Exponential (1s, 2s, 4s)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Success ──────────────────► Cache result (1hr TTL) → Return ✓
    │
    └── Failure (after retries) ──► Continue to STEP 3
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Try Secondary Weather API                                          │
│    - API: Open-Meteo (no API key required)                                │
│    - Timeout: 10 seconds                                                   │
│    - Max retries: 2                                                        │
│    - Backoff: Fixed (2s)                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Success ──────────────────► Cache result (1hr TTL) → Return ✓
    │
    └── Failure (after retries) ──► Continue to STEP 4
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Check for Stale Cache                                               │
│    - Is expired cached data available?                                     │
│    - Is it less than 24 hours old?                                        │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Stale data available ──► Return with warning ⚠
    │                          "Weather data is X hours old (API unavailable)"
    │
    └── No cached data ──────────► Continue to STEP 5
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Graceful Degradation                                               │
│    - Return plan without weather section                                   │
│    - Log error for debugging                                              │
│    - Inform user of API unavailability                                     │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
Return plan (weather omitted) with warning ⚠
```

**Configuration:**

```toml
[weather]
primary_api = "openweathermap"    # openweathermap | openmeteo
secondary_api = "openmeteo"
timeout_seconds = 10
max_retries = 3
retry_backoff = "exponential"     # exponential | fixed | linear
cache_ttl_hours = 1
stale_cache_max_age_hours = 24
```

#### G.2 Park Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PARK SYNC RECOVERY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

User initiates park sync
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Check Sync Requirements                                            │
│    - When was last successful sync?                                        │
│    - Is force sync requested?                                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Recent sync (< 7 days) + no force ──► Skip with message ℹ
    │
    └── Sync needed ─────────────────────────► Continue to STEP 2
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Attempt Delta Sync (incremental)                                   │
│    - Fetch only new/changed parks since last sync                          │
│    - API: GET /parks?since=<last_sync_date>                               │
│    - Timeout: 30 seconds                                                   │
│    - Max retries: 2                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Success ──────────────────► Apply updates to database → Complete ✓
    │
    ├── API doesn't support delta ──► Continue to STEP 3
    │
    └── Failure (after retries) ──► Continue to STEP 3
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Attempt Full Sync                                                   │
│    - Fetch all parks from API                                              │
│    - API: GET /parks                                                        │
│    - Stream response to handle large payload                               │
│    - Timeout: 5 minutes                                                    │
│    - Max retries: 1                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Success ──────────────────► Update database → Complete ✓
    │
    └── Failure (after retries) ──► Continue to STEP 4
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Use Local Cache                                                     │
│    - Check for cached park data in ~/.pota/cache/parks.json                │
│    - Validate cache file integrity (checksum)                              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Valid cache found ─────────► Load from cache with warning ⚠
    │                             "Using cached park data (X days old)"
    │
    └── No valid cache ─────────────► Continue to STEP 5
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Manual Sync Suggestion                                             │
│    - Inform user of sync failure                                           │
│    - Suggest manual steps:                                                 │
│      • Check network connection                                            │
│      • Try again later                                                     │
│      • Download park data from POTA.app manually                           │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
Return error with suggestions ✗
```

**Sync State Tracking:**

```toml
[sync]
last_sync = "2024-06-10T14:30:00Z"
last_sync_status = "success"  # success | partial | failed
last_sync_error = ""
delta_sync_supported = true
```

#### G.3 Network Timeout Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NETWORK TIMEOUT HANDLING                            │
└─────────────────────────────────────────────────────────────────────────────┘

Network request initiated
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Timeout Configuration                                                      │
│    - Connection timeout: 10 seconds (time to establish connection)        │
│    - Read timeout: 30 seconds (time to receive response)                  │
│    - Total timeout: 60 seconds (overall request limit)                    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Timeout Occurs                                                             │
│    - Which timeout was hit?                                                │
│    - Is this a retryable request?                                          │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Connection timeout ────► Likely network issue
    │                             │
    │                             ├── Retry #1: Immediate
    │                             ├── Retry #2: Wait 1s
    │                             └── Retry #3: Wait 2s
    │                                  │
    │                                  └── All failed → Error ✗
    │
    └── Read timeout └────────► Data transfer issue
                                  │
                                  ├── Check if partial data received
                                  ├── If yes: Use partial data with warning
                                  └── If no: Retry once (2s backoff)
                                       │
                                       └── Failed → Error ✗
```

**Timeout Settings by Request Type:**

| Request Type | Connect Timeout | Read Timeout | Total Timeout |
|--------------|----------------|--------------|---------------|
| Weather fetch | 5s | 10s | 30s |
| Park sync (delta) | 10s | 30s | 60s |
| Park sync (full) | 10s | 300s | 600s |
| Community notes | 5s | 10s | 20s |
| Config check | 2s | 5s | 10s |

#### G.4 Retry Policy

**General Retry Rules:**

```python
class RetryPolicy:
    def __init__(self):
        self.max_retries = 3
        self.backoff_strategy = "exponential"  # exponential, fixed, linear
        self.initial_delay = 1.0  # seconds
        self.max_delay = 30.0  # seconds
        self.retry_on = [
            "timeout",
            "connection_error",
            "http_5xx",
            "rate_limit_exceeded"
        ]
        self.do_not_retry_on = [
            "http_4xx",  # Client errors (except 429)
            "authentication_error",
            "not_found",
            "validation_error"
        ]
```

**Exponential Backoff Calculation:**

```
Retry 1: delay = initial_delay × (2 ^ 0) = 1.0s
Retry 2: delay = initial_delay × (2 ^ 1) = 2.0s
Retry 3: delay = initial_delay × (2 ^ 2) = 4.0s
...
Max delay capped at: 30.0s
```

**Jitter Addition (to prevent thundering herd):**

```
delay_with_jitter = delay × (0.5 + random() × 0.5)
# Example: 2.0s × (0.5 + 0.3) = 1.6s
```

#### G.5 Database Error Recovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ERROR RECOVERY                             │
└─────────────────────────────────────────────────────────────────────────────┘

Database operation fails
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Classify Error Type                                                        │
│    - Database locked? (another process using it)                          │
│    - Corrupted? (checksum mismatch)                                       │
│    - Missing? (file doesn't exist)                                        │
│    - Disk full?                                                            │
│    - Schema mismatch? (version incompatibility)                           │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── Database locked ───────────► Wait 1s, retry (max 5 times)
    │                                  │
    │                                  └── Still locked → Error: "Database in use"
    │
    ├── Corrupted ───────────────────► Try recovery:
    │                                     │
    │                                     ├── Check for backup (~/.pota/pota.db.bak)
    │                                     ├── Attempt SQLite recovery: PRAGMA integrity_check
    │                                     └── If unrecoverable → Error with restore instructions
    │
    ├── Missing ──────────────────────► Run migrations to create new database
    │
    ├── Disk full ────────────────────► Error: "Disk full, cannot save changes"
    │                                     Suggest: Free disk space or change data directory
    │
    └── Schema mismatch ──────────────► Run migrations
                                       │
                                       ├── Migration succeeds → Continue ✓
                                       └── Migration fails → Error with rollback message
```

#### G.6 Configuration Error Recovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONFIGURATION ERROR RECOVERY                          │
└─────────────────────────────────────────────────────────────────────────────┘

Load configuration
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Validate Configuration                                                     │
│    - File exists?                                                          │
│    - Valid TOML syntax?                                                    │
│    - Required fields present?                                             │
│    - Field values valid (callsign format, coordinates, etc.)?             │
│    - File permissions secure (0600)?                                       │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ├── File doesn't exist ────────► Run first-time setup wizard
    │
    ├── Invalid TOML syntax ────────► Show error with line number
    │                                 Suggest: Fix file or run `pota config init`
    │
    ├── Missing required fields ────► Use defaults where possible
    │                                 Prompt for missing critical fields (callsign)
    │
    ├── Invalid field values ───────► Use defaults, log warning
    │
    └── Insecure permissions ───────► Warn user, offer to fix: chmod 600
    │
    ▼
Load configuration (with fallbacks)
```

#### G.7 Graceful Degradation Matrix

| Failure | Primary Behavior | Degraded Behavior | User Notified |
|---------|------------------|-------------------|---------------|
| Weather API down | Fetch fresh weather | Use cached weather (up to 24h old) | ⚠ Warning |
| Weather API + cache miss | Show forecast | Omit weather section | ⚠ Warning |
| POTA API down | Sync parks | Use local database | ⚠ Show sync age |
| POTA API + no local data | Sync parks | Error with manual steps | ✗ Error |
| Community notes API down | Fetch notes | Omit notes section | Silent (no warning) |
| Network offline | All online features | Offline mode only | ℹ Info: "Offline mode" |
| Config corrupted | Load config | Use defaults | ⚠ Warning |
| Database locked | Read/write DB | Read-only mode | ⚠ Warning |
| Outdated version (check) | Use features | Warn to update | ℹ Info |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | AI-assisted | Initial CLI architecture plan |
| 2.0 | 2024 | AI-assisted | Enhanced with architectural decision records, MVP scope definition, non-functional requirements, state management, security considerations, distribution strategy, observability, testing examples, system architecture diagrams, and error recovery flows |

---

*This document describes the POTA Activation Planner as a CLI application. It supersedes the previous REST API web application design. Implementation should follow this specification.*
