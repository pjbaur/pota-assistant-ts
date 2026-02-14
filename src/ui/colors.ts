/**
 * Color utilities that respect --no-color flag
 * Uses chalk for terminal colors
 */

import chalk from 'chalk';

let useColors = true;

/**
 * Initialize color settings based on user preference
 */
export function initColors(useColor: boolean): void {
  useColors = useColor;
}

/**
 * Get the current color setting
 */
export function isColorEnabled(): boolean {
  return useColors;
}

/**
 * Apply success styling (green)
 */
export function success(text: string): string {
  return useColors ? chalk.green(text) : text;
}

/**
 * Apply warning styling (yellow)
 */
export function warning(text: string): string {
  return useColors ? chalk.yellow(text) : text;
}

/**
 * Apply error styling (red)
 */
export function error(text: string): string {
  return useColors ? chalk.red(text) : text;
}

/**
 * Apply info styling (blue)
 */
export function info(text: string): string {
  return useColors ? chalk.blue(text) : text;
}

/**
 * Apply highlight styling (cyan bold)
 */
export function highlight(text: string): string {
  return useColors ? chalk.cyan.bold(text) : text;
}

/**
 * Apply muted styling (gray/dim)
 */
export function muted(text: string): string {
  return useColors ? chalk.gray(text) : text;
}

/**
 * Apply bold styling
 */
export function bold(text: string): string {
  return useColors ? chalk.bold(text) : text;
}

/**
 * Apply dim styling
 */
export function dim(text: string): string {
  return useColors ? chalk.dim(text) : text;
}

/**
 * Apply underline styling
 */
export function underline(text: string): string {
  return useColors ? chalk.underline(text) : text;
}

/**
 * Color palette for consistent theming
 */
export const colors = {
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  highlight: chalk.cyan,
  muted: chalk.gray,
  primary: chalk.magenta,
  secondary: chalk.white,
};
