/**
 * Command palette overlay component.
 *
 * @module tui/components/overlay/CommandPalette
 */

import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { CommandPaletteProps, CommandItem } from '../../types/components.js';

const DEFAULT_COMMANDS: CommandItem[] = [
  { id: 'search', label: 'Search Parks', shortcut: 's', category: 'Navigation', action: () => {} },
  { id: 'dashboard', label: 'Go to Dashboard', shortcut: 'd', category: 'Navigation', action: () => {} },
  { id: 'plans', label: 'View Plans', shortcut: 'p', category: 'Navigation', action: () => {} },
  { id: 'sync', label: 'Sync Park Data', shortcut: '', category: 'Data', action: () => {} },
  { id: 'help', label: 'Show Help', shortcut: '?', category: 'Help', action: () => {} },
  { id: 'quit', label: 'Quit', shortcut: 'q', category: 'Application', action: () => process.exit(0) },
];

/**
 * Command palette for quick actions.
 */
export function CommandPalette({
  isOpen,
  query,
  commands = DEFAULT_COMMANDS,
  selectedIndex,
  onQueryChange,
  onSelect,
  onClose,
  testId,
}: CommandPaletteProps): React.JSX.Element {
  const [internalQuery, setInternalQuery] = useState('');
  const [internalSelected, setInternalSelected] = useState(0);

  const activeQuery = query ?? internalQuery;
  const activeSelected = selectedIndex ?? internalSelected;

  const filteredCommands = useMemo(() => {
    if (!activeQuery) return commands;
    const lowerQuery = activeQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.category?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, activeQuery]);

  useInput(
    (input, key) => {
      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        setInternalSelected(Math.max(0, activeSelected - 1));
        return;
      }

      if (key.downArrow) {
        setInternalSelected(Math.min(filteredCommands.length - 1, activeSelected + 1));
        return;
      }

      if (key.return && filteredCommands[activeSelected]) {
        onSelect(filteredCommands[activeSelected]);
        return;
      }

      if (key.backspace || key.delete) {
        const newQuery = activeQuery.slice(0, -1);
        if (onQueryChange) {
          onQueryChange(newQuery);
        } else {
          setInternalQuery(newQuery);
        }
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        const newQuery = activeQuery + input;
        if (onQueryChange) {
          onQueryChange(newQuery);
        } else {
          setInternalQuery(newQuery);
        }
        setInternalSelected(0);
      }
    },
    { isActive: isOpen }
  );

  if (!isOpen) return <></>;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      width={60}
      data-testid={testId}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Command Palette
        </Text>
        <Text dimColor> (Esc to close)</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">&gt; </Text>
        <Text>{activeQuery}</Text>
        <Text backgroundColor="white" color="black"> </Text>
      </Box>

      {filteredCommands.length === 0 ? (
        <Text dimColor>No commands found</Text>
      ) : (
        filteredCommands.map((cmd, index) => (
          <Box key={cmd.id}>
            <Text
              color={index === activeSelected ? 'cyan' : undefined}
              bold={index === activeSelected}
            >
              {index === activeSelected ? '▸ ' : '  '}
              {cmd.label}
            </Text>
            {cmd.shortcut && (
              <Text
                dimColor={index !== activeSelected}
              >
                {' '}
                [{cmd.shortcut}]
              </Text>
            )}
            {cmd.category && (
              <Text
                dimColor
              >
                {' '}
                - {cmd.category}
              </Text>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}
