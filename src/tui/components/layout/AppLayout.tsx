/**
 * Main app layout component - split-pane container.
 *
 * @module tui/components/layout/AppLayout
 */

import React, { useEffect } from 'react';
import { Box } from 'ink';
import { useAppStore, useParkStore, usePlanStore } from '../../store/index.js';
import { StatusBar } from './StatusBar.js';
import { Sidebar } from './Sidebar.js';
import { MainContent } from './MainContent.js';
import { InputBar } from './InputBar.js';

/**
 * Main application layout with split-pane design.
 */
export function AppLayout(): React.JSX.Element {
  const {
    focusedPane,
    activeView,
    sidebarSection,
    selectedIndex,
    setFocusedPane,
  } = useAppStore();

  const { loadPlans } = usePlanStore();
  const { search } = useParkStore();

  const handleCommandSubmit = (command: string) => {
    // Handle commands
    const cmd = command.toLowerCase().trim();

    if (cmd.startsWith('search ') || cmd.startsWith('find ')) {
      const query = cmd.replace(/^(search|find)\s+/, '');
      search(query);
    } else if (cmd === 'dashboard' || cmd === 'd') {
      useAppStore.getState().setActiveView('dashboard');
    } else if (cmd === 'help') {
      useAppStore.getState().toggleHelpOverlay();
    } else if (cmd === 'quit' || cmd === 'exit' || cmd === 'q') {
      process.exit(0);
    }
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Status Bar */}
      <StatusBar focusedPane={focusedPane} />

      {/* Main Layout */}
      <Box flexGrow={1} flexDirection="row">
        {/* Sidebar */}
        <Sidebar
          isFocused={focusedPane === 'sidebar'}
          activeSection={sidebarSection}
          selectedIndex={selectedIndex}
        />

        {/* Main Content */}
        <MainContent
          isFocused={focusedPane === 'main'}
          activeView={activeView}
        />
      </Box>

      {/* Input Bar */}
      <InputBar
        isFocused={focusedPane === 'input'}
        onSubmit={handleCommandSubmit}
        placeholder="Type a command (search, help, quit)..."
      />
    </Box>
  );
}
