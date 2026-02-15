/**
 * Input bar component - bottom command input.
 *
 * @module tui/components/layout/InputBar
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { InputBarProps } from '../../types/components.js';

/**
 * Command input bar at bottom of TUI.
 */
export function InputBar({
  isFocused,
  placeholder = 'Type a command...',
  value: controlledValue,
  onChange,
  onSubmit,
  testId,
}: InputBarProps): React.JSX.Element {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue ?? internalValue;

  const handleInputChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onChange]
  );

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmit(value.trim());
      if (!onChange) {
        setInternalValue('');
      }
    }
  }, [value, onSubmit, onChange]);

  // Handle input when focused
  useInput(
    (input, key) => {
      if (key.return) {
        handleSubmit();
      } else if (key.backspace || key.delete) {
        handleInputChange(value.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        handleInputChange(value + input);
      }
    },
    { isActive: isFocused }
  );

  return (
    <Box
      borderStyle="single"
      borderTop
      borderColor={isFocused ? 'cyan' : 'gray'}
      data-testid={testId}
    >
      <Box paddingLeft={1}>
        <Text color={isFocused ? 'cyan' : undefined} bold={isFocused}>
          &gt;{' '}
        </Text>
      </Box>
      {value ? (
        <Text>{value}</Text>
      ) : (
        <Text dimColor>{placeholder}</Text>
      )}
      {isFocused && <Text backgroundColor="cyan"> </Text>}
    </Box>
  );
}
