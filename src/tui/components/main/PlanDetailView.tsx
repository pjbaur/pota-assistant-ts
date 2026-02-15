/**
 * Plan detail view component.
 *
 * @module tui/components/main/PlanDetailView
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { PlanDetailViewProps } from '../../types/components.js';
import type { PlanStatus } from '../../../types/index.js';
import { Highlight, Muted, Info, Success, Warning } from '../common/Text.js';
import { Spinner } from '../common/Spinner.js';
import { WeatherPanel } from './WeatherPanel.js';
import { BandConditionsPanel } from './BandConditionsPanel.js';

/** Status colors and labels */
const STATUS_STYLES: Record<PlanStatus, { color: string; label: string }> = {
  draft: { color: 'gray', label: 'Draft' },
  finalized: { color: 'blue', label: 'Finalized' },
  completed: { color: 'green', label: 'Completed' },
  cancelled: { color: 'yellow', label: 'Cancelled' },
};

/**
 * Detailed view of an activation plan.
 */
export function PlanDetailView({
  plan,
  weather,
  bands,
  isLoading,
  testId,
}: PlanDetailViewProps): React.JSX.Element {
  if (isLoading) {
    return <Spinner label="Loading plan..." testId={testId} />;
  }

  const statusStyle = STATUS_STYLES[plan.status];

  return (
    <Box flexDirection="column" data-testid={testId}>
      {/* Park Info */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {plan.park.reference}
        </Text>
        <Text> - {plan.park.name}</Text>
      </Box>

      {/* Location */}
      <Box marginBottom={1}>
        <Highlight>Location: </Highlight>
        <Text>
          {plan.park.state ?? 'N/A'}, {plan.park.country ?? 'N/A'}
        </Text>
      </Box>

      {/* Plan Details */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Highlight>Date: </Highlight>
          <Text bold>{plan.plannedDate}</Text>
        </Box>
        {plan.plannedTime && (
          <Box>
            <Highlight>Time: </Highlight>
            <Text>{plan.plannedTime}</Text>
          </Box>
        )}
        {plan.durationHours && (
          <Box>
            <Highlight>Duration: </Highlight>
            <Text>{plan.durationHours} hours</Text>
          </Box>
        )}
        <Box>
          <Highlight>Status: </Highlight>
          <Text color={statusStyle.color}>{statusStyle.label}</Text>
        </Box>
      </Box>

      {/* Preset */}
      {plan.presetId && (
        <Box marginBottom={1}>
          <Highlight>Equipment Preset: </Highlight>
          <Text>{plan.presetId}</Text>
        </Box>
      )}

      {/* Notes */}
      {plan.notes && (
        <Box marginBottom={1} flexDirection="column">
          <Highlight>Notes:</Highlight>
          <Text dimColor>  {plan.notes}</Text>
        </Box>
      )}

      {/* Weather Panel */}
      {weather && (
        <Box marginTop={1}>
          <WeatherPanel forecast={weather} />
        </Box>
      )}

      {/* Band Conditions Panel */}
      {bands && (
        <Box marginTop={1}>
          <BandConditionsPanel conditions={bands} />
        </Box>
      )}

      {/* Timestamps */}
      <Box marginTop={1}>
        <Muted>
          Created: {new Date(plan.createdAt).toLocaleDateString()} | Updated:{' '}
          {new Date(plan.updatedAt).toLocaleDateString()}
        </Muted>
      </Box>
    </Box>
  );
}
