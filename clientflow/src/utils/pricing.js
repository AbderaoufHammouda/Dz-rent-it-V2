/**
 * DZ-RentIt — Pricing Utility (Pure Functions)
 * =============================================
 * 
 * ARCHITECTURE DECISION:
 * All pricing logic is extracted into pure functions with zero side effects.
 * This enables unit testing, reuse across components, and clear defendability
 * during soutenance — the examiner can see exact discount thresholds.
 * 
 * DISCOUNT POLICY:
 * - 1–6 days   → 0% discount (standard rate)
 * - 7–29 days  → 10% discount (long-term incentive)
 * - 30+ days   → 20% discount (extended rental bonus)
 * 
 * Edge cases:
 * - Exactly 7 days triggers 10%
 * - Exactly 30 days triggers 20%
 * - 0 or negative days returns zero pricing
 * - Non-numeric input throws TypeError
 */

import { DiscountTiers } from '../types/index.js';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';

/**
 * Calculate the number of rental days between two date strings.
 * Inclusive of both start and end date (3 Jan → 5 Jan = 3 days).
 * 
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate   - ISO date string (YYYY-MM-DD)
 * @returns {number} Total rental days (0 if invalid)
 */
export function calculateRentalDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  if (!isValid(start) || !isValid(end)) return 0;
  const days = differenceInCalendarDays(end, start) + 1; // inclusive
  return Math.max(0, days);
}

/**
 * Determine the applicable discount tier based on rental duration.
 * Tiers are evaluated in descending order (highest discount first).
 * 
 * @param {number} totalDays - Number of rental days
 * @returns {{ rate: number, label: string } | null}
 */
export function getDiscountTier(totalDays) {
  if (totalDays <= 0) return null;
  // DiscountTiers is sorted descending by minDays: [30-day, 7-day]
  for (const tier of DiscountTiers) {
    if (totalDays >= tier.minDays) {
      return { rate: tier.rate, label: tier.label };
    }
  }
  return null;
}

/**
 * Calculate full rental pricing breakdown.
 * This is the CORE pricing function used across the entire application.
 * 
 * @param {number} pricePerDay - Base price per day in DA
 * @param {string|Date} startDate - Start date (ISO string or Date)
 * @param {string|Date} endDate   - End date (ISO string or Date)
 * @returns {import('../types/index.js').PricingResult}
 * 
 * @example
 * calculateRentalPrice(500, '2026-03-01', '2026-03-08')
 * // → { totalDays: 8, baseTotal: 4000, discountRate: 0.10,
 * //     discountAmount: 400, finalTotal: 3600, discountLabel: '10% Long-Term Discount' }
 */
export function calculateRentalPrice(pricePerDay, startDate, endDate) {
  if (typeof pricePerDay !== 'number' || pricePerDay < 0) {
    throw new TypeError(`pricePerDay must be a non-negative number, got: ${pricePerDay}`);
  }

  const totalDays = calculateRentalDays(startDate, endDate);

  if (totalDays <= 0) {
    return {
      totalDays: 0,
      baseTotal: 0,
      discountRate: 0,
      discountAmount: 0,
      finalTotal: 0,
      discountLabel: null,
    };
  }

  const baseTotal = pricePerDay * totalDays;
  const tier = getDiscountTier(totalDays);
  const discountRate = tier ? tier.rate : 0;
  const discountAmount = Math.round(baseTotal * discountRate);
  const finalTotal = baseTotal - discountAmount;

  return {
    totalDays,
    baseTotal,
    discountRate,
    discountAmount,
    finalTotal,
    discountLabel: tier ? tier.label : null,
  };
}

/**
 * Format a price in Algerian Dinar.
 * @param {number} amount
 * @returns {string}
 */
export function formatPrice(amount) {
  if (amount == null || isNaN(amount)) return '0 DA';
  return `${amount.toLocaleString('fr-DZ')} DA`;
}

/**
 * Calculate estimated monthly earnings for an item owner.
 * Assumes average 60% occupancy rate.
 * 
 * @param {number} pricePerDay
 * @param {number} occupancyRate - 0 to 1 (default 0.6)
 * @returns {number}
 */
export function estimateMonthlyEarnings(pricePerDay, occupancyRate = 0.6) {
  return Math.round(pricePerDay * 30 * occupancyRate);
}
