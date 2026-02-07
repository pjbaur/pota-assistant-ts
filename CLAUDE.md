# POTA Activation Planner - TypeScript CLI

## Project Overview

A CLI tool for amateur radio operators to plan Parks on the Air (POTA) activations. Consolidates park discovery, weather forecasts, band/propagation recommendations, and equipment presets into a single planning workflow.

**Status:** Pre-implementation. Architecture plan in `docs/00-ARCHITECTURE-PLAN.md`.

## Architecture

- **CLI-first** with interactive REPL and direct command modes
- **Local-first data** using embedded SQLite (better-sqlite3)
- **Offline-capable** after initial park data sync
- **Project structure:** `src/commands/`, `src/services/`, `src/data/`, `src/api/`, `src/ui/`, `src/config/`

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript (strict mode)
- **CLI framework:** commander
- **Terminal UI:** ink
- **Database:** better-sqlite3
- **Package manager:** npm
- **Testing:** vitest
- **Linting:** eslint + prettier

## Commands

```
npm run build        # Compile TypeScript
npm run dev          # Run in development mode
npm test             # Run tests
npm run lint         # Lint and format check
```

## Code Conventions

- Use **ESM modules** (`import`/`export`)
- Prefer **named exports** over default exports
- Use **strict TypeScript** - no `any` types without justification
- Error handling: return `Result` types for expected failures; throw only for unexpected errors
- File naming: `kebab-case.ts` for files, `PascalCase` for classes/types, `camelCase` for functions/variables
- Tests go in `tests/` mirroring `src/` structure (e.g., `tests/services/park-service.test.ts`)
- Keep external API calls in `src/api/` - services should not make HTTP calls directly

## Key Domain Terms

- **Park reference:** POTA identifier like `K-0039`
- **Activation:** Operating a radio from a POTA park
- **QSO:** A radio contact
- **ADIF:** Amateur Data Interchange Format (log file format)
- **Grid square:** Maidenhead locator (e.g., `DN44xk`)
- **QRP:** Low-power operation (typically 5W or less)
- **Preset:** A saved equipment configuration

## External APIs

- **POTA.app** - Park database and activation data
- **Open-Meteo or OpenWeatherMap** - Weather forecasts
- All API keys stored in local config file, never committed

## Important Patterns

- Database migrations live in `src/data/migrations/`
- Weather and park data are cached locally with TTLs (weather: 1hr, parks: 30 days)
- Commands should work offline using cached data with degraded-state warnings
- Interactive mode uses slash commands (`/help`, `/select`, `/plan`)
