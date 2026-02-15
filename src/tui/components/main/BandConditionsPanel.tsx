/**
 * Band conditions panel component.
 *
 * @module tui/components/main/BandConditionsPanel
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { BandConditionsPanelProps } from '../../types/components.js';
import type { BandRating } from '../../../types/index.js';
import { Highlight, Muted } from '../common/Text.js';
import { Spinner } from '../common/Spinner.js';

/** Rating to color mapping */
const RATING_COLORS: Record<BandRating, string> = {
  excellent: 'green',
  good: 'blue',
  fair: 'yellow',
  poor: 'red',
};

/** Rating to stars */
const RATING_STARS: Record<BandRating, string> = {
  excellent: '★★★★★',
  good: '★★★★☆',
  fair: '★★★☆☆',
  poor: '★★☆☆☆',
};

/**
 * Truncate string to max length.
 */
function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Band conditions display panel.
 */
export function BandConditionsPanel({
  conditions,
  isLoading,
  testId,
}: BandConditionsPanelProps): React.JSX.Element {
  if (isLoading) {
    return <Spinner label="Loading band conditions..." testId={testId} />;
  }

  if (!conditions) {
    return (
      <Box flexDirection="column" data-testid={testId}>
        <Text bold>Band Conditions</Text>
        <Muted>No band data available</Muted>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      <Box marginBottom={1}>
        <Text bold>Band Conditions</Text>
        <Muted> - {conditions.date}</Muted>
      </Box>

      {/* Table Header */}
      <Box>
        <Text bold dimColor>
          {'Time'.padEnd(14)}
        </Text>
        <Text bold dimColor>
          {'Band'.padEnd(6)}
        </Text>
        <Text bold dimColor>
          {'Mode'.padEnd(8)}
        </Text>
        <Text bold dimColor>
          {'Rating'.padEnd(10)}
        </Text>
        <Text bold dimColor>
          Notes
        </Text>
      </Box>

      {/* Table Rows */}
      {conditions.recommendations.map((rec, index) => (
        <Box key={`${rec.timeSlot}-${rec.band}-${index}`}>
          <Text dimColor>{truncate(rec.timeSlot, 14).padEnd(14)}</Text>
          <Text>{rec.band.padEnd(6)}</Text>
          <Text dimColor>{rec.mode.padEnd(8)}</Text>
          <Text color={RATING_COLORS[rec.rating]}>
            {RATING_STARS[rec.rating].padEnd(10)}
          </Text>
          <Text dimColor>{truncate(rec.notes, 20)}</Text>
        </Box>
      ))}

      {/* Disclaimer */}
      {conditions.disclaimer && (
        <Box marginTop={1}>
          <Muted>ℹ {truncate(conditions.disclaimer, 70)}</Muted>
        </Box>
      )}
    </Box>
  );
}
