/**
 * Plan list component for sidebar.
 *
 * @module tui/components/sidebar/PlanList
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { PlanListProps } from '../../types/components.js';
import type { PlanStatus } from '../../../types/index.js';

/** Status colors */
const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'gray',
  finalized: 'blue',
  completed: 'green',
  cancelled: 'yellow',
};

/**
 * Truncate string to max length.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * List of plans with selection support.
 */
export function PlanList({
  plans,
  selectedIndex,
  isFocused,
  onSelect,
  testId,
}: PlanListProps): React.JSX.Element {
  if (plans.length === 0) {
    return (
      <Box paddingLeft={1} data-testid={testId}>
        <Text dimColor>No upcoming plans</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      {plans.map((plan, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Box key={plan.id} paddingLeft={1}>
            {isSelected && isFocused ? (
              <Text color="cyan" bold>
                ▸ {plan.plannedDate.slice(5)}
              </Text>
            ) : (
              <Text dimColor={isSelected && !isFocused}>
                {'  '}
                {plan.plannedDate.slice(5)}
              </Text>
            )}
            <Text dimColor={!isSelected || isFocused}>
              {' '}
              {plan.park.reference}
            </Text>
            <Text color={STATUS_COLORS[plan.status]} dimColor={!isSelected || isFocused}>
              {' '}
              [{plan.status.charAt(0).toUpperCase()}]
            </Text>
          </Box>
        );
      })}

      {plans.length > 5 && (
        <Box paddingLeft={1}>
          <Text dimColor>{plans.length} plans</Text>
        </Box>
      )}
    </Box>
  );
}
