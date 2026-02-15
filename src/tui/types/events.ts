/**
 * Event types for TUI keyboard and input handling.
 *
 * @module tui/types/events
 */

/** A keyboard event with normalized key information */
export interface KeyEvent {
  /** The key that was pressed (e.g., 'a', 'Enter', 'Escape') */
  key: string;
  /** Whether the Ctrl key was held */
  ctrl: boolean;
  /** Whether the Meta/Command key was held */
  meta: boolean;
  /** Whether the Shift key was held */
  shift: boolean;
}

/** Handler function type for keyboard events */
export type KeyHandler = (event: KeyEvent) => void;

/** Map of key sequences to their handlers */
export type KeyMap = Record<string, KeyHandler>;

/**
 * Normalizes a key string for consistent matching.
 *
 * @param key - Raw key string from Ink
 * @returns Normalized key name
 */
export function normalizeKey(key: string): string {
  // Handle special key names
  const specialKeys: Record<string, string> = {
    '\r': 'Enter',
    '\n': 'Enter',
    '\u001b': 'Escape',
    ' ': 'Space',
  };

  return specialKeys[key] ?? key;
}

/**
 * Creates a key identifier string for keymaps.
 *
 * @param event - KeyEvent object
 * @returns String like 'Ctrl+K', 'Enter', 'j'
 */
export function toKeyString(event: KeyEvent): string {
  const parts: string[] = [];
  if (event.ctrl) parts.push('Ctrl');
  if (event.meta) parts.push('Meta');
  if (event.shift && event.key.length === 1) parts.push('Shift');
  parts.push(event.key);
  return parts.join('+');
}
