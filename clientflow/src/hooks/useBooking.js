/**
 * DZ-RentIt — useBooking Hook
 * ==============================
 * 
 * Manages the booking lifecycle with proper state transitions.
 * 
 * BOOKING LIFECYCLE:
 * pending → approved → payment_pending → completed
 *        → rejected
 *        → cancelled (from any active state)
 * 
 * DOUBLE-BOOKING PREVENTION:
 * Before creating a booking, validates date range against availability.
 * If conflict detected → returns error, booking is NOT created.
 * 
 * AUTO-CANCEL:
 * Bookings in 'pending' state for >48h are flagged as expired.
 * Frontend displays warning; actual cancellation deferred to backend cron.
 */

import { useState, useCallback, useMemo } from 'react';
import { bookingsAPI } from '../services/api.js';
import { BookingStatus, BookingTransitions } from '../types/index.js';
import { checkDateConflicts, isBookingExpired } from '../utils/dates.js';
import { calculateRentalPrice } from '../utils/pricing.js';
import { validateBookingRequest } from '../utils/validation.js';

export default function useBooking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all bookings for current user ─────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { bookings: data } = await bookingsAPI.getAll();
      // Flag expired pending bookings
      const enriched = data.map((b) => ({
        ...b,
        isExpired: b.status === BookingStatus.PENDING && isBookingExpired(b.createdAt),
      }));
      setBookings(enriched);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new booking request.
   * 
   * CRITICAL FLOW:
   * 1. Validate input (dates, owner ≠ renter)
   * 2. Check for date conflicts
   * 3. Calculate pricing
   * 4. Submit to API
   * 5. Optimistically add to local state
   * 
   * @param {Object} params
   * @param {Object} params.item - The item being booked
   * @param {string} params.startDate
   * @param {string} params.endDate
   * @param {string} params.renterId
   * @param {Object} params.availabilityMap
   */
  const createBooking = useCallback(async ({ item, startDate, endDate, renterId, availabilityMap }) => {
    setError(null);

    // Step 1: Validate
    const validation = validateBookingRequest({
      startDate,
      endDate,
      renterId,
      ownerId: item.owner?.id || item.ownerId,
    });
    if (!validation.valid) {
      const errMsg = validation.errors.join(', ');
      setError(errMsg);
      throw new Error(errMsg);
    }

    // Step 2: Check conflicts
    const { hasConflict, conflictDates } = checkDateConflicts(startDate, endDate, availabilityMap || {});
    if (hasConflict) {
      const errMsg = `Selected dates conflict with existing bookings: ${conflictDates.join(', ')}`;
      setError(errMsg);
      throw new Error(errMsg);
    }

    // Step 3: Calculate pricing
    const pricing = calculateRentalPrice(item.price, startDate, endDate);

    // Step 4: Submit
    setLoading(true);
    try {
      const payload = {
        itemId: item.id,
        renterId,
        ownerId: item.owner?.id || item.ownerId,
        startDate,
        endDate,
        ...pricing,
        deposit: item.deposit,
      };

      const { booking } = await bookingsAPI.create(payload);

      // Step 5: Optimistic update
      setBookings((prev) => [{ ...booking, ...payload, isExpired: false }, ...prev]);

      return booking;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Transition a booking to a new status.
   * Validates the transition is legal before attempting.
   */
  const transitionBooking = useCallback(async (bookingId, action) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      setError('Booking not found');
      return;
    }

    // Validate transition
    const allowedNext = BookingTransitions[booking.status] || [];
    const targetStatus = {
      approve: BookingStatus.APPROVED,
      reject: BookingStatus.REJECTED,
      cancel: BookingStatus.CANCELLED,
    }[action];

    if (!targetStatus || !allowedNext.includes(targetStatus)) {
      setError(`Cannot ${action} a booking in "${booking.status}" state`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiCall = {
        approve: () => bookingsAPI.approve(bookingId),
        reject: () => bookingsAPI.reject(bookingId),
        cancel: () => bookingsAPI.cancel(bookingId),
      }[action];

      const { booking: updated } = await apiCall();

      // Optimistic update
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updated, isExpired: false } : b))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookings]);

  // ── Derived data (memoized to avoid recomputation on every render) ──────
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === BookingStatus.PENDING),
    [bookings]
  );
  const activeBookings = useMemo(
    () => bookings.filter((b) => [BookingStatus.APPROVED, BookingStatus.PAYMENT_PENDING].includes(b.status)),
    [bookings]
  );
  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === BookingStatus.COMPLETED),
    [bookings]
  );

  return {
    bookings,
    pendingBookings,
    activeBookings,
    completedBookings,
    loading,
    error,
    fetchBookings,
    createBooking,
    approveBooking: (id) => transitionBooking(id, 'approve'),
    rejectBooking: (id) => transitionBooking(id, 'reject'),
    cancelBooking: (id) => transitionBooking(id, 'cancel'),
  };
}
