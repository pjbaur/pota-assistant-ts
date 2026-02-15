// Tests for CSV parser utility

import { describe, it, expect } from 'vitest';
import { parseCsvLine, parseCsvWithHeaders } from '../../src/utils/csv-parser.js';

describe('csv-parser', () => {
  describe('parseCsvLine', () => {
    it('should parse simple fields', () => {
      const result = parseCsvLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should parse numeric fields as strings', () => {
      const result = parseCsvLine('1,2,3');
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should handle empty fields', () => {
      const result = parseCsvLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    it('should handle trailing empty field', () => {
      const result = parseCsvLine('a,b,');
      expect(result).toEqual(['a', 'b', '']);
    });

    it('should handle leading empty field', () => {
      const result = parseCsvLine(',b,c');
      expect(result).toEqual(['', 'b', 'c']);
    });

    it('should parse quoted fields', () => {
      const result = parseCsvLine('"a","b","c"');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields with embedded commas', () => {
      const result = parseCsvLine('"a,b",c,d');
      expect(result).toEqual(['a,b', 'c', 'd']);
    });

    it('should handle multiple quoted fields with commas', () => {
      const result = parseCsvLine('"a,b","c,d","e,f"');
      expect(result).toEqual(['a,b', 'c,d', 'e,f']);
    });

    it('should handle escaped quotes (double quotes)', () => {
      const result = parseCsvLine('"a""b",c');
      expect(result).toEqual(['a"b', 'c']);
    });

    it('should handle multiple escaped quotes', () => {
      const result = parseCsvLine('"""a""","""b"""');
      expect(result).toEqual(['"a"', '"b"']);
    });

    it('should handle mixed quoted and unquoted fields', () => {
      const result = parseCsvLine('a,"b,c",d');
      expect(result).toEqual(['a', 'b,c', 'd']);
    });

    it('should handle empty string', () => {
      const result = parseCsvLine('');
      expect(result).toEqual(['']);
    });

    it('should handle single field', () => {
      const result = parseCsvLine('single');
      expect(result).toEqual(['single']);
    });

    it('should parse real POTA CSV row', () => {
      const line = 'K-0039,Yellowstone National Park,1,44.428,-110.5885,DN44xk,390,US-WY';
      const result = parseCsvLine(line);
      expect(result).toEqual([
        'K-0039',
        'Yellowstone National Park',
        '1',
        '44.428',
        '-110.5885',
        'DN44xk',
        '390',
        'US-WY',
      ]);
    });

    it('should handle park names with commas (quoted)', () => {
      const line = 'K-1234,"Park, with comma",1,40.0,-100.0,AB12cd,390,US-TX';
      const result = parseCsvLine(line);
      expect(result).toEqual([
        'K-1234',
        'Park, with comma',
        '1',
        '40.0',
        '-100.0',
        'AB12cd',
        '390',
        'US-TX',
      ]);
    });
  });

  describe('parseCsvWithHeaders', () => {
    it('should parse CSV with headers into objects', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const result = parseCsvWithHeaders<{ name: string; age: string }>(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.totalRows).toBe(2);
      expect(result.rows).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });

    it('should handle empty CSV', () => {
      const result = parseCsvWithHeaders<Record<string, string>>('');
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'name,age';
      const result = parseCsvWithHeaders<{ name: string; age: string }>(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toEqual([]);
      expect(result.totalRows).toBe(0);
    });

    it('should skip empty lines', () => {
      const csv = 'name,age\nJohn,30\n\nJane,25';
      const result = parseCsvWithHeaders<{ name: string; age: string }>(csv);

      expect(result.totalRows).toBe(2);
      expect(result.rows).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });

    it('should handle missing trailing fields', () => {
      const csv = 'name,age,city\nJohn,30';
      const result = parseCsvWithHeaders<{ name: string; age: string; city: string }>(csv);

      expect(result.rows).toEqual([
        { name: 'John', age: '30', city: '' },
      ]);
    });

    it('should handle extra fields', () => {
      const csv = 'name,age\nJohn,30,NYC';
      const result = parseCsvWithHeaders<{ name: string; age: string }>(csv);

      expect(result.rows).toEqual([
        { name: 'John', age: '30' },
      ]);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const csv = 'name,age\r\nJohn,30\r\nJane,25';
      const result = parseCsvWithHeaders<{ name: string; age: string }>(csv);

      expect(result.totalRows).toBe(2);
      expect(result.rows).toEqual([
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);
    });

    it('should parse POTA-style CSV headers', () => {
      const csv = 'reference,name,active,latitude,longitude,grid,entityId,locationDesc';
      const result = parseCsvWithHeaders(csv);

      expect(result.headers).toEqual([
        'reference',
        'name',
        'active',
        'latitude',
        'longitude',
        'grid',
        'entityId',
        'locationDesc',
      ]);
    });
  });
});
