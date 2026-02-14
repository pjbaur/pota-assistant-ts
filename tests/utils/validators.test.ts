// Tests for input validators

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateParkRef,
  validateDate,
  validateGridSquare,
  validateCallsign,
  validateExportPath,
  validateStateCode,
  validateLimit,
} from '../../src/utils/validators.js';

describe('validators', () => {
  describe('validateParkRef', () => {
    it('should validate correct park references', () => {
      const validRefs = ['K-0039', 'VE-12345', 'G-1234', 'K-9999', 'DL-0001'];

      for (const ref of validRefs) {
        const result = validateParkRef(ref);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(ref.toUpperCase());
        }
      }
    });

    it('should normalize reference to uppercase', () => {
      const result = validateParkRef('k-0039');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('K-0039');
      }
    });

    it('should trim whitespace', () => {
      const result = validateParkRef('  K-0039  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('K-0039');
      }
    });

    it('should reject empty string', () => {
      const result = validateParkRef('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should reject whitespace-only string', () => {
      const result = validateParkRef('   ');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should reject invalid formats', () => {
      const invalidRefs = [
        'K0039',      // Missing dash
        'K-39',       // Too few digits
        'K-123',      // Too few digits
        'K-123456',   // Too many digits
        'ABCD-1234',  // Too many letters (max 3)
        '1-1234',     // Starts with digit
        'K-ABCD',     // Letters instead of digits
      ];

      for (const ref of invalidRefs) {
        const result = validateParkRef(ref);
        expect(result.success, `Expected ${ref} to be invalid`).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_PARK_REF');
        }
      }
    });

    it('should accept single-letter prefixes', () => {
      // Pattern allows 1-3 letters before dash
      const validRefs = ['A-1234', 'K-0039', 'G-5678'];
      for (const ref of validRefs) {
        const result = validateParkRef(ref);
        expect(result.success, `Expected ${ref} to be valid`).toBe(true);
      }
    });
  });

  describe('validateDate', () => {
    beforeEach(() => {
      // Set a fixed "now" for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    it('should validate correct date format', () => {
      const result = validateDate('2024-06-20');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('2024-06-20');
      }
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        '06-20-2024',     // Wrong format
        '2024/06/20',     // Wrong separator
        '20-06-2024',     // Wrong order
        '2024-6-20',      // Missing zero padding
        '2024-06-5',      // Missing zero padding
        'not-a-date',     // Not a date
      ];

      for (const date of invalidDates) {
        const result = validateDate(date);
        expect(result.success, `Expected ${date} to be invalid`).toBe(false);
      }
    });

    it('should accept dates that JavaScript normalizes', () => {
      // JavaScript's Date handles some impossible dates by rolling them over
      // (e.g., Feb 30 becomes Feb 29 in leap years or Mar 1/2). The validator
      // only checks format and if Date.getTime() returns NaN.
      const normalizedDates = ['2024-02-30'];
      for (const date of normalizedDates) {
        const result = validateDate(date);
        expect(result.success, `Expected ${date} to be accepted (JS normalizes it)`).toBe(true);
      }
    });

    it('should reject empty date', () => {
      const result = validateDate('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should reject past dates when allowPast is false', () => {
      const result = validateDate('2024-06-14', { allowPast: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PAST_DATE');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should allow past dates when allowPast is true (default)', () => {
      const result = validateDate('2024-06-14');
      expect(result.success).toBe(true);
    });

    it('should reject dates too far in the future', () => {
      const result = validateDate('2026-06-20', { maxFuture: 365 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FUTURE_DATE');
      }
    });

    it('should respect custom maxFuture option', () => {
      // 30 days from "now" should be valid with maxFuture: 30
      const result = validateDate('2024-07-15', { maxFuture: 30 });
      expect(result.success).toBe(true);
    });

    it('should reject dates beyond custom maxFuture option', () => {
      // 31 days from "now" should be invalid with maxFuture: 30
      const result = validateDate('2024-07-16', { maxFuture: 30 });
      expect(result.success).toBe(false);
    });

    it('should accept date that passes regex but gets normalized by JS', () => {
      // JavaScript's Date constructor normalizes impossible dates like Feb 31
      // to valid dates (rolls over to March). The validator only checks format.
      const result = validateDate('2024-02-31');
      expect(result.success).toBe(true);
    });
  });

  describe('validateGridSquare', () => {
    it('should validate 4-character grid squares', () => {
      const result = validateGridSquare('FN42');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('FN42');
      }
    });

    it('should validate 6-character grid squares', () => {
      const result = validateGridSquare('FN42ab');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('FN42AB');
      }
    });

    it('should normalize to uppercase', () => {
      const result = validateGridSquare('fn42ab');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('FN42AB');
      }
    });

    it('should trim whitespace', () => {
      const result = validateGridSquare('  FN42  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('FN42');
      }
    });

    it('should reject empty grid square', () => {
      const result = validateGridSquare('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should reject invalid grid squares', () => {
      const invalidGrids = [
        'FN4',         // Too short
        'FN4200',      // Digits instead of letters in last pair
        'SZ99',        // S and Z are outside A-R range
        'FN4A',        // Mixed invalid format
        '1234',        // All digits
        'ABCD',        // All letters, no digits
        'FN42abc',     // Too many characters (7)
        'FNA2ab',      // Letter in digit position
      ];

      for (const grid of invalidGrids) {
        const result = validateGridSquare(grid);
        expect(result.success, `Expected ${grid} to be invalid`).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INVALID_GRID');
        }
      }
    });

    it('should accept valid edge cases for letters A-R', () => {
      const result = validateGridSquare('AR99');
      expect(result.success).toBe(true);

      const result2 = validateGridSquare('RA99');
      expect(result2.success).toBe(true);
    });
  });

  describe('validateCallsign', () => {
    it('should validate correct callsigns', () => {
      const validCallsigns = ['W1AW', 'K1ABC', 'N2DEF', 'VE7ABC', 'WABC'];

      for (const callsign of validCallsigns) {
        const result = validateCallsign(callsign);
        expect(result.success, `Expected ${callsign} to be valid`).toBe(true);
        if (result.success) {
          expect(result.data).toBe(callsign.toUpperCase());
        }
      }
    });

    it('should normalize to uppercase', () => {
      const result = validateCallsign('w1aw');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('W1AW');
      }
    });

    it('should trim whitespace', () => {
      const result = validateCallsign('  W1AW  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('W1AW');
      }
    });

    it('should reject empty callsign', () => {
      const result = validateCallsign('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should reject callsigns that are too short', () => {
      const result = validateCallsign('AB');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_CALLSIGN');
      }
    });

    it('should reject callsigns that are too long', () => {
      const result = validateCallsign('ABCDEFGH');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_CALLSIGN');
      }
    });

    it('should reject callsigns with invalid characters', () => {
      const result = validateCallsign('W1A-C');
      expect(result.success).toBe(false);
    });
  });

  describe('validateExportPath', () => {
    it('should validate paths within allowed directory', () => {
      const result = validateExportPath('/home/user/exports/file.txt', '/home/user/exports');
      expect(result.success).toBe(true);
    });

    it('should resolve relative paths', () => {
      const result = validateExportPath('file.txt', process.cwd());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain(process.cwd());
      }
    });

    it('should reject empty path', () => {
      const result = validateExportPath('', '/home/user/exports');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT');
      }
    });

    it('should reject path traversal attempts', () => {
      const result = validateExportPath('../etc/passwd', '/home/user/exports');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PATH_TRAVERSAL');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should reject path traversal with double dots in middle', () => {
      const result = validateExportPath('/home/../etc/passwd', '/home/user/exports');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PATH_TRAVERSAL');
      }
    });

    it('should reject path outside allowed directory', () => {
      const result = validateExportPath('/etc/passwd', '/home/user/exports');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PATH_NOT_ALLOWED');
        expect(result.error.suggestions).toBeDefined();
      }
    });
  });

  describe('validateStateCode', () => {
    it('should validate 2-letter state codes', () => {
      const validCodes = ['WA', 'CA', 'NY', 'TX', 'FL', 'WY'];

      for (const code of validCodes) {
        const result = validateStateCode(code);
        expect(result.success, `Expected ${code} to be valid`).toBe(true);
        if (result.success) {
          expect(result.data).toBe(code.toUpperCase());
        }
      }
    });

    it('should normalize to uppercase', () => {
      const result = validateStateCode('wa');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('WA');
      }
    });

    it('should trim whitespace', () => {
      const result = validateStateCode('  WA  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('WA');
      }
    });

    it('should reject codes that are too short', () => {
      const result = validateStateCode('W');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_STATE');
      }
    });

    it('should reject codes that are too long', () => {
      const result = validateStateCode('WASH');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_STATE');
        expect(result.error.suggestions).toBeDefined();
      }
    });
  });

  describe('validateLimit', () => {
    it('should validate positive integers as strings', () => {
      const result = validateLimit('10');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it('should validate positive integers as numbers', () => {
      const result = validateLimit(20);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(20);
      }
    });

    it('should reject zero', () => {
      const result = validateLimit(0);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LIMIT');
      }
    });

    it('should reject negative numbers', () => {
      const result = validateLimit(-5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LIMIT');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should reject non-numeric strings', () => {
      const result = validateLimit('abc');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_LIMIT');
      }
    });

    it('should reject limits over 1000', () => {
      const result = validateLimit(1001);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('LIMIT_TOO_LARGE');
        expect(result.error.suggestions).toBeDefined();
      }
    });

    it('should accept limit of exactly 1000', () => {
      const result = validateLimit(1000);
      expect(result.success).toBe(true);
    });

    it('should accept limit of 1', () => {
      const result = validateLimit(1);
      expect(result.success).toBe(true);
    });
  });
});
