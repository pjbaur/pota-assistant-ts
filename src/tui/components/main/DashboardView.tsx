/**
 * Dashboard view component - main overview.
 *
 * @module tui/components/main/DashboardView
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { DashboardViewProps } from '../../types/components.js';
import { Highlight, Muted, Success, Info } from '../common/Text.js';
import { Spinner } from '../common/Spinner.js';
import { WeatherPanel } from './WeatherPanel.js';
import { BandConditionsPanel } from './BandConditionsPanel.js';
import { getBandConditions } from '../../../services/band-service.js';
import type { BandConditions } from '../../../types/index.js';

/**
 * Main dashboard showing overview and current conditions.
 */
export function DashboardView({
  currentPark,
  currentPlan,
  weather,
  bands,
  isLoading,
  testId,
}: DashboardViewProps): React.JSX.Element {
  const [todayBands, setTodayBands] = useState<BandConditions | null>(null);

  // Load today's band conditions
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const conditions = getBandConditions(today);
    setTodayBands(conditions);
  }, []);

  if (isLoading) {
    return <Spinner label="Loading dashboard..." testId={testId} />;
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      {/* Welcome */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          POTA Activation Planner
        </Text>
      </Box>

      {/* Current Selection */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Current Selection</Text>
        {currentPark ? (
          <Box>
            <Highlight>Park: </Highlight>
            <Text>
              {currentPark.reference} - {currentPark.name}
            </Text>
          </Box>
        ) : (
          <Muted>No park selected</Muted>
        )}
        {currentPlan && (
          <Box>
            <Highlight>Plan: </Highlight>
            <Text>
              {currentPlan.plannedDate} at {currentPlan.park.reference}
            </Text>
          </Box>
        )}
      </Box>

      {/* Today's Band Conditions */}
      {todayBands && (
        <Box marginBottom={1}>
          <BandConditionsPanel conditions={todayBands} />
        </Box>
      )}

      {/* Weather (if park selected) */}
      {weather && (
        <Box marginBottom={1}>
          <WeatherPanel forecast={weather} />
        </Box>
      )}

      {/* Quick Tips */}
      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="single"
        padding={1}
      >
        <Text bold>Quick Tips</Text>
        <Muted>• Press Tab to switch between panes</Muted>
        <Muted>• Use j/k or arrows to navigate lists</Muted>
        <Muted>• Press Enter to select an item</Muted>
        <Muted>• Press ? for help, Cmd+K for command palette</Muted>
        <Muted>• Type "search yellowstone" to find parks</Muted>
      </Box>
    </Box>
  );
}
