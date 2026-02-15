/**
 * Loading spinner component.
 *
 * @module tui/components/common/Spinner
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import type { SpinnerProps } from '../../types/components.js';

const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arrow: ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'],
};

/**
 * Animated spinner component.
 */
export function Spinner({
  type = 'dots',
  label,
  testId,
}: SpinnerProps): React.JSX.Element {
  const [frame, setFrame] = useState(0);
  const frames = SPINNER_FRAMES[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <Text dimColor data-testid={testId}>
      {frames[frame]} {label ?? 'Loading...'}
    </Text>
  );
}
