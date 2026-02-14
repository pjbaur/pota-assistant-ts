// Hardcoded equipment presets for MVP

import type { EquipmentPreset, PresetId, EquipmentItem } from '../types/index.js';

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
 * Get all available presets
 */
export function getAllPresets(): EquipmentPreset[] {
  return Object.values(EQUIPMENT_PRESETS);
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: PresetId): EquipmentPreset | undefined {
  return EQUIPMENT_PRESETS[id];
}

/**
 * Get preset display name
 */
export function getPresetDisplayName(id: PresetId | null): string {
  if (!id) return 'None';
  const preset = EQUIPMENT_PRESETS[id];
  return preset ? preset.name : id;
}

/**
 * Check if a preset ID is valid
 */
export function isValidPresetId(id: string): id is PresetId {
  return id in EQUIPMENT_PRESETS;
}

/**
 * Get preset options for CLI prompts
 */
export function getPresetOptions(): { value: PresetId; label: string; description: string }[] {
  return getAllPresets().map((preset) => ({
    value: preset.id,
    label: preset.name,
    description: `${preset.description} (${preset.maxPower}W max)`,
  }));
}
