import type {
  BandConditions,
  BandRecommendation,
  BandRating,
  SeasonalAdjustment,
  TimeOfDay,
} from '../types/index.js';

const DISCLAIMER =
  'Band conditions vary based on solar activity, ionospheric conditions, and local noise. These are general guidelines based on time of day and season.';

interface BandConfig {
  band: string;
  mode: string;
  rating: BandRating;
  notes: string;
}

interface TimeSlotConfig {
  name: string;
  bands: BandConfig[];
  defaultNote: string;
}

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
 * Determines the time of day based on the hour (0-23).
 * @param hour - Hour of the day in 24-hour format
 * @returns TimeOfDay category
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
 * Returns seasonal adjustments for band recommendations based on the month.
 * @param month - Month number (1-12)
 * @returns SeasonalAdjustment with bands to adjust and whether to boost or not
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
 * @param rating - Original rating
 * @param band - Band name
 * @param adjustment - Seasonal adjustment configuration
 * @returns Adjusted rating
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
 * @param date - The date to get recommendations for
 * @param hours - Optional array of hours to get recommendations for (defaults to all time slots)
 * @returns Array of BandRecommendations
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
 * Gets full band conditions for a specific date including all recommendations and disclaimer.
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns BandConditions object with all recommendations and disclaimer
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
