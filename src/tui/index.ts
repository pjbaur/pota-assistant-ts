/**
 * TUI entry point - bootstraps the Ink application.
 *
 * @module tui
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

/**
 * Starts the TUI application.
 *
 * @returns A promise that resolves when the app exits
 */
export async function startTUI(): Promise<void> {
  const { waitUntilExit } = render(React.createElement(App));

  // Wait for the app to exit
  await waitUntilExit();
}
