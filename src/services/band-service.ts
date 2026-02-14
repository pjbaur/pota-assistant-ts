/**
 * Band service - provides HF band condition recommendations.
 *
 * This service provides band recommendations based on:
 * - Time of day (grayline, peak propagation, etc.)
 * - Season (summer/winter/equnox adjustments)
 * - General HF propagation principles
 *
 * Note: These are general guidelines based on typical ionospheric
 * conditions. Actual conditions vary based on solar activity,
 * geomagnetic conditions, and local factors.
 *
 * @module services/band-service
 */

import type {
  BandConditions,
  BandRecommendation,
  BandRating,
  SeasonalAdjustment,
  TimeOfDay,
} from '../types/index.js';

/**
 * Disclaimer displayed with band recommendations.
 *
 * Warns users that these are general guidelines and actual
 * conditions may vary significantly.
 */
const DISCLAIMER =
  'Band conditions vary based on solar activity, ionospheric conditions, and local noise. These are general guidelines based on time of day and season.';

/**
 * Configuration for a single band recommendation.
 *
 * @internal
 */
interface BandConfig {
  band: string;
  mode: string;
  rating: BandRating;
  notes: string;
}

/**
 * Configuration for a time slot with its recommended bands.
 *
 * @internal
 */
interface TimeSlotConfig {
  name: string;
  bands: BandConfig[];
  defaultNote: string;
}

/**
 * Band recommendations by time of day.
 *
 * Maps each time period to its recommended bands based on
 * typical HF propagation patterns:
 * - Morning: 40m/20m excellent for regional and DX
 * - Midday: 20m/17m/15m for peak propagation
 * - Evening: 20m/40m for grayline DX
 * - Night: 80m/40m/160m for regional/local
 */
const TIME_SLOT_CONFIGS: Record<TimeOfDay, TimeSlotConfig> = {
  morning: {
    name: 'Morning (6-10am)',
    bands: [
      { band: '40m', mode: 'SSB/CW', rating: 'excellent', notes: '' },
      { band: '20m', mode: 'SSB/CW', rating: 'good', notes: '' },
    ],
    defaultNote: 'Grayline DX possible',
  },
  midday: {
    name: 'Midday (10am-4pm)',
    bands: [
      { band: '20m', mode: 'SSB/CW', rating: 'excellent', notes: '' },
      { band: '17m', mode: 'SSB/CW', rating: 'good', notes: '' },
      { band: '15m', mode: 'SSB/CW', rating: 'fair', notes: '' },
    ],
    defaultNote: 'Peak propagation',
  },
  evening: {
    name: 'Evening (4-8pm)',
    bands: [
      { band: '20m', mode: 'SSB/CW', rating: 'good', notes: '' },
      { band: '40m', mode: 'SSB/CW', rating: 'good', notes: '' },
      { band: '15m', mode: 'SSB/CW', rating: 'fair', notes: '' },
    ],
    defaultNote: 'Grayline DX',
  },
  night: {
    name: 'Night (8pm-6am)',
    bands: [
      { band: '80m', mode: 'SSB/CW', rating: 'good', notes: '' },
      { band: '40m', mode: 'SSB/CW', rating: 'fair', notes: '' },
      { band: '160m', mode: 'SSB/CW', rating: 'fair', notes: '' },
    ],
    defaultNote: 'Regional/local',
  },
};

/**
 * Determines the time of day category based on the hour.
 *
 * Maps 24-hour time to four time periods:
 * - Morning: 6-10 (06:00-09:59)
 * - Midday: 10-16 (10:00-15:59)
 * - Evening: 16-20 (16:00-19:59)
 * - Night: 20-6 (20:00-05:59)
 *
 * @param hour - Hour of the day in 24-hour format (0-23)
 * @returns TimeOfDay category
 *
 * @example
 * ```typescript
 * const timeOfDay = getTimeOfDay(14); // Returns 'midday'
 * const timeOfDay2 = getTimeOfDay(21); // Returns 'night'
 * ```
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 10) {
    return 'morning';
  }
  if (hour >= 10 && hour < 16) {
    return 'midday';
  }
  if (hour >= 16 && hour < 20) {
    return 'evening';
  }
  return 'night';
}

/**
 * Returns seasonal adjustments for band recommendations.
 *
 * Applies seasonal propagation adjustments:
 * - Summer (May-Aug): Boosts 15m/17m for better higher-band propagation
 * - Winter (Nov-Feb): Boosts 80m/160m for better low-band conditions
 * - Equinox (Mar-Apr, Sep-Oct): Boosts all bands for best overall conditions
 *
 * @param month - Month number (1-12)
 * @returns SeasonalAdjustment specifying which bands to boost
 *
 * @example
 * ```typescript
 * const adjustment = getSeasonalAdjustment(7); // July - summer
 * // Returns { bands: ['15m', '17m'], boost: true }
 * ```
 */
export function getSeasonalAdjustment(month: number): SeasonalAdjustment {
  // Summer: May-August (months 5-8)
  if (month >= 5 && month <= 8) {
    return {
      bands: ['15m', '17m'],
      boost: true,
    };
  }

  // Winter: November-February (months 11-12, 1-2)
  if (month >= 11 || month <= 2) {
    return {
      bands: ['80m', '160m'],
      boost: true,
    };
  }

  // Equinox: March-April (months 3-4) and September-October (months 9-10)
  // Best overall conditions - all bands get a boost
  return {
    bands: ['all'],
    boost: true,
  };
}

/**
 * Applies seasonal adjustments to a band's rating.
 *
 * Upgrades the rating by one level if the band is affected by
 * the current seasonal adjustment (e.g., 'good' becomes 'excellent').
 *
 * @param rating - Original rating
 * @param band - Band name (e.g., '40m', '20m')
 * @param adjustment - Seasonal adjustment configuration
 * @returns Adjusted rating (upgraded by one if applicable)
 *
 * @internal
 */
function applySeasonalRating(
  rating: BandRating,
  band: string,
  adjustment: SeasonalAdjustment
): BandRating {
  if (!adjustment.boost) {
    return rating;
  }

  const ratingOrder: BandRating[] = ['poor', 'fair', 'good', 'excellent'];

  // Check if this band should be adjusted
  const shouldAdjust =
    adjustment.bands.includes('all') || adjustment.bands.includes(band);

  if (!shouldAdjust) {
    return rating;
  }

  const currentIndex = ratingOrder.indexOf(rating);
  if (currentIndex < ratingOrder.length - 1) {
    return ratingOrder[currentIndex + 1];
  }

  return rating;
}

/**
 * Gets band recommendations for a specific date and optional hours.
 *
 * Generates band recommendations by combining:
 * - Time-of-day based recommendations
 * - Seasonal adjustments
 * - Configuration-based ratings
 *
 * @param date - The date to get recommendations for
 * @param hours - Optional array of hours (0-23) to get recommendations for.
 *                Defaults to representative hours for each time slot: [7, 12, 17, 22]
 * @returns Array of BandRecommendations for the specified hours
 *
 * @example
 * ```typescript
 * const recommendations = getRecommendations(new Date(), [9, 14, 19]);
 * recommendations.forEach(rec => {
 *   console.log(`${rec.timeSlot}: ${rec.band} - ${rec.rating}`);
 * });
 * ```
 */
export function getRecommendations(
  date: Date,
  hours?: number[]
): BandRecommendation[] {
  const recommendations: BandRecommendation[] = [];
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const seasonalAdjustment = getSeasonalAdjustment(month);

  // Default to one hour from each time slot if no hours provided
  const hoursToProcess =
    hours ?? [7, 12, 17, 22]; // morning, midday, evening, night representatives

  for (const hour of hoursToProcess) {
    const timeOfDay = getTimeOfDay(hour);
    const config = TIME_SLOT_CONFIGS[timeOfDay];

    for (const bandConfig of config.bands) {
      const adjustedRating = applySeasonalRating(
        bandConfig.rating,
        bandConfig.band,
        seasonalAdjustment
      );

      recommendations.push({
        timeSlot: config.name,
        band: bandConfig.band,
        mode: bandConfig.mode,
        rating: adjustedRating,
        notes: bandConfig.notes || config.defaultNote,
      });
    }
  }

  return recommendations;
}

/**
 * Gets full band conditions for a specific date.
 *
 * Returns a complete BandConditions object including:
 * - Recommendations for all four time slots
 * - Date-specific seasonal adjustments
 * - Disclaimer about propagation variability
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns BandConditions object with all recommendations and disclaimer
 *
 * @example
 * ```typescript
 * const conditions = getBandConditions('2024-07-15');
 * console.log(`Date: ${conditions.date}`);
 * console.log(conditions.disclaimer);
 * conditions.recommendations.forEach(rec => {
 *   console.log(`${rec.timeSlot}: ${rec.band} (${rec.rating})`);
 * });
 * ```
 */
export function getBandConditions(dateString: string): BandConditions {
  const date = new Date(dateString + 'T12:00:00Z'); // Add time to avoid timezone issues

  // Get recommendations for all four time slots
  const hours = [7, 12, 17, 22]; // Representative hours for each time slot
  const recommendations = getRecommendations(date, hours);

  return {
    date: dateString,
    recommendations,
    disclaimer: DISCLAIMER,
  };
}
