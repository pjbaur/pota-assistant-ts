/**
 * Weather panel component.
 *
 * @module tui/components/main/WeatherPanel
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { WeatherPanelProps } from '../../types/components.js';
import { Highlight, Muted, Warning } from '../common/Text.js';
import { Spinner } from '../common/Spinner.js';

/** Weather icons based on conditions */
function getWeatherIcon(conditions: string): string {
  const lower = conditions.toLowerCase();
  if (lower.includes('sun') || lower.includes('clear')) return '☀';
  if (lower.includes('cloud')) return '☁';
  if (lower.includes('rain') || lower.includes('shower')) return '☔';
  if (lower.includes('snow')) return '❄';
  if (lower.includes('storm') || lower.includes('thunder')) return '⚡';
  if (lower.includes('fog') || lower.includes('mist')) return '☁';
  return '☀';
}

/**
 * Weather forecast display panel.
 */
export function WeatherPanel({
  forecast,
  isLoading,
  warning,
  testId,
}: WeatherPanelProps): React.JSX.Element {
  if (isLoading) {
    return <Spinner label="Loading weather..." testId={testId} />;
  }

  if (!forecast) {
    return (
      <Box flexDirection="column" data-testid={testId}>
        <Text bold>Weather</Text>
        <Muted>No weather data available</Muted>
      </Box>
    );
  }

  const icon = getWeatherIcon(forecast.conditions);

  return (
    <Box flexDirection="column" data-testid={testId}>
      <Box marginBottom={1}>
        <Text bold>Weather</Text>
        <Muted> - {forecast.date}</Muted>
      </Box>

      {warning && (
        <Box marginBottom={1}>
          <Warning>⚠ {warning}</Warning>
        </Box>
      )}

      <Box flexDirection="column">
        <Box>
          <Text>
            {icon} {forecast.conditions}
          </Text>
        </Box>
        <Box>
          <Highlight>High: </Highlight>
          <Text>{forecast.highTemp}°F</Text>
          <Text> | </Text>
          <Highlight>Low: </Highlight>
          <Text>{forecast.lowTemp}°F</Text>
        </Box>
        <Box>
          <Highlight>Wind: </Highlight>
          <Text>
            {forecast.windSpeed} mph {forecast.windDirection}
          </Text>
        </Box>
        <Box>
          <Highlight>Precip: </Highlight>
          <Text>{forecast.precipitationChance}%</Text>
        </Box>
        {forecast.sunrise && forecast.sunset && (
          <Box>
            <Highlight>Sun: </Highlight>
            <Text>
              {forecast.sunrise} - {forecast.sunset}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
