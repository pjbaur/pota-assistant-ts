/**
 * Export service - exports activation plans to various formats.
 *
 * Supports exporting plans to:
 * - Markdown: Human-readable format with tables and checkboxes
 * - Text: Plain text format for simple viewing or printing
 * - JSON: Machine-readable format for integration with other tools
 *
 * @module services/export-service
 */

import type {
  PlanWithPark,
  WeatherForecast,
  BandConditions,
  EquipmentPreset,
} from '../types/index.js';
import { getPresetById } from './equipment-presets.js';
import { format } from 'date-fns';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Options for plan export.
 */
export interface ExportOptions {
  format: 'markdown' | 'text' | 'json';
  outputPath: string;
  callsign?: string;
  gridSquare?: string;
}

/**
 * Exports a plan to the specified format and file path.
 *
 * Creates the output directory if it doesn't exist, then writes
 * the formatted plan content to the specified file.
 *
 * @param plan - The plan with park data to export
 * @param options - Export options including format and output path
 * @returns Object with success status, output path, and optional error message
 *
 * @example
 * ```typescript
 * const result = exportPlan(planWithPark, {
 *   format: 'markdown',
 *   outputPath: './exports/activation-plan.md',
 *   callsign: 'W1AW',
 *   gridSquare: 'FN31pr'
 * });
 *
 * if (result.success) {
 *   console.log(`Exported to: ${result.path}`);
 * } else {
 *   console.error(`Export failed: ${result.error}`);
 * }
 * ```
 */
export function exportPlan(
  plan: PlanWithPark,
  options: ExportOptions
): { success: boolean; path: string; error?: string } {
  const { format: fmt, outputPath, callsign, gridSquare } = options;

  // Ensure output directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let content: string;

  switch (fmt) {
    case 'markdown':
      content = formatMarkdown(plan, callsign, gridSquare);
      break;
    case 'text':
      content = formatText(plan, callsign, gridSquare);
      break;
    case 'json':
      content = formatJson(plan, callsign, gridSquare);
      break;
    default:
      return { success: false, path: outputPath, error: `Unknown format: ${fmt}` };
  }

  try {
    writeFileSync(outputPath, content, 'utf-8');
    return { success: true, path: outputPath };
  } catch (error) {
    return {
      success: false,
      path: outputPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Formats a plan as Markdown.
 *
 * Creates a richly formatted Markdown document including:
 * - Park information with location and grid square
 * - Activation details (date, time, duration)
 * - Weather forecast in a table
 * - Band recommendations in a table
 * - Equipment checklist with checkboxes
 * - Operator notes
 *
 * @param plan - The plan with park data to format
 * @param callsign - Optional operator callsign for footer
 * @param gridSquare - Optional operator grid square for footer
 * @returns Formatted Markdown string
 *
 * @internal
 */
function formatMarkdown(
  plan: PlanWithPark,
  callsign?: string,
  gridSquare?: string
): string {
  const { park } = plan;
  const preset = plan.presetId ? getPresetById(plan.presetId as Parameters<typeof getPresetById>[0]) : null;
  const weather = parseWeather(plan.weatherCache);
  const bands = parseBands(plan.bandsCache);

  const dateStr = format(new Date(plan.plannedDate), 'EEEE, MMMM d, yyyy');

  let md = `# POTA Activation Plan\n\n`;

  // Park information
  md += `## Park Information\n`;
  md += `- **Reference:** ${park.reference}\n`;
  md += `- **Name:** ${park.name}\n`;
  md += `- **Location:** ${park.latitude.toFixed(4)}°N, ${Math.abs(park.longitude).toFixed(4)}°${park.longitude >= 0 ? 'E' : 'W'}\n`;
  if (park.gridSquare) {
    md += `- **Grid Square:** ${park.gridSquare}\n`;
  }
  if (park.state) {
    md += `- **State:** ${park.state}\n`;
  }
  md += `\n`;

  // Activation details
  md += `## Activation Details\n`;
  md += `- **Date:** ${dateStr}\n`;
  if (plan.plannedTime) {
    md += `- **Time:** ${plan.plannedTime}\n`;
  }
  if (plan.durationHours) {
    md += `- **Duration:** ${plan.durationHours} hours\n`;
  }
  md += `- **Status:** ${plan.status}\n`;
  md += `\n`;

  // Weather forecast
  if (weather) {
    md += `## Weather Forecast\n`;
    const forecast = weather.forecasts[0];
    if (forecast) {
      md += `| Metric | Value |\n`;
      md += `|--------|-------|\n`;
      md += `| High | ${forecast.highTemp}°F |\n`;
      md += `| Low | ${forecast.lowTemp}°F |\n`;
      md += `| Conditions | ${forecast.conditions} |\n`;
      md += `| Precipitation | ${forecast.precipitationChance}% chance |\n`;
      md += `| Wind | ${forecast.windSpeed} mph ${forecast.windDirection} |\n`;
      if (forecast.sunrise) md += `| Sunrise | ${forecast.sunrise} |\n`;
      if (forecast.sunset) md += `| Sunset | ${forecast.sunset} |\n`;
      if (weather.staleWarning) {
        md += `\n> ⚠️ ${weather.staleWarning}\n`;
      }
    }
    md += `\n`;
  }

  // Band recommendations
  if (bands && bands.recommendations.length > 0) {
    md += `## Band Recommendations\n`;
    md += `| Time | Band | Mode | Notes |\n`;
    md += `|------|------|------|-------|\n`;
    for (const rec of bands.recommendations) {
      md += `| ${rec.timeSlot} | ${rec.band} | ${rec.mode} | ${rec.notes} |\n`;
    }
    md += `\n> **Note:** ${bands.disclaimer}\n\n`;
  }

  // Equipment checklist
  if (preset) {
    md += `## Equipment Checklist\n`;
    md += `Using preset: **${preset.name}** (${preset.maxPower}W max)\n\n`;

    const itemsByType = groupItemsByType(preset.items);
    for (const [type, items] of Object.entries(itemsByType)) {
      md += `### ${capitalizeType(type)}\n`;
      for (const item of items) {
        md += `- [ ] ${item.name}`;
        if (item.description) md += ` (${item.description})`;
        if (item.quantity && item.quantity > 1) md += ` x${item.quantity}`;
        md += `\n`;
      }
      md += `\n`;
    }
  }

  // Notes
  if (plan.notes) {
    md += `## Notes\n`;
    md += `${plan.notes}\n\n`;
  }

  // Footer
  md += `---\n`;
  md += `*Generated by POTA Activation Planner on ${format(new Date(), 'yyyy-MM-dd')}*\n`;
  if (callsign) md += `*Callsign: ${callsign}`;
  if (gridSquare) md += ` | Grid: ${gridSquare}`;
  if (callsign || gridSquare) md += '*\n';

  return md;
}

/**
 * Formats a plan as plain text.
 *
 * Creates a monospace-formatted plain text document suitable for
 * terminal display or simple text editors. Uses ASCII art headers
 * and simple formatting without Markdown syntax.
 *
 * @param plan - The plan with park data to format
 * @param callsign - Optional operator callsign for footer
 * @param gridSquare - Optional operator grid square for footer
 * @returns Formatted plain text string
 *
 * @internal
 */
function formatText(
  plan: PlanWithPark,
  callsign?: string,
  gridSquare?: string
): string {
  const { park } = plan;
  const preset = plan.presetId ? getPresetById(plan.presetId as Parameters<typeof getPresetById>[0]) : null;
  const weather = parseWeather(plan.weatherCache);
  const bands = parseBands(plan.bandsCache);

  const dateStr = format(new Date(plan.plannedDate), 'EEEE, MMMM d, yyyy');

  let txt = ``;
  txt += `================================================================================\n`;
  txt += `                        POTA ACTIVATION PLAN\n`;
  txt += `================================================================================\n\n`;

  // Park information
  txt += `PARK: ${park.reference} - ${park.name}\n`;
  txt += `      ${park.latitude.toFixed(4)}°N, ${Math.abs(park.longitude).toFixed(4)}°${park.longitude >= 0 ? 'E' : 'W'}`;
  if (park.gridSquare) txt += ` (${park.gridSquare})`;
  txt += `\n`;
  if (park.state) txt += `      ${park.state}\n`;
  txt += `\n`;

  // Activation details
  txt += `DATE: ${dateStr}\n`;
  if (plan.plannedTime) txt += `TIME: ${plan.plannedTime}\n`;
  if (plan.durationHours) txt += `DURATION: ${plan.durationHours} hours\n`;
  txt += `STATUS: ${plan.status}\n\n`;

  // Weather forecast
  if (weather) {
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `WEATHER FORECAST\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    const forecast = weather.forecasts[0];
    if (forecast) {
      txt += `High: ${forecast.highTemp}°F    Low: ${forecast.lowTemp}°F    Conditions: ${forecast.conditions}\n`;
      txt += `Precipitation: ${forecast.precipitationChance}% chance\n`;
      txt += `Wind: ${forecast.windSpeed} mph ${forecast.windDirection}\n`;
      if (forecast.sunrise && forecast.sunset) {
        txt += `Sunrise: ${forecast.sunrise}    Sunset: ${forecast.sunset}\n`;
      }
      if (weather.staleWarning) {
        txt += `\nWARNING: ${weather.staleWarning}\n`;
      }
    }
    txt += `\n`;
  }

  // Band recommendations
  if (bands && bands.recommendations.length > 0) {
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `BAND RECOMMENDATIONS\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    for (const rec of bands.recommendations) {
      txt += `${rec.timeSlot.padEnd(15)}${rec.band.padEnd(8)}${rec.mode.padEnd(8)}${rec.notes}\n`;
    }
    txt += `\nNote: ${bands.disclaimer}\n\n`;
  }

  // Equipment checklist
  if (preset) {
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `EQUIPMENT CHECKLIST\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `Preset: ${preset.name} (${preset.maxPower}W max)\n\n`;
    for (const item of preset.items) {
      txt += `[ ] ${item.name}`;
      if (item.description) txt += ` - ${item.description}`;
      if (item.quantity && item.quantity > 1) txt += ` x${item.quantity}`;
      txt += `\n`;
    }
    txt += `\n`;
  }

  // Notes
  if (plan.notes) {
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `NOTES\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `${plan.notes}\n\n`;
  }

  // Footer
  txt += `================================================================================\n`;
  txt += `Generated: ${format(new Date(), 'yyyy-MM-dd')}`;
  if (callsign) txt += ` | Callsign: ${callsign}`;
  if (gridSquare) txt += ` | Grid: ${gridSquare}`;
  txt += `\n================================================================================\n`;

  return txt;
}

/**
 * Formats a plan as JSON.
 *
 * Creates a structured JSON object suitable for programmatic use
 * or integration with other tools. Includes all plan data in a
 * clean, typed structure.
 *
 * @param plan - The plan with park data to format
 * @param callsign - Optional operator callsign
 * @param gridSquare - Optional operator grid square
 * @returns Formatted JSON string (pretty-printed)
 *
 * @internal
 */
function formatJson(
  plan: PlanWithPark,
  callsign?: string,
  gridSquare?: string
): string {
  const { park } = plan;
  const preset = plan.presetId ? getPresetById(plan.presetId as Parameters<typeof getPresetById>[0]) : null;
  const weather = parseWeather(plan.weatherCache);
  const bands = parseBands(plan.bandsCache);

  const obj = {
    plan: {
      id: plan.id,
      createdAt: plan.createdAt,
      status: plan.status,
    },
    park: {
      reference: park.reference,
      name: park.name,
      latitude: park.latitude,
      longitude: park.longitude,
      gridSquare: park.gridSquare,
      state: park.state,
    },
    activation: {
      date: plan.plannedDate,
      time: plan.plannedTime,
      duration: plan.durationHours,
    },
    weather: weather?.forecasts[0] ?? null,
    bands: bands?.recommendations ?? [],
    equipment: preset
      ? {
          preset: preset.id,
          name: preset.name,
          items: preset.items,
        }
      : null,
    notes: plan.notes,
    operator: {
      callsign: callsign ?? null,
      gridSquare: gridSquare ?? null,
    },
  };

  return JSON.stringify(obj, null, 2);
}

/**
 * Parses cached weather data from JSON string.
 *
 * @param cache - JSON string of weather data or null
 * @returns Parsed WeatherForecast object or null if parsing fails
 *
 * @internal
 */
function parseWeather(cache: string | null): WeatherForecast | null {
  if (!cache) return null;
  try {
    return JSON.parse(cache) as WeatherForecast;
  } catch {
    return null;
  }
}

/**
 * Parses cached band conditions from JSON string.
 *
 * @param cache - JSON string of band data or null
 * @returns Parsed BandConditions object or null if parsing fails
 *
 * @internal
 */
function parseBands(cache: string | null): BandConditions | null {
  if (!cache) return null;
  try {
    return JSON.parse(cache) as BandConditions;
  } catch {
    return null;
  }
}

/**
 * Groups equipment items by their type.
 *
 * @param items - Array of equipment items
 * @returns Record mapping type names to arrays of items
 *
 * @internal
 */
function groupItemsByType(
  items: EquipmentPreset['items']
): Record<string, EquipmentPreset['items']> {
  const grouped: Record<string, EquipmentPreset['items']> = {};
  for (const item of items) {
    if (!grouped[item.type]) {
      grouped[item.type] = [];
    }
    grouped[item.type].push(item);
  }
  return grouped;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param type - String to capitalize
 * @returns String with first letter uppercase
 *
 * @internal
 */
function capitalizeType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
