/**
 * Progress indicators for CLI
 * Optimized for 80-column terminals
 */

import { muted, info, success } from './colors.js';

const TERMINAL_WIDTH = 80;

/**
 * Progress bar for displaying completion percentage
 */
export class ProgressBar {
  private width: number;
  private message: string;
  private lastPercent: number;
  private isComplete: boolean;

  constructor(width: number = 40) {
    this.width = width;
    this.message = '';
    this.lastPercent = -1;
    this.isComplete = false;
  }

  /**
   * Update progress bar with current percentage
   */
  update(percent: number, message?: string): void {
    if (this.isComplete) return;

    const clampedPercent = Math.max(0, Math.min(100, percent));

    // Only redraw if percent changed by at least 1%
    if (Math.floor(clampedPercent) === this.lastPercent && message === undefined) {
      return;
    }

    this.lastPercent = Math.floor(clampedPercent);

    if (message !== undefined) {
      this.message = message;
    }

    this.draw(clampedPercent);
  }

  /**
   * Mark progress as complete
   */
  complete(message?: string): void {
    if (this.isComplete) return;

    this.isComplete = true;
    const finalMessage = message ?? 'Complete';

    // Clear line and show completion
    process.stdout.write('\r' + ' '.repeat(TERMINAL_WIDTH) + '\r');
    process.stdout.write(success('\u2713 ') + finalMessage + '\n');
  }

  private draw(percent: number): void {
    const filled = Math.round((percent / 100) * this.width);
    const empty = this.width - filled;

    const bar = '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ']';
    const percentStr = ` ${percent.toFixed(0)}%`.padStart(5);

    let line = `${bar}${percentStr}`;
    if (this.message) {
      const remaining = TERMINAL_WIDTH - line.length - 1;
      if (remaining > 0) {
        line += ' ' + truncate(this.message, remaining);
      }
    }

    // Clear line and redraw
    process.stdout.write('\r' + ' '.repeat(TERMINAL_WIDTH) + '\r');
    process.stdout.write(line);
  }
}

/**
 * Spinner animation for indeterminate progress
 */
export class Spinner {
  private frames: string[];
  private frameIndex: number;
  private message: string;
  private intervalId: NodeJS.Timeout | null;
  private isRunning: boolean;

  constructor() {
    this.frames = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2824', '\u280C', '\u2809', '\u2819', '\u281B', '\u2813'];
    this.frameIndex = 0;
    this.message = '';
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the spinner with a message
   */
  start(message: string): void {
    if (this.isRunning) {
      this.update(message);
      return;
    }

    this.message = message;
    this.isRunning = true;
    this.draw();

    this.intervalId = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.draw();
    }, 80);
  }

  /**
   * Update the spinner message
   */
  update(message: string): void {
    this.message = message;
    if (this.isRunning) {
      this.draw();
    }
  }

  /**
   * Stop the spinner
   */
  stop(finalMessage?: string): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear line
    process.stdout.write('\r' + ' '.repeat(TERMINAL_WIDTH) + '\r');

    if (finalMessage) {
      process.stdout.write(finalMessage + '\n');
    }
  }

  /**
   * Stop with success message
   */
  succeed(message: string): void {
    this.stop(success('\u2713 ') + message);
  }

  /**
   * Stop with failure message
   */
  fail(message: string): void {
    this.stop('\u2717 ' + message);
  }

  private draw(): void {
    const frame = this.frames[this.frameIndex];
    let line = `${info(frame)} ${this.message}`;

    // Truncate if too long
    if (line.length > TERMINAL_WIDTH) {
      line = line.slice(0, TERMINAL_WIDTH - 3) + '...';
    }

    // Clear line and redraw
    process.stdout.write('\r' + ' '.repeat(TERMINAL_WIDTH) + '\r');
    process.stdout.write(line);
  }
}

/**
 * Format a simple progress indicator string
 */
export function formatProgress(current: number, total: number, message: string): string {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const bar = progressBarString(percent, 20);
  return `${bar} ${current}/${total} ${truncate(message, 40)}`;
}

/**
 * Generate a progress bar string
 */
export function progressBarString(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ']';
}

/**
 * Truncate a string to max length
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
