/**
 * DZ-RentIt — Form Validation Utilities
 * ======================================
 * Pure validation functions extracted from component logic.
 * Each returns { valid: boolean, errors: string[] }
 */

/**
 * Validate email format.
 * @param {string} email
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return { valid: false, error: 'Email is required' };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return { valid: false, error: 'Invalid email format' };
  return { valid: true, error: null };
}

/**
 * Password strength checker.
 * Returns individual check results and overall validity.
 * 
 * @param {string} password
 * @returns {{ valid: boolean, checks: { label: string, met: boolean }[] }}
 */
export function validatePassword(password) {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const valid = checks.every((c) => c.met);
  return { valid, checks };
}

/**
 * Validate item form data for each step of the multi-step flow.
 * 
 * @param {number} step - Current step (1-5)
 * @param {Object} formData - Current form state
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateItemForm(step, formData) {
  const errors = [];

  switch (step) {
    case 1:
      if (!formData.title?.trim()) errors.push('Title is required');
      if (formData.title && formData.title.length < 5) errors.push('Title must be at least 5 characters');
      if (!formData.description?.trim()) errors.push('Description is required');
      if (formData.description && formData.description.length < 20) errors.push('Description must be at least 20 characters');
      if (!formData.condition) errors.push('Condition is required');
      break;
    case 2:
      if (!formData.categoryId) errors.push('Category is required');
      break;
    case 3:
      // Photos optional for MVP, but recommended
      break;
    case 4:
      if (!formData.price || formData.price <= 0) errors.push('Price per day is required');
      if (!formData.deposit || formData.deposit <= 0) errors.push('Security deposit is required');
      if (formData.deposit && formData.price && formData.deposit < formData.price) {
        errors.push('Deposit should be at least equal to the daily price');
      }
      break;
    case 5:
      // Availability optional at listing time
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a booking request before submission.
 * 
 * @param {Object} params
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {string} params.renterId
 * @param {string} params.ownerId
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingRequest({ startDate, endDate, renterId, ownerId }) {
  const errors = [];
  if (!startDate) errors.push('Start date is required');
  if (!endDate) errors.push('End date is required');
  if (startDate && endDate && startDate > endDate) errors.push('End date must be after start date');
  if (!renterId) errors.push('Not authenticated');
  if (renterId && renterId === ownerId) errors.push('You cannot book your own item');
  return { valid: errors.length === 0, errors };
}

/**
 * Validate a review submission.
 * @param {Object} params
 * @param {number} params.rating
 * @param {string} params.comment
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateReview({ rating, comment }) {
  const errors = [];
  if (!rating || rating < 1 || rating > 5) errors.push('Rating must be between 1 and 5');
  if (!comment?.trim()) errors.push('Comment is required');
  if (comment && comment.length < 10) errors.push('Comment must be at least 10 characters');
  return { valid: errors.length === 0, errors };
}
