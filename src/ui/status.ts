/**
 * Status message utilities
 * Provides consistent formatting for success, warning, error, and info messages
 */

import {
  success as successColor,
  warning as warningColor,
  error as errorColor,
  info as infoColor,
  bold,
  muted,
} from './colors.js';

const TERMINAL_WIDTH = 80;

/**
 * Format a status message with optional suggestions
 */
function formatStatusMessage(
  type: 'success' | 'warning' | 'error' | 'info',
  message: string,
  suggestions?: string[]
): string {
  const icons: Record<string, string> = {
    success: '\u2713', // checkmark
    warning: '\u26A0', // warning sign
    error: '\u2717',   // x mark
    info: '\u2139',    // info symbol
  };

  const colorFns: Record<string, (s: string) => string> = {
    success: successColor,
    warning: warningColor,
    error: errorColor,
    info: infoColor,
  };

  const icon = icons[type];
  const colorFn = colorFns[type];

  const lines: string[] = [];

  // Main message
  lines.push(colorFn(`${icon} ${message}`));

  // Suggestions
  if (suggestions && suggestions.length > 0) {
    lines.push('');
    lines.push(muted('  Suggestions:'));
    for (const suggestion of suggestions) {
      lines.push(muted(`    - ${suggestion}`));
    }
  }

  return lines.join('\n');
}

/**
 * Display a success message
 */
export function success(message: string, suggestions?: string[]): void {
  console.log(formatStatusMessage('success', message, suggestions));
}

/**
 * Display a warning message
 */
export function warning(message: string, suggestions?: string[]): void {
  console.log(formatStatusMessage('warning', message, suggestions));
}

/**
 * Display an error message
 */
export function error(message: string, suggestions?: string[]): void {
  console.log(formatStatusMessage('error', message, suggestions));
}

/**
 * Display an info message
 */
export function info(message: string): void {
  console.log(formatStatusMessage('info', message));
}

/**
 * Display a header/title
 */
export function header(title: string, subtitle?: string): void {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold(`  ${'─'.repeat(TERMINAL_WIDTH - 4)}`));
  lines.push(bold(`  ${title.toUpperCase()}`));

  if (subtitle) {
    lines.push(muted(`  ${subtitle}`));
  }

  lines.push(bold(`  ${'─'.repeat(TERMINAL_WIDTH - 4)}`));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Display a section divider
 */
export function divider(title?: string): void {
  if (title) {
    const padded = ` ${title} `;
    const remaining = TERMINAL_WIDTH - 4 - padded.length;
    const left = Math.floor(remaining / 2);
    const right = remaining - left;
    console.log(muted(`  ${'─'.repeat(left)}${padded}${'─'.repeat(right)}`));
  } else {
    console.log(muted(`  ${'─'.repeat(TERMINAL_WIDTH - 4)}`));
  }
}

/**
 * Display a blank line
 */
export function blank(): void {
  console.log('');
}

/**
 * Display a key-value pair
 */
export function keyValue(key: string, value: string): void {
  console.log(`  ${bold(key)}: ${value}`);
}

/**
 * Display a list of items
 */
export function list(items: string[], options?: { ordered?: boolean; indent?: number }): void {
  const { ordered = false, indent = 2 } = options ?? {};

  items.forEach((item, index) => {
    const prefix = ordered ? `${index + 1}.` : '-';
    const spaces = ' '.repeat(indent);
    console.log(`${spaces}${prefix} ${item}`);
  });
}

/**
 * Format a duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
