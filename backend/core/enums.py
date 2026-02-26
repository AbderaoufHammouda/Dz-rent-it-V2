"""
DZ-RentIt — Domain Enumerations
=================================

Centralized enum definitions used across models, services, and serializers.
Using Django's TextChoices for database-friendly ENUM representation.

DESIGN DECISION:
TextChoices over IntegerChoices because:
1. Human-readable in DB inspection (psql, pgAdmin)
2. Self-documenting in migrations
3. Safer in distributed systems (no integer ordering dependency)
4. Easier to defend during soutenance — examiner sees 'approved' not '2'
"""

from django.db import models


class BookingStatus(models.TextChoices):
    """
    Booking lifecycle state machine.

    TRANSITIONS:
        pending → approved → payment_pending → completed
                → rejected
                → cancelled (from pending, approved, payment_pending)

    ACTIVE_STATUSES: States that block calendar dates (pending, approved, payment_pending).
    TERMINAL_STATUSES: States that free calendar dates (rejected, cancelled, completed).
    """
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    CANCELLED = 'cancelled', 'Cancelled'
    PAYMENT_PENDING = 'payment_pending', 'Payment Pending'
    COMPLETED = 'completed', 'Completed'

    @classmethod
    def active_statuses(cls):
        """Statuses that block dates on the availability calendar."""
        return [cls.PENDING, cls.APPROVED, cls.PAYMENT_PENDING]

    @classmethod
    def terminal_statuses(cls):
        """Statuses that do NOT block dates — booking is finalized."""
        return [cls.REJECTED, cls.CANCELLED, cls.COMPLETED]

    @classmethod
    def valid_transitions(cls):
        """
        State machine transition map.
        Key = current status, Value = list of allowed next statuses.
        """
        return {
            cls.PENDING: [cls.APPROVED, cls.REJECTED, cls.CANCELLED],
            cls.APPROVED: [cls.PAYMENT_PENDING, cls.CANCELLED],
            cls.PAYMENT_PENDING: [cls.COMPLETED, cls.CANCELLED],
            cls.REJECTED: [],      # terminal
            cls.CANCELLED: [],     # terminal
            cls.COMPLETED: [],     # terminal
        }


class ItemCondition(models.TextChoices):
    """Physical condition of a rental item."""
    LIKE_NEW = 'like_new', 'Like New'
    EXCELLENT = 'excellent', 'Excellent'
    GOOD = 'good', 'Good'
    FAIR = 'fair', 'Fair'


class ReviewDirection(models.TextChoices):
    """
    Who is reviewing whom.
    Each completed booking allows up to 2 reviews (one per direction).
    """
    RENTER_TO_OWNER = 'renter_to_owner', 'Renter → Owner'
    OWNER_TO_RENTER = 'owner_to_renter', 'Owner → Renter'
