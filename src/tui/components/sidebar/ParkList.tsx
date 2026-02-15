/**
 * Park list component for sidebar.
 *
 * @module tui/components/sidebar/ParkList
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ParkListProps } from '../../types/components.js';
import { Spinner } from '../common/Spinner.js';

/**
 * Truncate string to max length.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * List of parks with selection support.
 */
export function ParkList({
  parks,
  selectedIndex,
  isFocused,
  onSelect,
  testId,
}: ParkListProps): React.JSX.Element {
  if (parks.length === 0) {
    return (
      <Box paddingLeft={1} data-testid={testId}>
        <Text dimColor>No parks loaded</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      {parks.map((park, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Box key={park.reference} paddingLeft={1}>
            {isSelected && isFocused ? (
              <Text color="cyan" bold>
                ▸ {truncate(park.reference, 8)}
              </Text>
            ) : (
              <Text dimColor={isSelected && !isFocused}>
                {'  '}
                {truncate(park.reference, 8)}
              </Text>
            )}
            <Text dimColor={!isSelected || isFocused}>
              {' '}
              {truncate(park.name, 24)}
            </Text>
          </Box>
        );
      })}

      {parks.length > 5 && (
        <Box paddingLeft={1}>
          <Text dimColor>{parks.length} parks</Text>
        </Box>
      )}
    </Box>
  );
}
