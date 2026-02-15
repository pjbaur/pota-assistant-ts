/**
 * Park detail view component.
 *
 * @module tui/components/main/ParkDetailView
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ParkDetailViewProps } from '../../types/components.js';
import { Highlight, Muted, Success, Warning } from '../common/Text.js';
import { Spinner } from '../common/Spinner.js';

/**
 * Truncate string to max length.
 */
function truncate(str: string, maxLen: number): string {
  if (!str) return 'N/A';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Detailed view of a park.
 */
export function ParkDetailView({
  park,
  weather,
  isLoading,
  testId,
}: ParkDetailViewProps): React.JSX.Element {
  if (isLoading) {
    return <Spinner label="Loading park details..." testId={testId} />;
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {park.reference}
        </Text>
        <Text> - {truncate(park.name, 50)}</Text>
      </Box>

      {/* Location */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Highlight>Location: </Highlight>
          <Text>
            {park.state ?? 'N/A'}, {park.country ?? 'N/A'}
          </Text>
        </Box>
        <Box>
          <Highlight>Coords: </Highlight>
          <Text>
            {park.latitude.toFixed(4)}, {park.longitude.toFixed(4)}
          </Text>
        </Box>
        <Box>
          <Highlight>Grid: </Highlight>
          <Text>{park.gridSquare ?? 'Unknown'}</Text>
        </Box>
      </Box>

      {/* Details */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Highlight>Type: </Highlight>
          <Text>{park.parkType ?? 'Unknown'}</Text>
        </Box>
        <Box>
          <Highlight>Region: </Highlight>
          <Text>{park.region ?? 'Unknown'}</Text>
        </Box>
        <Box>
          <Highlight>Status: </Highlight>
          {park.isActive ? (
            <Success>Active</Success>
          ) : (
            <Warning>Inactive</Warning>
          )}
        </Box>
      </Box>

      {/* URL */}
      {park.potaUrl && (
        <Box marginBottom={1}>
          <Highlight>URL: </Highlight>
          <Text color="blue">{park.potaUrl}</Text>
        </Box>
      )}

      {/* Weather (if available) */}
      {weather && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderTop>
          <Text bold>Weather</Text>
          <Box>
            <Text>
              {weather.conditions} | High: {weather.highTemp}°F | Low: {weather.lowTemp}°F
            </Text>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Muted>Last synced: {new Date(park.syncedAt).toLocaleDateString()}</Muted>
      </Box>
    </Box>
  );
}
