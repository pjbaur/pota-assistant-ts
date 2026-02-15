/**
 * Generic modal wrapper component.
 *
 * @module tui/components/overlay/Modal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { ModalProps } from '../../types/components.js';

/**
 * Generic modal component.
 */
export function Modal({
  isOpen,
  title,
  children,
  onClose,
  width = 50,
  testId,
}: ModalProps): React.JSX.Element {
  useInput(
    (input, key) => {
      if (key.escape) {
        onClose();
      }
    },
    { isActive: isOpen }
  );

  if (!isOpen) return <></>;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      width={width}
      data-testid={testId}
    >
      <Box marginBottom={1} borderStyle="single" borderBottom>
        <Text bold>{title}</Text>
      </Box>
      <Box flexDirection="column">{children}</Box>
      <Box marginTop={1}>
        <Text dimColor>Press Esc to close</Text>
      </Box>
    </Box>
  );
}
