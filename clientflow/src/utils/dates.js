/**
 * DZ-RentIt — Date & Calendar Utilities
 * ======================================
 * Pure helper functions for date manipulation, calendar generation,
 * and availability conflict detection.
 */

import {
  format, parseISO, isValid, isBefore, isAfter, isSameDay,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, differenceInHours,
} from 'date-fns';
import { DayStatus, AUTO_CANCEL_HOURS } from '../types/index.js';

/**
 * Generate calendar grid data for a given month.
 * Returns array of week arrays, each containing 7 day objects.
 * 
 * @param {Date} month - Any date within the target month
 * @returns {{ date: Date, dayOfMonth: number, isCurrentMonth: boolean }[][]}
 */
export function generateCalendarMonth(month) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });

  // Pad start with previous month days (week starts Sunday = 0)
  const startPadding = getDay(start);
  const weeks = [];
  let currentWeek = new Array(startPadding).fill(null);

  days.forEach((date) => {
    currentWeek.push({
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: true,
      dateKey: format(date, 'yyyy-MM-dd'),
    });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Pad end of last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Get the availability status for a specific date given an availability map.
 * 
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @param {Object} availabilityMap - { 'YYYY-MM-DD': DayStatus }
 * @returns {string} DayStatus value
 */
export function getDayStatus(dateKey, availabilityMap) {
  if (!availabilityMap || !availabilityMap[dateKey]) return DayStatus.AVAILABLE;
  return availabilityMap[dateKey];
}

/**
 * Check if a date range overlaps with any existing bookings.
 * CRITICAL for preventing double-booking attempts.
 * 
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate   - 'YYYY-MM-DD'
 * @param {Object} availabilityMap - { 'YYYY-MM-DD': DayStatus }
 * @returns {{ hasConflict: boolean, conflictDates: string[] }}
 */
export function checkDateConflicts(startDate, endDate, availabilityMap) {
  if (!startDate || !endDate || !availabilityMap) {
    return { hasConflict: false, conflictDates: [] };
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end) || isAfter(start, end)) {
    return { hasConflict: false, conflictDates: [] };
  }

  const allDays = eachDayOfInterval({ start, end });
  const conflictDates = [];

  for (const day of allDays) {
    const key = format(day, 'yyyy-MM-dd');
    const status = getDayStatus(key, availabilityMap);
    if (status === DayStatus.RESERVED || status === DayStatus.BLOCKED) {
      conflictDates.push(key);
    }
  }

  return { hasConflict: conflictDates.length > 0, conflictDates };
}

/**
 * Build an availability map from arrays of booking objects.
 * Converts booking date ranges into a flat { date → status } map.
 * 
 * STATUS PRECEDENCE (highest to lowest):
 * RESERVED > PENDING > BLOCKED > AVAILABLE
 * A higher-precedence status is never overwritten by a lower one.
 * 
 * @param {import('../types/index.js').Booking[]} bookings
 * @param {string[]} blockedDates - Owner-blocked dates
 * @returns {Object.<string, string>}
 */
export function buildAvailabilityMap(bookings = [], blockedDates = []) {
  const map = {};

  /** Status priority — higher number wins */
  const STATUS_PRIORITY = {
    [DayStatus.AVAILABLE]: 0,
    [DayStatus.BLOCKED]: 1,
    [DayStatus.PENDING]: 2,
    [DayStatus.RESERVED]: 3,
  };

  // Owner-blocked dates
  for (const dateStr of blockedDates) {
    map[dateStr] = DayStatus.BLOCKED;
  }

  // Booking-derived statuses — only upgrade, never downgrade
  for (const booking of bookings) {
    const start = parseISO(booking.startDate);
    const end = parseISO(booking.endDate);
    if (!isValid(start) || !isValid(end)) continue;

    const days = eachDayOfInterval({ start, end });
    const status =
      booking.status === 'approved' || booking.status === 'payment_pending' || booking.status === 'completed'
        ? DayStatus.RESERVED
        : booking.status === 'pending'
          ? DayStatus.PENDING
          : null;

    if (status) {
      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        const existing = map[key];
        // Only overwrite if new status has higher or equal precedence
        if (!existing || STATUS_PRIORITY[status] >= STATUS_PRIORITY[existing]) {
          map[key] = status;
        }
      }
    }
  }

  return map;
}

/**
 * Check if a pending booking has exceeded the auto-cancel threshold.
 * 
 * @param {string} createdAt - ISO datetime string
 * @returns {boolean}
 */
export function isBookingExpired(createdAt) {
  if (!createdAt) return false;
  const created = parseISO(createdAt);
  if (!isValid(created)) return false;
  return differenceInHours(new Date(), created) >= AUTO_CANCEL_HOURS;
}

/**
 * Format a date range for display.
 * @param {string} start
 * @param {string} end
 * @returns {string}
 */
export function formatDateRange(start, end) {
  if (!start || !end) return '';
  const s = parseISO(start);
  const e = parseISO(end);
  if (!isValid(s) || !isValid(e)) return '';
  return `${format(s, 'MMM d')} — ${format(e, 'MMM d, yyyy')}`;
}

/**
 * Check if a date is in the past.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isPastDate(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return isBefore(date, new Date()) && !isSameDay(date, new Date());
}
