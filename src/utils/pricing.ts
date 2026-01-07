import { PricingTier } from '../types';

// Fixed pricing tiers in THB (Inclusive of VAT 7%)
export const PRICING = {
  general: 890,
  tour: 840,
  vip: 400,
} as const;

export const HOURLY_PENALTY = 50; // THB per hour
export const VAT_RATE = 0.07; // 7%

export function getBaseRate(tier: PricingTier): number {
  return PRICING[tier];
}

export function calculateEarlyCheckInCharge(hoursEarly: number, dailyRate: number): number {
  if (hoursEarly > 6) {
    return dailyRate;
  }
  return hoursEarly * HOURLY_PENALTY;
}

export function calculateLateCheckOutCharge(hoursLate: number, dailyRate: number): number {
  if (hoursLate > 6) {
    return dailyRate;
  }
  return hoursLate * HOURLY_PENALTY;
}

// EXTRACT VAT from Total Inclusive Price
// VAT = Total * 7 / 107
export function extractVAT(totalInclusive: number): number {
  return Math.round((totalInclusive * 7 / 107) * 100) / 100;
}

// EXTRACT Base Price from Total Inclusive Price
// Base = Total - VAT
export function extractBasePrice(totalInclusive: number): number {
  return Math.round((totalInclusive - extractVAT(totalInclusive)) * 100) / 100;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 1;
}

export function calculateHoursDifference(scheduled: string, actual: string): number {
  const scheduledTime = new Date(scheduled);
  const actualTime = new Date(actual);
  const diffMs = actualTime.getTime() - scheduledTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, Math.floor(diffHours));
}
