/**
 * CSV Parser utility - handles parsing CSV content with quote support.
 *
 * Provides functions to parse CSV lines and files with support for:
 * - Quoted fields with embedded commas
 * - Escaped quotes (double quotes)
 * - Empty fields
 * - Header-based parsing with typed row objects
 *
 * @module utils/csv-parser
 */

/**
 * Parses a single CSV line into an array of field values.
 *
 * Handles quoted fields containing commas and escaped quotes.
 * A double quote inside a quoted field is represented by two double quotes.
 *
 * @param line - A single line of CSV text (without line ending)
 * @returns Array of field values
 *
 * @example
 * ```typescript
 * parseCsvLine('a,b,c'); // ['a', 'b', 'c']
 * parseCsvLine('"a,b",c'); // ['a,b', 'c']
 * parseCsvLine('"a""b",c'); // ['a"b', 'c']
 * ```
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (double quote)
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Add the last field
  fields.push(current);

  return fields;
}

/**
 * Result of parsing a CSV file with headers.
 */
export interface CsvParseResult<T> {
  /** The header row column names */
  headers: string[];
  /** Array of parsed row objects */
  rows: T[];
  /** Total number of rows parsed (excluding header) */
  totalRows: number;
}

/**
 * Parses CSV content with a header row into typed objects.
 *
 * The first line is treated as the header row. Each subsequent line
 * is parsed and mapped to an object using the header values as keys.
 *
 * @param content - The full CSV file content as a string
 * @returns Parsed result with headers and typed row objects
 *
 * @example
 * ```typescript
 * const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
 * const result = parseCsvWithHeaders<{name: string; age: string; city: string}>(csv);
 * // result.rows = [{name: 'John', age: '30', city: 'NYC'}, ...]
 * ```
 */
export function parseCsvWithHeaders<T extends Record<string, string>>(
  content: string
): CsvParseResult<T> {
  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Parse header row
  const headers = parseCsvLine(lines[0] ?? '');

  if (headers.length === 0 || (headers.length === 1 && headers[0] === '')) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const rows: T[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line || line.trim() === '') {
      continue;
    }

    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j] ?? '';
      row[header] = values[j] ?? '';
    }

    rows.push(row as T);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}
