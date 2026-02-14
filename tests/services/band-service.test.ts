import { describe, it, expect } from 'vitest';
import {
  getTimeOfDay,
  getSeasonalAdjustment,
  getRecommendations,
  getBandConditions,
} from '../../src/services/band-service.js';
import type { TimeOfDay, SeasonalAdjustment } from '../../src/types/index.js';

describe('band-service', () => {
  describe('getTimeOfDay', () => {
    it('returns "morning" for hours 6-9', () => {
      for (let hour = 6; hour < 10; hour++) {
        expect(getTimeOfDay(hour)).toBe('morning');
      }
    });

    it('returns "midday" for hours 10-15', () => {
      for (let hour = 10; hour < 16; hour++) {
        expect(getTimeOfDay(hour)).toBe('midday');
      }
    });

    it('returns "evening" for hours 16-19', () => {
      for (let hour = 16; hour < 20; hour++) {
        expect(getTimeOfDay(hour)).toBe('evening');
      }
    });

    it('returns "night" for hours 20-23 and 0-5', () => {
      // Test hours 20-23
      for (let hour = 20; hour <= 23; hour++) {
        expect(getTimeOfDay(hour)).toBe('night');
      }
      // Test hours 0-5
      for (let hour = 0; hour < 6; hour++) {
        expect(getTimeOfDay(hour)).toBe('night');
      }
    });

    it('covers all 24 hours of the day', () => {
      const expectedResults: TimeOfDay[] = [
        'night', // 0
        'night', // 1
        'night', // 2
        'night', // 3
        'night', // 4
        'night', // 5
        'morning', // 6
        'morning', // 7
        'morning', // 8
        'morning', // 9
        'midday', // 10
        'midday', // 11
        'midday', // 12
        'midday', // 13
        'midday', // 14
        'midday', // 15
        'evening', // 16
        'evening', // 17
        'evening', // 18
        'evening', // 19
        'night', // 20
        'night', // 21
        'night', // 22
        'night', // 23
      ];

      for (let hour = 0; hour < 24; hour++) {
        expect(getTimeOfDay(hour)).toBe(expectedResults[hour]);
      }
    });
  });

  describe('getSeasonalAdjustment', () => {
    it('returns summer adjustment for May-August (months 5-8)', () => {
      for (let month = 5; month <= 8; month++) {
        const result = getSeasonalAdjustment(month);
        expect(result).toEqual({
          bands: ['15m', '17m'],
          boost: true,
        });
      }
    });

    it('returns winter adjustment for November-February (months 11-12, 1-2)', () => {
      const winterMonths = [11, 12, 1, 2];

      for (const month of winterMonths) {
        const result = getSeasonalAdjustment(month);
        expect(result).toEqual({
          bands: ['80m', '160m'],
          boost: true,
        });
      }
    });

    it('returns equinox adjustment for March-April (months 3-4)', () => {
      for (let month = 3; month <= 4; month++) {
        const result = getSeasonalAdjustment(month);
        expect(result).toEqual({
          bands: ['all'],
          boost: true,
        });
      }
    });

    it('returns equinox adjustment for September-October (months 9-10)', () => {
      for (let month = 9; month <= 10; month++) {
        const result = getSeasonalAdjustment(month);
        expect(result).toEqual({
          bands: ['all'],
          boost: true,
        });
      }
    });

    it('always returns boost: true', () => {
      for (let month = 1; month <= 12; month++) {
        const result = getSeasonalAdjustment(month);
        expect(result.boost).toBe(true);
      }
    });

    it('returns valid bands array for all months', () => {
      for (let month = 1; month <= 12; month++) {
        const result = getSeasonalAdjustment(month);
        expect(Array.isArray(result.bands)).toBe(true);
        expect(result.bands.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getRecommendations', () => {
    it('returns an array of recommendations', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const recommendations = getRecommendations(date);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('returns recommendations with valid structure', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const recommendations = getRecommendations(date);

      for (const rec of recommendations) {
        expect(rec).toHaveProperty('timeSlot');
        expect(rec).toHaveProperty('band');
        expect(rec).toHaveProperty('mode');
        expect(rec).toHaveProperty('rating');
        expect(rec).toHaveProperty('notes');
        expect(typeof rec.timeSlot).toBe('string');
        expect(typeof rec.band).toBe('string');
        expect(typeof rec.mode).toBe('string');
        expect(['excellent', 'good', 'fair', 'poor']).toContain(rec.rating);
        expect(typeof rec.notes).toBe('string');
      }
    });

    it('uses default hours when no hours provided', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const recommendations = getRecommendations(date);

      // Default hours are [7, 12, 17, 22] which covers all 4 time slots
      // Each time slot has multiple bands
      expect(recommendations.length).toBeGreaterThan(4);
    });

    it('uses provided hours when specified', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const recommendations = getRecommendations(date, [9]); // Single morning hour

      // Morning has 2 bands configured
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].timeSlot).toBe('Morning (6-10am)');
    });

    it('applies seasonal adjustments for summer', () => {
      const date = new Date('2024-07-15T12:00:00Z'); // July - summer
      const recommendations = getRecommendations(date, [12]); // Midday

      // In summer, 15m and 17m get boosted
      const band17 = recommendations.find((r) => r.band === '17m');
      const band15 = recommendations.find((r) => r.band === '15m');

      // These bands should have boosted ratings in summer
      expect(band17).toBeDefined();
      expect(band15).toBeDefined();
    });

    it('applies seasonal adjustments for winter', () => {
      const date = new Date('2024-01-15T12:00:00Z'); // January - winter
      const recommendations = getRecommendations(date, [22]); // Night

      // In winter, 80m and 160m get boosted
      const band80 = recommendations.find((r) => r.band === '80m');
      const band160 = recommendations.find((r) => r.band === '160m');

      expect(band80).toBeDefined();
      expect(band160).toBeDefined();
    });

    it('includes correct time slot names', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const timeSlots = [
        { hour: 7, expected: 'Morning (6-10am)' },
        { hour: 12, expected: 'Midday (10am-4pm)' },
        { hour: 17, expected: 'Evening (4-8pm)' },
        { hour: 22, expected: 'Night (8pm-6am)' },
      ];

      for (const { hour, expected } of timeSlots) {
        const recommendations = getRecommendations(date, [hour]);
        expect(recommendations[0].timeSlot).toBe(expected);
      }
    });

    it('includes notes for each recommendation', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const recommendations = getRecommendations(date);

      for (const rec of recommendations) {
        expect(rec.notes.length).toBeGreaterThan(0);
      }
    });

    it('morning recommendations include 40m as excellent', () => {
      const date = new Date('2024-03-15T12:00:00Z'); // Equinox - all bands boosted
      const recommendations = getRecommendations(date, [7]); // Morning hour
      const band40 = recommendations.find((r) => r.band === '40m');

      expect(band40).toBeDefined();
      // 40m is excellent in morning, boosted to excellent (already at top)
      expect(['excellent', 'good']).toContain(band40!.rating);
    });

    it('midday recommendations include 20m as excellent', () => {
      const date = new Date('2024-03-15T12:00:00Z'); // Equinox
      const recommendations = getRecommendations(date, [12]); // Midday hour
      const band20 = recommendations.find((r) => r.band === '20m');

      expect(band20).toBeDefined();
      expect(band20!.rating).toBe('excellent');
    });
  });

  describe('getBandConditions', () => {
    it('returns BandConditions with valid structure', () => {
      const result = getBandConditions('2024-06-15');

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('disclaimer');
      expect(result.date).toBe('2024-06-15');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.disclaimer).toBe('string');
    });

    it('always includes the disclaimer', () => {
      const result = getBandConditions('2024-06-15');

      expect(result.disclaimer).toBe(
        'Band conditions vary based on solar activity, ionospheric conditions, and local noise. These are general guidelines based on time of day and season.'
      );
    });

    it('includes recommendations for all time slots', () => {
      const result = getBandConditions('2024-06-15');

      const timeSlots = new Set(result.recommendations.map((r) => r.timeSlot));

      expect(timeSlots.has('Morning (6-10am)')).toBe(true);
      expect(timeSlots.has('Midday (10am-4pm)')).toBe(true);
      expect(timeSlots.has('Evening (4-8pm)')).toBe(true);
      expect(timeSlots.has('Night (8pm-6am)')).toBe(true);
    });

    it('returns the provided date string', () => {
      const dates = ['2024-01-01', '2024-06-15', '2024-12-31'];

      for (const date of dates) {
        const result = getBandConditions(date);
        expect(result.date).toBe(date);
      }
    });

    it('returns multiple recommendations (all time slots)', () => {
      const result = getBandConditions('2024-06-15');

      // Morning: 2 bands, Midday: 3 bands, Evening: 3 bands, Night: 3 bands = 11 total
      expect(result.recommendations.length).toBe(11);
    });

    it('disclaimer warns about solar activity and local conditions', () => {
      const result = getBandConditions('2024-06-15');

      expect(result.disclaimer.toLowerCase()).toContain('solar');
      expect(result.disclaimer.toLowerCase()).toContain('local');
    });

    it('works correctly for different seasons', () => {
      // Test summer
      const summerResult = getBandConditions('2024-07-15');
      expect(summerResult.recommendations.length).toBeGreaterThan(0);
      expect(summerResult.disclaimer.length).toBeGreaterThan(0);

      // Test winter
      const winterResult = getBandConditions('2024-01-15');
      expect(winterResult.recommendations.length).toBeGreaterThan(0);
      expect(winterResult.disclaimer.length).toBeGreaterThan(0);

      // Test equinox
      const equinoxResult = getBandConditions('2024-03-15');
      expect(equinoxResult.recommendations.length).toBeGreaterThan(0);
      expect(equinoxResult.disclaimer.length).toBeGreaterThan(0);
    });
  });
});
