// Grid square (Maidenhead locator) utilities

/**
 * Calculate Maidenhead grid square from latitude/longitude
 */
export function calculateGridSquare(lat: number, lon: number): string {
  // Adjust longitude to 0-360 range
  let adjustedLon = lon + 180;
  let adjustedLat = lat + 90;

  // Field (first 2 letters)
  const fieldLon = Math.floor(adjustedLon / 20);
  const fieldLat = Math.floor(adjustedLat / 10);
  const field = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat);

  // Square (2 digits)
  adjustedLon = adjustedLon % 20;
  adjustedLat = adjustedLat % 10;
  const squareLon = Math.floor(adjustedLon / 2);
  const squareLat = Math.floor(adjustedLat / 1);
  const square = squareLon.toString() + squareLat.toString();

  // Subsquare (optional, 2 lowercase letters)
  adjustedLon = adjustedLon % 2;
  adjustedLat = adjustedLat % 1;
  const subLon = Math.floor((adjustedLon / 2) * 24);
  const subLat = Math.floor(adjustedLat * 24);
  const subsquare =
    String.fromCharCode(97 + subLon) + String.fromCharCode(97 + subLat);

  return field + square + subsquare;
}

/**
 * Calculate latitude/longitude center from grid square
 */
export function gridToCoordinates(grid: string): {
  lat: number;
  lon: number;
} | null {
  const normalized = grid.toUpperCase();

  if (normalized.length < 4) return null;

  const fieldLon = normalized.charCodeAt(0) - 65;
  const fieldLat = normalized.charCodeAt(1) - 65;
  const squareLon = parseInt(normalized[2] ?? '0', 10);
  const squareLat = parseInt(normalized[3] ?? '0', 10);

  let lon = (fieldLon * 20) + (squareLon * 2) - 180;
  let lat = (fieldLat * 10) + squareLat - 90;

  // Add subsquare offset if present
  if (normalized.length >= 6) {
    const subLon = (normalized.charCodeAt(4) ?? 97) - 97;
    const subLat = (normalized.charCodeAt(5) ?? 97) - 97;
    lon += (subLon + 0.5) * (2 / 24);
    lat += (subLat + 0.5) * (1 / 24);
  } else {
    // Center of square
    lon += 1;
    lat += 0.5;
  }

  return { lat, lon };
}

/**
 * Calculate distance between two coordinates in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}
