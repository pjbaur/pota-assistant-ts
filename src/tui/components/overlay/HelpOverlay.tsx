/**
 * Help overlay component.
 *
 * @module tui/components/overlay/HelpOverlay
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { HelpOverlayProps } from '../../types/components.js';

const KEYBOARD_SHORTCUTS = [
  { key: 'Cmd/Ctrl+K', action: 'Open command palette' },
  { key: '?', action: 'Show this help' },
  { key: 'Tab', action: 'Cycle focus between panes' },
  { key: 'j/k or ↑/↓', action: 'Navigate lists' },
  { key: 'Enter', action: 'Select item' },
  { key: 'd', action: 'Show dashboard (in main pane)' },
  { key: 'w', action: 'Focus weather info' },
  { key: 'b', action: 'Focus band conditions' },
  { key: 'p', action: 'Switch to parks section' },
  { key: 'l', action: 'Switch to plans section' },
  { key: 'Esc', action: 'Close overlay / return to sidebar' },
  { key: 'q', action: 'Quit application' },
];

/**
 * Help overlay showing keyboard shortcuts.
 */
export function HelpOverlay({
  isVisible,
  onClose,
  testId,
}: HelpOverlayProps): React.JSX.Element {
  useInput(
    () => {
      // Any key closes the help overlay
      onClose();
    },
    { isActive: isVisible }
  );

  if (!isVisible) return <></>;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="green"
      padding={1}
      width={55}
      data-testid={testId}
    >
      <Box marginBottom={1}>
        <Text bold color="green">
          Keyboard Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column">
        {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
          <Box key={key}>
            <Text color="cyan" bold>
              {key.padEnd(15)}
            </Text>
            <Text dimColor> - {action}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}
