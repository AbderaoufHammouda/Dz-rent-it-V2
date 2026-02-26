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
 * The backend handles pricing calculation and conflict detection.
 * This hook sends only {item_id, start_date, end_date} and receives
 * the fully computed booking back.
 */

import { useState, useCallback, useMemo } from 'react';
import { bookingsAPI } from '../services/api.js';
import { BookingStatus, BookingTransitions } from '../types/index.js';
import { isBookingExpired } from '../utils/dates.js';
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
   * SIMPLIFIED FLOW (backend handles pricing + conflicts):
   * 1. Validate input (dates, owner ≠ renter) — instant UX feedback
   * 2. Submit {item_id, start_date, end_date} to API
   * 3. Optimistically add returned booking to local state
   *
   * @param {Object} params
   * @param {Object} params.item - The item being booked
   * @param {string} params.startDate
   * @param {string} params.endDate
   * @param {string} [params.renterId]
   * @param {Object} [params.availabilityMap] - unused, kept for backwards compat
   */
  const createBooking = useCallback(async ({ item, startDate, endDate, renterId }) => {
    setError(null);

    // Basic validation for instant UX feedback
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

    // Submit — backend calculates pricing and checks conflicts
    setLoading(true);
    try {
      const { booking } = await bookingsAPI.create({
        itemId: item.id,
        startDate,
        endDate,
      });

      // Optimistic update with full booking from backend
      setBookings((prev) => [{ ...booking, isExpired: false }, ...prev]);

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
      complete: BookingStatus.COMPLETED,
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
        complete: () => bookingsAPI.complete(bookingId),
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
    completeBooking: (id) => transitionBooking(id, 'complete'),
  };
}
