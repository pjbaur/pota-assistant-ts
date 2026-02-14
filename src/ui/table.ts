/**
 * Table formatter with multiple styles
 * Optimized for 80-column terminals
 */

import type { TableStyle } from '../types/index.js';
import { muted } from './colors.js';

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableOptions {
  style?: TableStyle;
  color?: boolean;
  maxWidth?: number;
}

interface BoxCharacters {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  leftTee: string;
  rightTee: string;
  topTee: string;
  bottomTee: string;
  cross: string;
}

const BOX_STYLES: Record<TableStyle, BoxCharacters> = {
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    leftTee: '├',
    rightTee: '┤',
    topTee: '┬',
    bottomTee: '┴',
    cross: '┼',
  },
  sharp: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftTee: '├',
    rightTee: '┤',
    topTee: '┬',
    bottomTee: '┴',
    cross: '┼',
  },
  minimal: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    horizontal: '─',
    vertical: ' ',
    leftTee: ' ',
    rightTee: ' ',
    topTee: ' ',
    bottomTee: ' ',
    cross: '─',
  },
  none: {
    topLeft: '',
    topRight: '',
    bottomLeft: '',
    bottomRight: '',
    horizontal: '',
    vertical: ' ',
    leftTee: '',
    rightTee: '',
    topTee: '',
    bottomTee: '',
    cross: '',
  },
};

const TERMINAL_WIDTH = 80;
const MIN_COLUMN_WIDTH = 5;

/**
 * Truncate a string to fit within a specified width
 */
function truncate(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) {
    return value;
  }
  if (maxWidth <= 3) {
    return value.slice(0, maxWidth);
  }
  return value.slice(0, maxWidth - 3) + '...';
}

/**
 * Pad a string according to alignment
 */
function padString(value: string, width: number, align: 'left' | 'right' | 'center'): string {
  const padding = width - value.length;

  if (padding <= 0) {
    return value.slice(0, width);
  }

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + value;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + value + ' '.repeat(rightPad);
    case 'left':
    default:
      return value + ' '.repeat(padding);
  }
}

/**
 * Calculate column widths based on content and available space
 */
function calculateColumnWidths(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  maxWidth: number,
  style: TableStyle
): number[] {
  const box = BOX_STYLES[style];
  const borderOverhead = box.vertical.length * (columns.length + 1);
  const availableWidth = maxWidth - borderOverhead - 2; // -2 for padding

  // Calculate natural widths
  const naturalWidths = columns.map((col, index) => {
    const headerWidth = col.header.length;
    const dataWidths = data.map((row) => {
      const value = String(row[col.key] ?? '');
      return value.length;
    });
    const maxDataWidth = Math.max(0, ...dataWidths);
    const naturalWidth = Math.max(headerWidth, maxDataWidth);

    // If explicit width is set, use it
    if (col.width !== undefined) {
      return Math.max(MIN_COLUMN_WIDTH, col.width);
    }

    return Math.max(MIN_COLUMN_WIDTH, naturalWidth);
  });

  const totalNaturalWidth = naturalWidths.reduce((sum, w) => sum + w, 0);

  // If fits within available width, use natural widths
  if (totalNaturalWidth <= availableWidth) {
    return naturalWidths;
  }

  // Scale down proportionally
  const scale = availableWidth / totalNaturalWidth;
  return naturalWidths.map((w) => Math.max(MIN_COLUMN_WIDTH, Math.floor(w * scale)));
}

/**
 * Format data as a table
 */
export function formatTable(
  data: Record<string, unknown>[],
  columns: ColumnDef[],
  options: TableOptions = {}
): string {
  const {
    style = 'rounded',
    color = true,
    maxWidth = TERMINAL_WIDTH,
  } = options;

  if (columns.length === 0) {
    return '';
  }

  if (data.length === 0) {
    return muted('No data to display');
  }

  const box = BOX_STYLES[style];
  const widths = calculateColumnWidths(data, columns, maxWidth, style);
  const lines: string[] = [];

  // Build top border
  if (style !== 'none') {
    const topBorder =
      box.topLeft +
      widths.map((w) => box.horizontal.repeat(w + 2)).join(box.topTee) +
      box.topRight;
    lines.push(topBorder);
  }

  // Build header row
  const headerCells = columns.map((col, i) => {
    const value = truncate(col.header, widths[i]);
    return ' ' + padString(value, widths[i], col.align ?? 'left') + ' ';
  });

  if (style === 'none') {
    lines.push(headerCells.join(' '));
  } else {
    lines.push(box.vertical + headerCells.join(box.vertical) + box.vertical);
  }

  // Build header separator
  if (style !== 'none' && style !== 'minimal') {
    const separator =
      box.leftTee +
      widths.map((w) => box.horizontal.repeat(w + 2)).join(box.cross) +
      box.rightTee;
    lines.push(separator);
  }

  // Build data rows
  for (const row of data) {
    const cells = columns.map((col, i) => {
      const rawValue = String(row[col.key] ?? '');
      const value = truncate(rawValue, widths[i]);
      return ' ' + padString(value, widths[i], col.align ?? 'left') + ' ';
    });

    if (style === 'none') {
      lines.push(cells.join(' '));
    } else {
      lines.push(box.vertical + cells.join(box.vertical) + box.vertical);
    }
  }

  // Build bottom border
  if (style !== 'none') {
    const bottomBorder =
      box.bottomLeft +
      widths.map((w) => box.horizontal.repeat(w + 2)).join(box.bottomTee) +
      box.bottomRight;
    lines.push(bottomBorder);
  }

  return lines.join('\n');
}

/**
 * Format a simple key-value table
 */
export function formatKeyValue(
  data: Record<string, unknown>,
  options: TableOptions = {}
): string {
  const entries = Object.entries(data);
  const keyWidth = Math.max(...entries.map(([k]) => k.length));

  const columns: ColumnDef[] = [
    { key: 'key', header: 'Field', width: keyWidth },
    { key: 'value', header: 'Value' },
  ];

  const tableData = entries.map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }));

  return formatTable(tableData, columns, options);
}
