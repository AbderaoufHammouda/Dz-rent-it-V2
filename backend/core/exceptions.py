"""
DZ-RentIt — Domain Exceptions
================================

Clean exception hierarchy for business rule violations.
These are raised by service functions and caught by API views
to return proper HTTP error responses.

DESIGN DECISION:
Domain exceptions instead of Django ValidationError because:
1. Separation between validation errors (400) and business logic errors (409/422)
2. Each exception can carry structured data for API response
3. Easier to test — assert specific exception types
4. Defendable: "We distinguish between invalid input and business rule violations"
"""


class DomainException(Exception):
    """Base class for all DZ-RentIt business rule violations."""
    default_message = 'A business rule was violated.'
    status_code = 400

    def __init__(self, message=None, detail=None):
        self.message = message or self.default_message
        self.detail = detail or {}
        super().__init__(self.message)


class BookingOverlapError(DomainException):
    """Raised when a booking conflicts with existing reservations."""
    default_message = 'The selected dates overlap with an existing booking.'
    status_code = 409  # Conflict


class SelfBookingError(DomainException):
    """Raised when a user tries to book their own item."""
    default_message = 'You cannot book your own item.'
    status_code = 422


class InvalidBookingTransitionError(DomainException):
    """Raised when a booking status transition is not allowed."""
    default_message = 'This booking status transition is not allowed.'
    status_code = 422


class BookingExpiredError(DomainException):
    """Raised when trying to approve a booking that has expired (>48h pending)."""
    default_message = 'This booking has expired and can no longer be approved.'
    status_code = 410  # Gone


class InactiveItemError(DomainException):
    """Raised when trying to book an inactive item."""
    default_message = 'This item is not currently available for rent.'
    status_code = 422


class InvalidDateRangeError(DomainException):
    """Raised when booking dates are invalid."""
    default_message = 'Invalid date range.'
    status_code = 422


class ReviewNotAllowedError(DomainException):
    """Raised when a review cannot be submitted."""
    default_message = 'You are not allowed to submit this review.'
    status_code = 422


class MessageNotAllowedError(DomainException):
    """Raised when a user tries to send a message in a conversation they don't belong to."""
    default_message = 'You are not a participant in this conversation.'
    status_code = 403
