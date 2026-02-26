/**
 * DZ-RentIt — Type Definitions & Constants
 * =========================================
 * Centralized type documentation and enums for the entire application.
 * Using JSDoc for full IntelliSense support without TypeScript compilation overhead.
 */

// ─── ENUMS / CONSTANTS ─────────────────────────────────────────────────────────

/** Availability status for a single calendar day */
export const DayStatus = Object.freeze({
  AVAILABLE: 'available',
  PENDING: 'pending',
  RESERVED: 'reserved',
  BLOCKED: 'blocked',
});

/** Booking lifecycle statuses */
export const BookingStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  PAYMENT_PENDING: 'payment_pending',
  COMPLETED: 'completed',
});

/** Booking status flow — valid transitions */
export const BookingTransitions = Object.freeze({
  [BookingStatus.PENDING]: [BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
  [BookingStatus.APPROVED]: [BookingStatus.PAYMENT_PENDING, BookingStatus.CANCELLED],
  [BookingStatus.PAYMENT_PENDING]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.COMPLETED]: [],
});

/** Item condition options */
export const ItemCondition = Object.freeze({
  NEW: 'Like New',
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
});

/** Discount tiers — applied automatically based on rental duration */
export const DiscountTiers = Object.freeze([
  { minDays: 30, rate: 0.20, label: '20% Extended Rental Bonus' },
  { minDays: 7, rate: 0.10, label: '10% Long-Term Discount' },
]);

/** Auto-cancel threshold (hours) for unapproved bookings */
export const AUTO_CANCEL_HOURS = 48;

// ─── JSDOC TYPE DEFINITIONS ────────────────────────────────────────────────────

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} avatar
 * @property {number} rating
 * @property {number} reviewCount
 * @property {string} responseRate
 * @property {string} responseTime
 * @property {string} memberSince
 * @property {boolean} verified
 * @property {string} [phone]
 * @property {string} [bio]
 * @property {string} [location]
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {number} count
 * @property {string|null} parentId
 * @property {Category[]} [children]
 */

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} ownerId
 * @property {string} title
 * @property {string} description
 * @property {string} categoryId
 * @property {string} category - display name
 * @property {number} price - price per day in DA
 * @property {number} deposit - security deposit in DA
 * @property {number} rating
 * @property {number} reviewCount
 * @property {string} location
 * @property {string} [distance]
 * @property {boolean} available
 * @property {string[]} images
 * @property {Object} owner - denormalized owner info
 * @property {string[]} features
 * @property {string} condition
 * @property {string} listed - ISO date string
 * @property {string} createdAt - ISO date string
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} itemId
 * @property {string} renterId
 * @property {string} ownerId
 * @property {string} startDate - ISO date (YYYY-MM-DD)
 * @property {string} endDate - ISO date (YYYY-MM-DD)
 * @property {string} status - one of BookingStatus values
 * @property {number} totalDays
 * @property {number} baseTotal
 * @property {number} discountRate
 * @property {number} discountAmount
 * @property {number} finalTotal
 * @property {number} deposit
 * @property {string} createdAt - ISO date string
 * @property {string} [approvedAt]
 * @property {string} [rejectedAt]
 * @property {string} [cancelledAt]
 * @property {string} [completedAt]
 */

/**
 * @typedef {Object} Review
 * @property {string} id
 * @property {string} bookingId
 * @property {string} reviewerId
 * @property {string} targetUserId
 * @property {number} rating - 1 to 5
 * @property {string} comment
 * @property {string} createdAt
 * @property {'renter_to_owner'|'owner_to_renter'} direction
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} conversationId
 * @property {string} senderId
 * @property {string} text
 * @property {string} createdAt
 * @property {boolean} read
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string[]} participants - [userId, userId]
 * @property {string} [bookingId]
 * @property {string} [itemId]
 * @property {Message} lastMessage
 * @property {number} unreadCount
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} AvailabilityMap
 * @property {Object.<string, string>} dates - { 'YYYY-MM-DD': DayStatus }
 */

/**
 * @typedef {Object} PricingResult
 * @property {number} totalDays
 * @property {number} baseTotal
 * @property {number} discountRate - 0, 0.10, or 0.20
 * @property {number} discountAmount
 * @property {number} finalTotal
 * @property {string|null} discountLabel
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user
 * @property {string|null} token
 * @property {boolean} isAuthenticated
 * @property {boolean} loading
 */

/**
 * @typedef {Object} SearchFilters
 * @property {string} query
 * @property {string|null} categoryId
 * @property {number[]} priceRange - [min, max]
 * @property {boolean} availableOnly
 * @property {string|null} startDate
 * @property {string|null} endDate
 * @property {string} sortBy - 'relevance'|'newest'|'price_asc'|'price_desc'|'rating'
 */
