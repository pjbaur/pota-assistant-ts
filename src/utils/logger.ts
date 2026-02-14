// Logger - structured logging support

import type { LogLevel } from '../types/index.js';
import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;
  private logFile: string | null;
  private maxSizeBytes: number;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(
    level: LogLevel = 'info',
    logFile: string | null = null,
    maxSizeMb: number = 10
  ) {
    this.level = level;
    this.logFile = logFile ? this.expandPath(logFile) : null;
    this.maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (this.logFile) {
      const logDir = dirname(this.logFile);
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private expandPath(path: string): string {
    if (path.startsWith('~')) {
      return join(homedir(), path.slice(1));
    }
    return path;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatConsole(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const level = `${levelColors[entry.level]}${entry.level.toUpperCase().padEnd(5)}${reset}`;

    let output = `[${entry.timestamp}] ${level} ${entry.message}`;
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  ${JSON.stringify(entry.context, null, 2).split('\n').join('\n  ')}`;
    }
    return output;
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  private rotateLog(): void {
    if (!this.logFile || !existsSync(this.logFile)) return;

    try {
      const stats = statSync(this.logFile);
      if (stats.size >= this.maxSizeBytes) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${this.logFile}.${timestamp}`;
        renameSync(this.logFile, rotatedFile);
      }
    } catch {
      // Ignore rotation errors
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    this.rotateLog();
    appendFileSync(this.logFile, this.formatJson(entry) + '\n', 'utf-8');
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context: this.redactSensitive(context),
    };

    // Console output
    console.error(this.formatConsole(entry));

    // File output
    this.writeToFile(entry);
  }

  private redactSensitive(
    context?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!context) return context;

    const sensitiveKeys = ['apiKey', 'api_key', 'password', 'secret', 'token'];
    const redacted = { ...context };

    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        const value = String(redacted[key]);
        if (value.length > 8) {
          redacted[key] = `${value.slice(0, 4)}****${value.slice(-4)}`;
        } else {
          redacted[key] = '****';
        }
      }
    }

    return redacted;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

export function initLogger(
  level: LogLevel = 'info',
  logFile: string | null = null,
  maxSizeMb: number = 10
): Logger {
  loggerInstance = new Logger(level, logFile, maxSizeMb);
  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = initLogger();
  }
  return loggerInstance;
}

export type { Logger };
