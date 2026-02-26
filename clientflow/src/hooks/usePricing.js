/**
 * DZ-RentIt — usePricing Hook
 * ==============================
 * 
 * Reactive wrapper around the pricing utility.
 * Automatically recalculates when dates or price change.
 * Returns the full pricing breakdown for UI consumption.
 */

import { useMemo } from 'react';
import { calculateRentalPrice, formatPrice, estimateMonthlyEarnings } from '../utils/pricing.js';

/**
 * @param {number} pricePerDay
 * @param {string|null} startDate
 * @param {string|null} endDate
 * @returns {import('../types/index.js').PricingResult & { formatted: Object }}
 */
export default function usePricing(pricePerDay, startDate, endDate) {
  const pricing = useMemo(() => {
    if (!startDate || !endDate || !pricePerDay) {
      return {
        totalDays: 0,
        baseTotal: 0,
        discountRate: 0,
        discountAmount: 0,
        finalTotal: 0,
        discountLabel: null,
      };
    }
    return calculateRentalPrice(pricePerDay, startDate, endDate);
  }, [pricePerDay, startDate, endDate]);

  // Pre-formatted values for direct UI rendering
  const formatted = useMemo(() => ({
    baseTotal: formatPrice(pricing.baseTotal),
    discountAmount: formatPrice(pricing.discountAmount),
    finalTotal: formatPrice(pricing.finalTotal),
    pricePerDay: formatPrice(pricePerDay),
    discountPercent: pricing.discountRate > 0 ? `${Math.round(pricing.discountRate * 100)}%` : null,
    estimatedMonthly: formatPrice(estimateMonthlyEarnings(pricePerDay)),
  }), [pricing, pricePerDay]);

  return { ...pricing, formatted };
}
