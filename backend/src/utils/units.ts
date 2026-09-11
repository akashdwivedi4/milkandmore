import { roundStock } from './math';

export const normalizeUnitQuantity = (quantity: number, unit: string): number => {
  const upper = (unit || '').toUpperCase();
  if (upper === 'ML') {
    return roundStock(quantity / 1000);
  }
  if (upper === 'G') {
    return roundStock(quantity / 1000);
  }
  return roundStock(quantity);
};

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};
