/**
 * DZ-RentIt — useCalendar Hook
 * ==============================
 * 
 * Encapsulates ALL calendar/availability logic:
 * - Month navigation
 * - Day selection (range picker)
 * - Availability status resolution
 * - Conflict detection
 * - Blocked date management (for owners)
 * 
 * ARCHITECTURE: This hook is the single source of truth for calendar state.
 * Components consume its return value — zero calendar logic in JSX.
 */

import { useState, useCallback, useMemo } from 'react';
import { addMonths, subMonths, format } from 'date-fns';
import { DayStatus } from '../types/index.js';
import { generateCalendarMonth, getDayStatus, checkDateConflicts, buildAvailabilityMap, isPastDate } from '../utils/dates.js';

/**
 * @param {Object} options
 * @param {Object} options.availabilityMap - { 'YYYY-MM-DD': DayStatus }
 * @param {boolean} [options.isOwner=false] - Enable owner mode (block/unblock dates)
 * @param {Function} [options.onDateRangeChange] - Callback when selection changes
 */
export default function useCalendar({ availabilityMap = {}, isOwner = false, onDateRangeChange } = {}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Generate calendar grid for current month
  const weeks = useMemo(() => generateCalendarMonth(currentMonth), [currentMonth]);

  // Navigate months
  const nextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const prevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const monthLabel = useMemo(() => format(currentMonth, 'MMMM yyyy'), [currentMonth]);

  /**
   * Handle day click — implements range selection logic.
   * 
   * LOGIC:
   * 1. If no start selected, or both start+end exist → set as new start
   * 2. If only start exists and clicked day > start → set as end
   * 3. If clicked day <= start → reset start to clicked day
   * 4. Reserved/blocked days are unselectable (unless owner mode)
   */
  const selectDay = useCallback((dateKey) => {
    const status = getDayStatus(dateKey, availabilityMap);

    // Renters cannot select reserved or blocked days
    if (!isOwner && (status === DayStatus.RESERVED || status === DayStatus.BLOCKED)) {
      return;
    }

    setStartDate((prevStart) => {
      // If nothing selected yet, or we have a complete range → start fresh
      if (!prevStart || (prevStart && endDate)) {
        setEndDate(null);
        onDateRangeChange?.({ start: dateKey, end: null });
        return dateKey;
      }

      // If clicked date is after start → complete the range
      if (dateKey > prevStart) {
        // Check for conflicts in the range
        const { hasConflict } = checkDateConflicts(prevStart, dateKey, availabilityMap);
        if (hasConflict && !isOwner) {
          // Conflict detected — reset to clicked date
          setEndDate(null);
          onDateRangeChange?.({ start: dateKey, end: null });
          return dateKey;
        }
        setEndDate(dateKey);
        onDateRangeChange?.({ start: prevStart, end: dateKey });
        return prevStart;
      }

      // Clicked date is before start → replace start
      setEndDate(null);
      onDateRangeChange?.({ start: dateKey, end: null });
      return dateKey;
    });
  }, [availabilityMap, endDate, isOwner, onDateRangeChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    onDateRangeChange?.({ start: null, end: null });
  }, [onDateRangeChange]);

  /**
   * Check if a specific date is within the selected range.
   * Used for visual highlighting in the calendar UI.
   */
  const isInRange = useCallback((dateKey) => {
    if (!startDate || !endDate) return false;
    return dateKey >= startDate && dateKey <= endDate;
  }, [startDate, endDate]);

  /**
   * Check if a day is selectable (for disabling in UI).
   * Past dates are never selectable for renters.
   */
  const isDaySelectable = useCallback((dateKey) => {
    if (isOwner) return true;
    if (isPastDate(dateKey)) return false;
    const status = getDayStatus(dateKey, availabilityMap);
    return status === DayStatus.AVAILABLE || status === DayStatus.PENDING;
  }, [availabilityMap, isOwner]);

  // Conflict info for current selection
  const selectionConflict = useMemo(() => {
    if (!startDate || !endDate) return { hasConflict: false, conflictDates: [] };
    return checkDateConflicts(startDate, endDate, availabilityMap);
  }, [startDate, endDate, availabilityMap]);

  return {
    // State
    currentMonth,
    monthLabel,
    weeks,
    startDate,
    endDate,
    selectionConflict,

    // Actions
    nextMonth,
    prevMonth,
    selectDay,
    clearSelection,

    // Helpers
    isInRange,
    isDaySelectable,
    getDayStatus: (dateKey) => getDayStatus(dateKey, availabilityMap),
  };
}
