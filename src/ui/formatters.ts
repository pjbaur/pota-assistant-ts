/**
 * Output formatters for domain objects
 * Optimized for 80x24 terminals
 */

import type { Park, PlanWithPark, WeatherForecast, BandConditions, BandRecommendation } from '../types/index.js';
import { success, warning, info, highlight, muted, bold } from './colors.js';
import { formatTable, type ColumnDef } from './table.js';

const TERMINAL_WIDTH = 80;

/**
 * Truncate string to max length with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Format a horizontal divider line
 */
function divider(char = '─', width = TERMINAL_WIDTH): string {
  return char.repeat(width);
}

/**
 * Format a weather icon based on conditions
 */
function weatherIcon(conditions: string): string {
  const lower = conditions.toLowerCase();
  if (lower.includes('sun') || lower.includes('clear')) return '\u2600'; // sun
  if (lower.includes('cloud')) return '\u2601'; // cloud
  if (lower.includes('rain') || lower.includes('shower')) return '\u2614'; // umbrella
  if (lower.includes('snow')) return '\u2744'; // snowflake
  if (lower.includes('storm') || lower.includes('thunder')) return '\u26A1'; // lightning
  if (lower.includes('fog') || lower.includes('mist')) return '\u2601'; // cloud
  return '\u2600'; // default sun
}

/**
 * Format a rating with visual indicator
 */
function formatRating(rating: BandRecommendation['rating']): string {
  switch (rating) {
    case 'excellent':
      return '\u2605\u2605\u2605\u2605\u2605'; // 5 stars
    case 'good':
      return '\u2605\u2605\u2605\u2605\u2606'; // 4 stars
    case 'fair':
      return '\u2605\u2605\u2605\u2606\u2606'; // 3 stars
    case 'poor':
      return '\u2605\u2605\u2606\u2606\u2606'; // 2 stars
  }
}

/**
 * Format a single park as a detail card
 */
export function formatParkCard(
  park: Park,
  options: { showWeather?: boolean } = {}
): string {
  const lines: string[] = [];
  const cardWidth = TERMINAL_WIDTH - 4;

  lines.push('');
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push(bold('  PARK DETAILS'));
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push('');

  // Reference and name
  lines.push(`  ${highlight('Reference:')} ${park.reference}`);
  lines.push(`  ${highlight('Name:')}     ${truncate(park.name, cardWidth - 12)}`);
  lines.push('');

  // Location info
  lines.push(`  ${highlight('Location:')}  ${park.state ?? 'N/A'}, ${park.country ?? 'N/A'}`);
  lines.push(`  ${highlight('Coords:')}    ${park.latitude.toFixed(4)}, ${park.longitude.toFixed(4)}`);
  lines.push(`  ${highlight('Grid:')}      ${park.gridSquare ?? 'Unknown'}`);
  lines.push('');

  // Park details
  lines.push(`  ${highlight('Type:')}      ${park.parkType ?? 'Unknown'}`);
  lines.push(`  ${highlight('Region:')}    ${park.region ?? 'Unknown'}`);
  lines.push(`  ${highlight('Status:')}    ${park.isActive ? success('Active') : warning('Inactive')}`);
  lines.push('');

  // URL
  if (park.potaUrl) {
    lines.push(`  ${highlight('URL:')}       ${truncate(park.potaUrl, cardWidth - 12)}`);
    lines.push('');
  }

  // Sync info
  lines.push(`  ${muted('Last synced: ' + new Date(park.syncedAt).toLocaleDateString())}`);
  lines.push('');

  lines.push(bold('  ' + divider('\u2500', cardWidth)));

  return lines.join('\n');
}

/**
 * Format a plan with park info as a detail card
 */
export function formatPlanCard(plan: PlanWithPark): string {
  const lines: string[] = [];
  const cardWidth = TERMINAL_WIDTH - 4;

  const statusColors: Record<string, (s: string) => string> = {
    draft: muted,
    finalized: info,
    completed: success,
    cancelled: warning,
  };

  const statusColor = statusColors[plan.status] ?? muted;

  lines.push('');
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push(bold('  ACTIVATION PLAN'));
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push('');

  // Park info
  lines.push(`  ${highlight('Park:')}       ${plan.park.reference} - ${truncate(plan.park.name, cardWidth - 20)}`);
  lines.push(`  ${highlight('Location:')}   ${plan.park.state ?? 'N/A'}, ${plan.park.country ?? 'N/A'}`);
  lines.push('');

  // Plan details
  lines.push(`  ${highlight('Date:')}       ${plan.plannedDate}`);
  if (plan.plannedTime) {
    lines.push(`  ${highlight('Time:')}       ${plan.plannedTime}`);
  }
  if (plan.durationHours) {
    lines.push(`  ${highlight('Duration:')}   ${plan.durationHours} hours`);
  }
  lines.push(`  ${highlight('Status:')}     ${statusColor(plan.status)}`);
  lines.push('');

  // Preset and notes
  if (plan.presetId) {
    lines.push(`  ${highlight('Preset:')}     ${plan.presetId}`);
  }
  if (plan.notes) {
    lines.push(`  ${highlight('Notes:')}      ${truncate(plan.notes, cardWidth - 12)}`);
  }
  lines.push('');

  // Timestamps
  lines.push(`  ${muted('Created: ' + new Date(plan.createdAt).toLocaleDateString())}`);
  lines.push(`  ${muted('Updated: ' + new Date(plan.updatedAt).toLocaleDateString())}`);
  lines.push('');

  lines.push(bold('  ' + divider('\u2500', cardWidth)));

  return lines.join('\n');
}

/**
 * Format weather forecast for display
 */
export function formatWeather(weather: WeatherForecast): string {
  const lines: string[] = [];
  const cardWidth = TERMINAL_WIDTH - 4;

  lines.push('');
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push(bold('  WEATHER FORECAST'));
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push('');

  // Location and fetch time
  lines.push(`  ${highlight('Location:')} ${weather.location.lat.toFixed(4)}, ${weather.location.lon.toFixed(4)}`);
  lines.push(`  ${muted('Fetched: ' + new Date(weather.fetchedAt).toLocaleString())}`);
  lines.push('');

  if (weather.staleWarning) {
    lines.push(`  ${warning('\u26A0 ' + weather.staleWarning)}`);
    lines.push('');
  }

  // Daily forecasts
  for (const day of weather.forecasts) {
    const icon = weatherIcon(day.conditions);
    lines.push(`  ${bold(day.date)}`);
    lines.push(`    ${icon} ${day.conditions}`);
    lines.push(`    High: ${day.highTemp}°F / Low: ${day.lowTemp}°F`);
    lines.push(`    Wind: ${day.windSpeed} mph ${day.windDirection}`);
    lines.push(`    Precip: ${day.precipitationChance}%`);

    if (day.sunrise && day.sunset) {
      lines.push(`    Sun: ${day.sunrise} - ${day.sunset}`);
    }
    lines.push('');
  }

  lines.push(bold('  ' + divider('\u2500', cardWidth)));

  return lines.join('\n');
}

/**
 * Format band conditions and recommendations
 */
export function formatBandConditions(conditions: BandConditions): string {
  const lines: string[] = [];
  const cardWidth = TERMINAL_WIDTH - 4;

  lines.push('');
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push(bold('  BAND CONDITIONS'));
  lines.push(bold('  ' + divider('\u2500', cardWidth)));
  lines.push('');

  lines.push(`  ${highlight('Date:')} ${conditions.date}`);
  lines.push('');

  // Table for recommendations
  if (conditions.recommendations.length > 0) {
    const tableData = conditions.recommendations.map((rec) => ({
      time: rec.timeSlot,
      band: rec.band,
      mode: rec.mode,
      rating: formatRating(rec.rating),
      notes: truncate(rec.notes, 20),
    }));

    const columns: ColumnDef[] = [
      { key: 'time', header: 'Time', width: 12 },
      { key: 'band', header: 'Band', width: 8 },
      { key: 'mode', header: 'Mode', width: 6 },
      { key: 'rating', header: 'Rating', width: 14 },
      { key: 'notes', header: 'Notes' },
    ];

    lines.push(formatTable(tableData, columns, { maxWidth: cardWidth + 2 }));
    lines.push('');
  }

  // Disclaimer
  if (conditions.disclaimer) {
    lines.push(`  ${muted('\u2139 ' + conditions.disclaimer)}`);
    lines.push('');
  }

  lines.push(bold('  ' + divider('\u2500', cardWidth)));

  return lines.join('\n');
}

/**
 * Format a compact list of parks for search results
 */
export function formatParkList(parks: Park[]): string {
  if (parks.length === 0) {
    return muted('No parks found');
  }

  const tableData = parks.map((park) => ({
    ref: park.reference,
    name: truncate(park.name, 35),
    location: truncate(`${park.state ?? ''}, ${park.country ?? ''}`.trim(), 18),
    status: park.isActive ? 'Active' : 'Inactive',
  }));

  const columns: ColumnDef[] = [
    { key: 'ref', header: 'Reference', width: 8 },
    { key: 'name', header: 'Name', width: 37 },
    { key: 'location', header: 'Location', width: 20 },
    { key: 'status', header: 'Status', width: 8, align: 'center' },
  ];

  return formatTable(tableData, columns);
}

/**
 * Format a compact list of plans
 */
export function formatPlanList(plans: PlanWithPark[]): string {
  if (plans.length === 0) {
    return muted('No plans found');
  }

  const tableData = plans.map((plan) => ({
    id: String(plan.id),
    park: plan.park.reference,
    date: plan.plannedDate,
    time: plan.plannedTime ?? '-',
    status: plan.status,
  }));

  const columns: ColumnDef[] = [
    { key: 'id', header: 'ID', width: 5, align: 'right' },
    { key: 'park', header: 'Park', width: 10 },
    { key: 'date', header: 'Date', width: 12 },
    { key: 'time', header: 'Time', width: 8, align: 'center' },
    { key: 'status', header: 'Status', width: 12 },
  ];

  return formatTable(tableData, columns);
}
