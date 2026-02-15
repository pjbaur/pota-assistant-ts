/**
 * Global keyboard input hook.
 *
 * @module tui/hooks/useInput
 */

import { useCallback } from 'react';
import { useInput as useInkInput } from 'ink';
import { useAppStore, useParkStore, usePlanStore } from '../store/index.js';
import type { KeyEvent } from '../types/events.js';
import { normalizeKey } from '../types/events.js';

export interface UseGlobalInputOptions {
  /** Whether input handling is enabled */
  enabled?: boolean;
}

/**
 * Hook for handling global keyboard shortcuts.
 *
 * This hook sets up the main keyboard navigation and command handling.
 */
export function useGlobalInput(options: UseGlobalInputOptions = {}): void {
  const { enabled = true } = options;

  const {
    focusedPane,
    sidebarSection,
    commandPaletteOpen,
    helpOverlayVisible,
    cycleFocusedPane,
    setSidebarSection,
    moveSelectionUp,
    moveSelectionDown,
    toggleCommandPalette,
    toggleHelpOverlay,
    setActiveView,
    setFocusedPane,
  } = useAppStore();

  const { parks } = useParkStore();
  const { plans } = usePlanStore();

  const handleInput = useCallback(
    (input: string, key: Record<string, boolean>) => {
      // Build KeyEvent
      const event: KeyEvent = {
        key: normalizeKey(input),
        ctrl: key.ctrl ?? false,
        meta: key.meta ?? false,
        shift: key.shift ?? false,
      };

      // Don't handle if overlays are open (except Escape)
      if (commandPaletteOpen || helpOverlayVisible) {
        if (event.key === 'Escape') {
          if (commandPaletteOpen) toggleCommandPalette();
          if (helpOverlayVisible) toggleHelpOverlay();
        }
        return;
      }

      // Global shortcuts
      if ((event.ctrl || event.meta) && event.key === 'k') {
        toggleCommandPalette();
        return;
      }

      if (event.key === '?') {
        toggleHelpOverlay();
        return;
      }

      // Tab - cycle focus
      if (event.key === 'Tab') {
        cycleFocusedPane();
        return;
      }

      // Escape - return to sidebar
      if (event.key === 'Escape') {
        setFocusedPane('sidebar');
        return;
      }

      // Sidebar navigation
      if (focusedPane === 'sidebar') {
        // j or down arrow - move down
        if (event.key === 'j' || (key.downArrow ?? false)) {
          const maxItems = sidebarSection === 'parks' ? parks.length : plans.length;
          moveSelectionDown(maxItems);
          return;
        }

        // k or up arrow - move up
        if (event.key === 'k' || (key.upArrow ?? false)) {
          moveSelectionUp();
          return;
        }

        // p - switch to parks section
        if (event.key === 'p') {
          setSidebarSection('parks');
          return;
        }

        // l - switch to plans section
        if (event.key === 'l') {
          setSidebarSection('plans');
          return;
        }

        // q - quit
        if (event.key === 'q') {
          process.exit(0);
        }
      }

      // Main pane shortcuts
      if (focusedPane === 'main') {
        if (event.key === 'd') {
          setActiveView('dashboard');
        }
      }
    },
    [
      focusedPane,
      sidebarSection,
      commandPaletteOpen,
      helpOverlayVisible,
      parks.length,
      plans.length,
      cycleFocusedPane,
      setSidebarSection,
      moveSelectionUp,
      moveSelectionDown,
      toggleCommandPalette,
      toggleHelpOverlay,
      setActiveView,
      setFocusedPane,
    ]
  );

  useInkInput(handleInput, { isActive: enabled });
}
