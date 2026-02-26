/**
 * DZ-RentIt — useRatings Hook
 * ==============================
 * 
 * Implements the DOUBLE rating system:
 * - Renter rates Owner (after booking completion)
 * - Owner rates Renter (after booking completion)
 * 
 * Each booking allows at most 2 reviews (one per direction).
 * Average ratings are computed dynamically from review arrays.
 */

import { useState, useCallback, useMemo } from 'react';
import { reviewsAPI } from '../services/api.js';
import { validateReview } from '../utils/validation.js';

export default function useRatings() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch reviews for an item ────────────────────────────────────────────
  const fetchItemReviews = useCallback(async (itemId) => {
    setLoading(true);
    setError(null);
    try {
      const { reviews: data } = await reviewsAPI.getForItem(itemId);
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Submit a review.
   * Direction determines if it's renter→owner or owner→renter.
   * 
   * @param {Object} params
   * @param {string} params.bookingId
   * @param {string} params.reviewerId
   * @param {string} params.targetUserId
   * @param {number} params.rating
   * @param {string} params.comment
   * @param {'renter_to_owner'|'owner_to_renter'} params.direction
   */
  const submitReview = useCallback(async (params) => {
    // Validate
    const validation = validateReview({ rating: params.rating, comment: params.comment });
    if (!validation.valid) {
      const msg = validation.errors.join(', ');
      setError(msg);
      throw new Error(msg);
    }

    // Check if user already reviewed this booking in this direction
    const alreadyReviewed = reviews.some(
      (r) => r.bookingId === params.bookingId && r.reviewerId === params.reviewerId && r.direction === params.direction
    );
    if (alreadyReviewed) {
      const msg = 'You have already submitted a review for this booking';
      setError(msg);
      throw new Error(msg);
    }

    setLoading(true);
    setError(null);
    try {
      const { review } = await reviewsAPI.create(params);
      setReviews((prev) => [review, ...prev]);
      return review;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reviews]);

  /**
   * Compute average rating for a user from their received reviews.
   * @param {string} userId
   * @returns {{ average: number, count: number }}
   */
  const getUserRating = useCallback((userId) => {
    const userReviews = reviews.filter((r) => r.targetUserId === userId);
    if (userReviews.length === 0) return { average: 0, count: 0 };
    const sum = userReviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / userReviews.length) * 10) / 10,
      count: userReviews.length,
    };
  }, [reviews]);

  /**
   * Check if a specific review direction exists for a booking.
   * @param {string} bookingId
   * @param {string} reviewerId
   * @param {'renter_to_owner'|'owner_to_renter'} direction
   * @returns {boolean}
   */
  const hasReviewed = useCallback((bookingId, reviewerId, direction) => {
    return reviews.some(
      (r) => r.bookingId === bookingId && r.reviewerId === reviewerId && r.direction === direction
    );
  }, [reviews]);

  return {
    reviews,
    loading,
    error,
    fetchItemReviews,
    submitReview,
    getUserRating,
    hasReviewed,
  };
}
