/**
 * Main content area component - right pane.
 *
 * @module tui/components/layout/MainContent
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { MainContentProps } from '../../types/components.js';
import { useAppStore } from '../../store/index.js';
import { DashboardView } from '../main/DashboardView.js';
import { ParkDetailView } from '../main/ParkDetailView.js';
import { PlanDetailView } from '../main/PlanDetailView.js';

/**
 * Main content area showing different views based on activeView.
 */
export function MainContent({
  isFocused,
  activeView,
  testId,
}: MainContentProps): React.JSX.Element {
  const { currentPark, currentPlan } = useAppStore();

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView currentPark={currentPark} currentPlan={currentPlan} />;
      case 'park-detail':
        if (currentPark) {
          return <ParkDetailView park={currentPark} />;
        }
        return (
          <Box flexDirection="column" padding={1}>
            <Text dimColor>No park selected</Text>
            <Text dimColor>Select a park from the sidebar</Text>
          </Box>
        );
      case 'plan-detail':
        if (currentPlan) {
          return <PlanDetailView plan={currentPlan} />;
        }
        return (
          <Box flexDirection="column" padding={1}>
            <Text dimColor>No plan selected</Text>
            <Text dimColor>Select a plan from the sidebar</Text>
          </Box>
        );
      case 'search':
        return (
          <Box flexDirection="column" padding={1}>
            <Text bold>Search</Text>
            <Text dimColor>Enter a search query in the input bar</Text>
          </Box>
        );
      default:
        return (
          <Box flexDirection="column" padding={1}>
            <Text dimColor>Unknown view: {activeView}</Text>
          </Box>
        );
    }
  };

  return (
    <Box
      flexDirection="column"
      width="100%"
      height="100%"
      data-testid={testId}
    >
      {/* Header */}
      <Box paddingX={1} borderStyle="single" borderBottom>
        <Text bold color={isFocused ? 'cyan' : undefined}>
          {activeView.toUpperCase().replace('-', ' ')}
        </Text>
        <Box flexGrow={1} />
        <Text dimColor>[d:dashboard w:weather b:bands]</Text>
      </Box>

      {/* Content */}
      <Box flexGrow={1} flexDirection="column" padding={1}>
        {renderContent()}
      </Box>
    </Box>
  );
}
