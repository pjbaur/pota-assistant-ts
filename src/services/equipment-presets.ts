/**
 * Equipment presets for POTA activations.
 *
 * Provides predefined equipment configurations for different
 * activation styles:
 * - QRP Portable: Low-power hiking/portable operation
 * - Standard Portable: Medium-power field operation
 * - Mobile/High Power: Vehicle-based or high-power operation
 *
 * @module services/equipment-presets
 */

import type { EquipmentPreset, PresetId, EquipmentItem } from '../types/index.js';

/**
 * Built-in equipment presets indexed by preset ID.
 *
 * Each preset includes:
 * - Descriptive name and description
 * - Maximum power output
 * - Complete equipment checklist organized by type
 */
export const EQUIPMENT_PRESETS: Record<PresetId, EquipmentPreset> = {
  'qrp-portable': {
    id: 'qrp-portable',
    name: 'QRP Portable',
    description: 'Low-power portable operation (5W or less)',
    maxPower: 5,
    items: [
      { type: 'radio', name: 'QRP Transceiver', description: '5W max output (e.g., IC-705, KX2, KX3, Xiegu G90)', quantity: 1 },
      { type: 'antenna', name: 'Wire Antenna', description: 'EFHW, dipole, or end-fed random wire', quantity: 1 },
      { type: 'antenna', name: 'Support', description: 'Telescopic pole or tree support', quantity: 1 },
      { type: 'antenna', name: 'Counterpoise Wire', description: 'If needed for antenna type', quantity: 1 },
      { type: 'power', name: 'LiFePO4 Battery', description: '6-9Ah capacity', quantity: 1 },
      { type: 'accessory', name: 'Logging Notebook', quantity: 1 },
      { type: 'accessory', name: 'Pen', quantity: 2 },
      { type: 'accessory', name: 'Headphones', quantity: 1 },
      { type: 'accessory', name: 'Key/Paddle', description: 'For CW operation', quantity: 1 },
    ],
  },
  'standard-portable': {
    id: 'standard-portable',
    name: 'Standard Portable',
    description: 'Medium-power portable operation (20-30W)',
    maxPower: 30,
    items: [
      { type: 'radio', name: 'Portable Transceiver', description: '20-30W output (e.g., IC-7100, FT-891)', quantity: 1 },
      { type: 'antenna', name: 'EFHW Antenna', description: '40/20/15/10m bands', quantity: 1 },
      { type: 'antenna', name: 'Counterpoise Wire', description: '1-2 radial wires', quantity: 2 },
      { type: 'antenna', name: 'Support Pole', description: '10m telescopic pole', quantity: 1 },
      { type: 'power', name: 'LiFePO4 Battery', description: '15-20Ah capacity', quantity: 1 },
      { type: 'accessory', name: 'Logging Notebook', quantity: 1 },
      { type: 'accessory', name: 'Pen', quantity: 2 },
      { type: 'accessory', name: 'Headphones', quantity: 1 },
      { type: 'accessory', name: 'CW Key/Paddle', quantity: 1 },
      { type: 'accessory', name: 'Folding Chair', quantity: 1 },
      { type: 'accessory', name: 'Folding Table', description: 'Optional', quantity: 1 },
    ],
  },
  'mobile-high-power': {
    id: 'mobile-high-power',
    name: 'Mobile / High Power',
    description: 'High-power mobile or base operation (50W+)',
    maxPower: 100,
    items: [
      { type: 'radio', name: 'Mobile Transceiver', description: '50-100W output (e.g., IC-7100, FT-857D, TM-D710)', quantity: 1 },
      { type: 'antenna', name: 'Mobile Antenna', description: 'VHF/UHF dual-band or HF screwdriver', quantity: 1 },
      { type: 'antenna', name: 'Antenna Mount', description: 'Mag mount, lip mount, or permanent', quantity: 1 },
      { type: 'power', name: 'Vehicle Battery', description: 'Connected to vehicle electrical system', quantity: 1 },
      { type: 'accessory', name: 'Logging Device', description: 'Tablet, laptop, or notebook', quantity: 1 },
      { type: 'accessory', name: 'Headphones', quantity: 1 },
      { type: 'accessory', name: 'CW Key/Paddle', description: 'If operating CW', quantity: 1 },
      { type: 'accessory', name: 'External Speaker', description: 'Optional for better audio', quantity: 1 },
    ],
  },
};

/**
 * Gets all available equipment presets.
 *
 * @returns Array of all EquipmentPreset objects
 *
 * @example
 * ```typescript
 * const presets = getAllPresets();
 * presets.forEach(preset => {
 *   console.log(`${preset.name}: ${preset.description}`);
 * });
 * ```
 */
export function getAllPresets(): EquipmentPreset[] {
  return Object.values(EQUIPMENT_PRESETS);
}

/**
 * Gets a preset by its ID.
 *
 * @param id - The preset ID ('qrp-portable', 'standard-portable', or 'mobile-high-power')
 * @returns The EquipmentPreset if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const preset = getPresetById('qrp-portable');
 * if (preset) {
 *   console.log(`${preset.name}: ${preset.maxPower}W max`);
 * }
 * ```
 */
export function getPresetById(id: PresetId): EquipmentPreset | undefined {
  return EQUIPMENT_PRESETS[id];
}

/**
 * Gets a human-readable display name for a preset.
 *
 * @param id - The preset ID or null for no preset
 * @returns The preset's display name, 'None' if id is null, or the id if not found
 *
 * @example
 * ```typescript
 * getPresetDisplayName('qrp-portable'); // 'QRP Portable'
 * getPresetDisplayName(null); // 'None'
 * ```
 */
export function getPresetDisplayName(id: PresetId | null): string {
  if (!id) return 'None';
  const preset = EQUIPMENT_PRESETS[id];
  return preset ? preset.name : id;
}

/**
 * Checks if a string is a valid preset ID.
 *
 * Type guard that validates whether a string matches one of the
 * predefined preset IDs.
 *
 * @param id - String to validate
 * @returns True if the ID is a valid PresetId
 *
 * @example
 * ```typescript
 * if (isValidPresetId(userInput)) {
 *   const preset = getPresetById(userInput);
 * }
 * ```
 */
export function isValidPresetId(id: string): id is PresetId {
  return id in EQUIPMENT_PRESETS;
}

/**
 * Gets preset options formatted for CLI selection prompts.
 *
 * Returns an array of options suitable for use with inquirer or
 * similar prompt libraries, each containing:
 * - value: The preset ID for programmatic use
 * - label: Human-readable preset name
 * - description: Brief description including max power
 *
 * @returns Array of preset options for CLI prompts
 *
 * @example
 * ```typescript
 * const options = getPresetOptions();
 * // [
 * //   { value: 'qrp-portable', label: 'QRP Portable', description: '...' },
 * //   { value: 'standard-portable', label: 'Standard Portable', description: '...' },
 * //   ...
 * // ]
 * ```
 */
export function getPresetOptions(): { value: PresetId; label: string; description: string }[] {
  return getAllPresets().map((preset) => ({
    value: preset.id,
    label: preset.name,
    description: `${preset.description} (${preset.maxPower}W max)`,
  }));
}
