/**
 * Sidebar component - left pane with park and plan lists.
 *
 * @module tui/components/layout/Sidebar
 */

import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import type { SidebarProps } from '../../types/components.js';
import type { Park, PlanWithPark } from '../../../types/index.js';
import { useAppStore, useParkStore, usePlanStore } from '../../store/index.js';
import { ParkList } from '../sidebar/ParkList.js';
import { PlanList } from '../sidebar/PlanList.js';

/**
 * Sidebar containing park and plan lists.
 */
export function Sidebar({
  isFocused,
  activeSection,
  selectedIndex,
  testId,
}: SidebarProps): React.JSX.Element {
  const { parks, isLoading: isLoadingParks } = useParkStore();
  const { plans, isLoading: isLoadingPlans } = usePlanStore();
  const { setCurrentPark, setCurrentPlan, setActiveView } = useAppStore();

  const handleParkSelect = useCallback(
    (park: Park) => {
      setCurrentPark(park);
      setActiveView('park-detail');
    },
    [setCurrentPark, setActiveView]
  );

  const handlePlanSelect = useCallback(
    (plan: PlanWithPark) => {
      setCurrentPlan(plan);
      setActiveView('plan-detail');
    },
    [setCurrentPlan, setActiveView]
  );

  return (
    <Box flexDirection="column" width="100%" data-testid={testId}>
      {/* Parks Section */}
      <Box flexDirection="column" borderStyle="single" borderBottom>
        <Box paddingLeft={1}>
          <Text
            bold
            color={
              isFocused && activeSection === 'parks' ? 'cyan' : undefined
            }
          >
            PARKS
          </Text>
          {isFocused && activeSection === 'parks' && (
            <Text color="cyan"> (focused)</Text>
          )}
        </Box>
        <ParkList
          parks={parks}
          selectedIndex={activeSection === 'parks' ? selectedIndex : -1}
          isFocused={isFocused && activeSection === 'parks'}
          onSelect={handleParkSelect}
        />
      </Box>

      {/* Plans Section */}
      <Box flexDirection="column" flexGrow={1}>
        <Box paddingLeft={1}>
          <Text
            bold
            color={
              isFocused && activeSection === 'plans' ? 'cyan' : undefined
            }
          >
            PLANS
          </Text>
          {isFocused && activeSection === 'plans' && (
            <Text color="cyan"> (focused)</Text>
          )}
        </Box>
        <PlanList
          plans={plans}
          selectedIndex={activeSection === 'plans' ? selectedIndex : -1}
          isFocused={isFocused && activeSection === 'plans'}
          onSelect={handlePlanSelect}
        />
      </Box>

      {/* Footer */}
      <Box paddingLeft={1}>
        <Text dimColor>[Tab: switch] </Text>
        <Text dimColor>[j/k: navigate]</Text>
      </Box>
    </Box>
  );
}
