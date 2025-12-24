import { PricingTier } from '../types';

// Fixed pricing tiers in THB
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

export function calculateEarlyCheckInCharge(hoursEarly: number): number {
  return hoursEarly * HOURLY_PENALTY;
}

export function calculateLateCheckOutCharge(hoursLate: number): number {
  return hoursLate * HOURLY_PENALTY;
}

export function calculateVAT(subtotal: number): number {
  return Math.round(subtotal * VAT_RATE * 100) / 100;
}

export function calculateTotal(subtotal: number): number {
  const vat = calculateVAT(subtotal);
  return Math.round((subtotal + vat) * 100) / 100;
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
