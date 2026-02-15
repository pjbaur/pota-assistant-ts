/**
 * Status bar component - top line of TUI.
 *
 * @module tui/components/layout/StatusBar
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { StatusBarProps } from '../../types/components.js';

const DEFAULT_VERSION = '2.0.0';

/**
 * Status bar showing app title and current focus.
 */
export function StatusBar({
  version = DEFAULT_VERSION,
  focusedPane,
  testId,
}: StatusBarProps): React.JSX.Element {
  const focusLabels: Record<string, string> = {
    sidebar: 'Parks/Plans',
    main: 'Content',
    input: 'Command',
  };

  return (
    <Box
      width="100%"
      borderStyle="single"
      borderBottom
      data-testid={testId}
    >
      <Box paddingLeft={1}>
        <Text bold>
          POTA Activation Planner v{version}
        </Text>
      </Box>
      <Box flexGrow={1} />
      <Text dimColor>[?-help]</Text>
      <Text dimColor> | </Text>
      <Text color="cyan">
        Focus: {focusLabels[focusedPane] ?? focusedPane}
      </Text>
      <Box paddingRight={1} />
    </Box>
  );
}
