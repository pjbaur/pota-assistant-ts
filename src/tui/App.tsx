/**
 * Root Ink component for the POTA Activation Planner TUI.
 *
 * This is the main entry point for the React-based TUI.
 * It sets up the keyboard handlers and renders the layout.
 *
 * @module tui/App
 */

import React, { useEffect, useCallback, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { AppLayout } from './components/layout/AppLayout.js';
import { CommandPalette } from './components/overlay/CommandPalette.js';
import { HelpOverlay } from './components/overlay/HelpOverlay.js';
import { useAppStore, useParkStore, usePlanStore } from './store/index.js';
import type { CommandItem } from './types/components.js';

/**
 * Root application component.
 *
 * Handles:
 * - Global keyboard shortcuts
 * - Layout composition
 * - Overlay management
 */
export function App(): React.JSX.Element {
  const { exit } = useApp();
  const {
    focusedPane,
    activeView,
    commandPaletteOpen,
    helpOverlayVisible,
    toggleCommandPalette,
    toggleHelpOverlay,
    cycleFocusedPane,
    setActiveView,
    setFocusedPane,
    setSidebarSection,
    moveSelectionUp,
    moveSelectionDown,
    sidebarSection,
    selectedIndex,
    setCurrentPark,
    setCurrentPlan,
  } = useAppStore();

  const { parks, search, loadPark } = useParkStore();
  const { plans, loadPlans, loadPlan } = usePlanStore();

  // Command palette commands
  const commands: CommandItem[] = [
    {
      id: 'search',
      label: 'Search Parks',
      shortcut: 's',
      category: 'Navigation',
      action: () => setFocusedPane('input'),
    },
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      shortcut: 'd',
      category: 'Navigation',
      action: () => setActiveView('dashboard'),
    },
    {
      id: 'plans',
      label: 'View Plans',
      shortcut: 'p',
      category: 'Navigation',
      action: () => {
        setSidebarSection('plans');
        setFocusedPane('sidebar');
      },
    },
    {
      id: 'parks',
      label: 'View Parks',
      shortcut: '',
      category: 'Navigation',
      action: () => {
        setSidebarSection('parks');
        setFocusedPane('sidebar');
      },
    },
    {
      id: 'sync',
      label: 'Sync Park Data',
      shortcut: '',
      category: 'Data',
      action: () => {
        // Would trigger sync
      },
    },
    {
      id: 'help',
      label: 'Show Help',
      shortcut: '?',
      category: 'Help',
      action: () => toggleHelpOverlay(),
    },
    {
      id: 'quit',
      label: 'Quit',
      shortcut: 'q',
      category: 'Application',
      action: () => exit(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadPlans({ upcoming: true, limit: 20 });
    search('', { limit: 20 });
  }, [loadPlans, search]);

  // Global keyboard handler
  useInput(
    (input, key) => {
      // Don't handle input if overlays are open (except Escape)
      if (commandPaletteOpen) {
        if (key.escape) {
          toggleCommandPalette();
        }
        return;
      }

      if (helpOverlayVisible) {
        if (key.escape || input) {
          toggleHelpOverlay();
        }
        return;
      }

      // Command palette: Cmd/Ctrl+K
      if ((key.meta || key.ctrl) && input === 'k') {
        toggleCommandPalette();
        return;
      }

      // Help: ?
      if (input === '?') {
        toggleHelpOverlay();
        return;
      }

      // Tab: Cycle focus
      if (key.tab) {
        cycleFocusedPane();
        return;
      }

      // Escape: Return to sidebar
      if (key.escape) {
        setFocusedPane('sidebar');
        return;
      }

      // Quit: q (when in sidebar)
      if (input === 'q' && focusedPane === 'sidebar') {
        exit();
        return;
      }

      // Sidebar navigation
      if (focusedPane === 'sidebar') {
        const maxItems = sidebarSection === 'parks' ? parks.length : plans.length;

        // j or down arrow - move down
        if (input === 'j' || key.downArrow) {
          moveSelectionDown(maxItems);
          return;
        }

        // k or up arrow - move up
        if (input === 'k' || key.upArrow) {
          moveSelectionUp();
          return;
        }

        // Enter - select item
        if (key.return) {
          if (sidebarSection === 'parks' && parks[selectedIndex]) {
            setCurrentPark(parks[selectedIndex]);
            setActiveView('park-detail');
          } else if (sidebarSection === 'plans' && plans[selectedIndex]) {
            setCurrentPlan(plans[selectedIndex]);
            setActiveView('plan-detail');
          }
          return;
        }

        // p - switch to parks section
        if (input === 'p') {
          setSidebarSection('parks');
          return;
        }

        // l - switch to plans section
        if (input === 'l') {
          setSidebarSection('plans');
          return;
        }
      }

      // Main pane shortcuts
      if (focusedPane === 'main') {
        if (input === 'd') {
          setActiveView('dashboard');
        }
      }
    },
    { isActive: true }
  );

  const handleCommandSelect = useCallback(
    (command: CommandItem) => {
      toggleCommandPalette();
      command.action();
    },
    [toggleCommandPalette]
  );

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Main Layout */}
      <AppLayout />

      {/* Overlays */}
      {commandPaletteOpen && (
        <Box flexDirection="column" alignItems="center">
          <CommandPalette
            isOpen={commandPaletteOpen}
            query=""
            commands={commands}
            selectedIndex={0}
            onQueryChange={() => {}}
            onSelect={handleCommandSelect}
            onClose={toggleCommandPalette}
          />
        </Box>
      )}

      {helpOverlayVisible && (
        <Box flexDirection="column" alignItems="center">
          <HelpOverlay
            isVisible={helpOverlayVisible}
            onClose={toggleHelpOverlay}
          />
        </Box>
      )}
    </Box>
  );
}
