"""
DZ-RentIt — Service Layer
============================

Pure business logic functions. No HTTP concerns (serializers, views, responses).
These functions are the ONLY proper way to mutate domain objects.

DESIGN PRINCIPLES:
1. Transaction boundaries are explicit — every write operation is atomic.
2. Locking is defensive — SELECT FOR UPDATE before any concurrent-sensitive write.
3. Pricing is dynamic — computed from item + dates, never stored stale.
4. State machine is enforced — only valid transitions allowed.

CONCURRENCY MODEL:
┌─────────────────────────────────────────────────────────────────────────┐
│  create_booking()                                                      │
│                                                                         │
│  BEGIN TRANSACTION                                                      │
│    ├─ SELECT item FOR UPDATE  ← row-level lock, serializes requests    │
│    ├─ Validate: item active? user != owner? dates valid?               │
│    ├─ calculate_rental_price()  ← pure function, no side effects       │
│    ├─ Booking.objects.create()  ← INSERT triggers exclusion constraint │
│    │   ├─ IF overlap → IntegrityError → BookingOverlapError            │
│    │   └─ IF no overlap → row committed                                │
│    └─ Return booking                                                    │
│  COMMIT                                                                 │
│                                                                         │
│  ISOLATION LEVEL: READ COMMITTED (PostgreSQL default)                   │
│  LOCK TYPE: ROW EXCLUSIVE on items row via SELECT FOR UPDATE           │
│  FALLBACK: ExclusionConstraint catches any race condition leaks        │
└─────────────────────────────────────────────────────────────────────────┘
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db import transaction, IntegrityError
from django.db.models import Avg, Count, F, Q

from .models import Booking, Item, User, Review, Conversation, Message
from .enums import BookingStatus, ReviewDirection
from .exceptions import (
    BookingOverlapError,
    SelfBookingError,
    InactiveItemError,
    InvalidDateRangeError,
    InvalidBookingTransitionError,
    BookingExpiredError,
    ReviewNotAllowedError,
    MessageNotAllowedError,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. PRICING — PURE FUNCTION (no side effects, no DB calls)
# ═══════════════════════════════════════════════════════════════════════════════


# Discount tiers — configurable, not hardcoded in logic
DISCOUNT_TIERS = [
    # (min_days, max_days, discount_rate)
    (30, None, Decimal('0.20')),   # 30+ days → 20% off
    (7, 29, Decimal('0.10')),      # 7–29 days → 10% off
    (1, 6, Decimal('0.00')),       # 1–6 days → no discount
]


def calculate_rental_price(
    price_per_day: Decimal,
    start_date: date,
    end_date: date,
) -> dict:
    """
    Calculate rental pricing with duration-based discounts.

    PRICING FORMULA:
    ─────────────────────────────────────────────────────
    total_days = (end_date - start_date).days + 1   ← INCLUSIVE
    base_total = price_per_day × total_days
    discount_rate = 0.20 if days ≥ 30
                    0.10 if 7 ≤ days ≤ 29
                    0.00 otherwise
    discount_amount = base_total × discount_rate
    final_total = base_total - discount_amount
    ─────────────────────────────────────────────────────

    WHY +1 (INCLUSIVE COUNTING):
    If you rent from Jan 3 to Jan 5, you occupy 3 days (3rd, 4th, 5th),
    not 2 days. This matches user expectation and the date range stored
    in the Booking model's ExclusionConstraint ('[  ]' = both inclusive).

    Parameters:
        price_per_day: Item's daily rental rate (Decimal)
        start_date: First day of rental (inclusive)
        end_date: Last day of rental (inclusive)

    Returns:
        dict with: total_days, base_total, discount_rate,
                   discount_amount, final_total
    """
    if start_date >= end_date:
        raise InvalidDateRangeError()

    # Inclusive day count: Jan 3 → Jan 5 = 3 days
    total_days = (end_date - start_date).days + 1

    base_total = (price_per_day * total_days).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )

    # Determine discount tier
    discount_rate = Decimal('0.00')
    for min_days, max_days, rate in DISCOUNT_TIERS:
        if max_days is None:
            if total_days >= min_days:
                discount_rate = rate
                break
        elif min_days <= total_days <= max_days:
            discount_rate = rate
            break

    discount_amount = (base_total * discount_rate).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP
    )
    final_total = base_total - discount_amount

    return {
        'total_days': total_days,
        'base_total': base_total,
        'discount_rate': discount_rate,
        'discount_amount': discount_amount,
        'final_total': final_total,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. BOOKING CREATION — CONCURRENCY-SAFE
# ═══════════════════════════════════════════════════════════════════════════════


@transaction.atomic
def create_booking(
    renter: User,
    item_id,
    start_date: date,
    end_date: date,
) -> Booking:
    """
    Create a new booking with full concurrency safety.

    CONCURRENCY STRATEGY (defense-in-depth):
    ─────────────────────────────────────────
    Layer 1: SELECT FOR UPDATE on Item row
             → Acquires row-level exclusive lock
             → Any concurrent create_booking() for same item BLOCKS here
             → Released when transaction commits/rolls back

    Layer 2: PostgreSQL ExclusionConstraint (xcl_booking_no_overlap)
             → Even if Layer 1 somehow fails (e.g., different items),
               the DB kernel rejects overlapping INSERTs
             → Catches IntegrityError → translated to BookingOverlapError

    Layer 3: Application validation (before INSERT)
             → Provides user-friendly error messages
             → Not relied upon for safety — DB constraints are authoritative

    RACE CONDITION SCENARIO:
    ┌──────────────────────┬──────────────────────┐
    │ Transaction A         │ Transaction B         │
    ├──────────────────────┼──────────────────────┤
    │ BEGIN                 │ BEGIN                 │
    │ SELECT FOR UPDATE     │                       │
    │ (acquires lock)       │ SELECT FOR UPDATE     │
    │                       │ (BLOCKED — waiting)   │
    │ INSERT booking        │                       │
    │ COMMIT                │ (lock released)       │
    │                       │ (acquires lock)       │
    │                       │ INSERT booking        │
    │                       │ ← xcl_booking_no_     │
    │                       │   overlap REJECTS     │
    │                       │ ROLLBACK              │
    └──────────────────────┴──────────────────────┘

    Parameters:
        renter: The user requesting the rental
        item_id: UUID of the item to book
        start_date: First rental day (inclusive)
        end_date: Last rental day (inclusive)

    Returns:
        Booking instance (saved)

    Raises:
        InvalidDateRangeError: If start_date >= end_date or in the past
        InactiveItemError: If item is not active
        SelfBookingError: If renter is the item owner
        BookingOverlapError: If dates conflict with existing active booking
    """

    # ── Validate dates ──
    if start_date >= end_date:
        raise InvalidDateRangeError()
    if start_date < date.today():
        raise InvalidDateRangeError(detail='Start date cannot be in the past.')

    # ── Lock the item row (Layer 1: SELECT FOR UPDATE) ──
    try:
        item = (
            Item.objects
            .select_for_update()  # ROW EXCLUSIVE lock
            .get(pk=item_id)
        )
    except Item.DoesNotExist:
        raise InactiveItemError(detail='Item not found.')

    # ── Validate business rules (Layer 3: application validation) ──
    if not item.is_active:
        raise InactiveItemError()

    if renter.pk == item.owner_id:
        raise SelfBookingError()

    # ── Calculate pricing ──
    pricing = calculate_rental_price(item.price_per_day, start_date, end_date)

    # ── Create booking (Layer 2: ExclusionConstraint enforced at INSERT) ──
    try:
        booking = Booking.objects.create(
            item=item,
            renter=renter,
            owner=item.owner,   # Denormalized — avoids join on queries
            start_date=start_date,
            end_date=end_date,
            status=BookingStatus.PENDING,
            total_days=pricing['total_days'],
            base_total=pricing['base_total'],
            discount_rate=pricing['discount_rate'],
            discount_amount=pricing['discount_amount'],
            final_total=pricing['final_total'],
            deposit=item.deposit_amount,
        )
    except IntegrityError as e:
        # ExclusionConstraint violation → overlap detected at DB level
        if 'xcl_booking_no_overlap' in str(e):
            raise BookingOverlapError()
        # Re-raise any other integrity error (e.g., FK violation)
        raise

    return booking


# ═══════════════════════════════════════════════════════════════════════════════
# 3. BOOKING STATE MACHINE
# ═══════════════════════════════════════════════════════════════════════════════


@transaction.atomic
def transition_booking(
    booking_id,
    new_status: str,
    actor: User,
) -> Booking:
    """
    Transition a booking to a new status with state machine validation.

    STATE MACHINE (from enums.py):
    ──────────────────────────────────────────────────────
    PENDING          → APPROVED, REJECTED, CANCELLED
    APPROVED         → PAYMENT_PENDING, CANCELLED
    PAYMENT_PENDING  → COMPLETED, CANCELLED
    REJECTED         → (terminal)
    CANCELLED        → (terminal)
    COMPLETED        → (terminal)
    ──────────────────────────────────────────────────────

    AUTHORIZATION RULES:
    - APPROVED / REJECTED: Only the item owner can approve or reject
    - CANCELLED: Either party can cancel
    - PAYMENT_PENDING / COMPLETED: Only the item owner can advance

    Parameters:
        booking_id: UUID of the booking
        new_status: Target status string (must be valid BookingStatus)
        actor: The user performing the transition

    Returns:
        Updated Booking instance

    Raises:
        InvalidBookingTransitionError: If transition is not allowed
        BookingExpiredError: If pending booking has expired (>48h)
    """
    booking = (
        Booking.objects
        .select_for_update()
        .select_related('item')
        .get(pk=booking_id)
    )

    current = booking.status
    valid_transitions = BookingStatus.valid_transitions()

    # ── Check if transition is valid in state machine ──
    if new_status not in valid_transitions.get(current, []):
        raise InvalidBookingTransitionError(
            detail=(
                f'Cannot transition from {current} to {new_status}. '
                f'Valid transitions: {valid_transitions.get(current, [])}'
            )
        )

    # ── Check for expired pending bookings ──
    if current == BookingStatus.PENDING and booking.is_expired:
        # Auto-expire: reject the booking instead of allowing approval
        if new_status == BookingStatus.APPROVED:
            raise BookingExpiredError()

    # ── Authorization checks ──
    owner_only = {
        BookingStatus.APPROVED,
        BookingStatus.REJECTED,
        BookingStatus.PAYMENT_PENDING,
        BookingStatus.COMPLETED,
    }
    if new_status in owner_only and actor.pk != booking.owner_id:
        raise InvalidBookingTransitionError(
            detail='Only the item owner can perform this action.'
        )

    # Cancellation: either renter or owner can cancel
    if new_status == BookingStatus.CANCELLED:
        if actor.pk not in (booking.renter_id, booking.owner_id):
            raise InvalidBookingTransitionError(
                detail='Only booking participants can cancel.'
            )

    # ── Apply transition ──
    booking.status = new_status
    booking.save(update_fields=['status', 'updated_at'])

    return booking


# ═══════════════════════════════════════════════════════════════════════════════
# 4. REVIEW SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════


@transaction.atomic
def create_review(
    booking_id,
    reviewer: User,
    rating: int,
    comment: str,
) -> Review:
    """
    Create a review for a completed booking.

    BUSINESS RULES:
    1. Only completed bookings can be reviewed
    2. Only the renter or owner of the booking can submit a review
    3. Direction is auto-determined from the reviewer's role
    4. One review per direction per booking (enforced by UniqueConstraint)
    5. After review creation, the reviewed user's rating_avg is recalculated

    Parameters:
        booking_id: UUID of the completed booking
        reviewer: The user submitting the review
        rating: Integer 1–5
        comment: Review text (min 10 chars)

    Returns:
        Review instance

    Raises:
        ReviewNotAllowedError: If any business rule is violated
    """
    booking = Booking.objects.select_related('item').get(pk=booking_id)

    # Rule 1: Booking must be completed
    if booking.status != BookingStatus.COMPLETED:
        raise ReviewNotAllowedError(
            detail='Reviews can only be submitted for completed bookings.'
        )

    # Rule 2: Determine direction and reviewed user
    if reviewer.pk == booking.renter_id:
        direction = ReviewDirection.RENTER_TO_OWNER
        reviewed_user = booking.owner
    elif reviewer.pk == booking.owner_id:
        direction = ReviewDirection.OWNER_TO_RENTER
        reviewed_user = booking.renter
    else:
        raise ReviewNotAllowedError(
            detail='Only booking participants can submit reviews.'
        )

    # Rule 3: Check for duplicate review
    if Review.objects.filter(
        booking=booking,
        reviewer=reviewer,
        direction=direction,
    ).exists():
        raise ReviewNotAllowedError(
            detail='You have already submitted a review for this booking.'
        )

    # Rule 4: Validate comment length
    if len(comment.strip()) < 10:
        raise ReviewNotAllowedError(
            detail='Review comment must be at least 10 characters.'
        )

    # ── Create review ──
    review = Review.objects.create(
        booking=booking,
        reviewer=reviewer,
        reviewed_user=reviewed_user,
        direction=direction,
        rating=rating,
        comment=comment.strip(),
    )

    # ── Update denormalized rating on reviewed user ──
    _update_user_rating(reviewed_user)

    return review


def _update_user_rating(user: User) -> None:
    """
    Recalculate and persist a user's average rating and review count.

    Uses a single aggregation query — O(1) DB round-trip.

    WHY DENORMALIZE:
    - Profile pages are viewed 100x more than reviews are written.
    - Computing AVG() on every profile view = O(n) per request.
    - Denormalized field = O(1) read, updated only when reviews change.
    """
    stats = Review.objects.filter(reviewed_user=user).aggregate(
        avg_rating=Avg('rating'),
        total_count=Count('id'),
    )

    user.rating_avg = (
        Decimal(str(stats['avg_rating'])).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        if stats['avg_rating']
        else Decimal('0.00')
    )
    user.review_count = stats['total_count'] or 0
    user.save(update_fields=['rating_avg', 'review_count', 'updated_at'])


# ═══════════════════════════════════════════════════════════════════════════════
# 5. MESSAGING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════


def get_or_create_conversation(
    user_1: User,
    user_2: User,
    booking: Optional[Booking] = None,
) -> Conversation:
    """
    Retrieve or create a conversation between two users.

    ORDERING CONVENTION:
    participant_1 is always the user with the lower UUID string.
    This prevents duplicate conversations (A↔B vs B↔A).

    Parameters:
        user_1, user_2: The two participants
        booking: Optional related booking

    Returns:
        Conversation instance (existing or newly created)
    """
    if user_1.pk == user_2.pk:
        raise MessageNotAllowedError(
            detail='Cannot create a conversation with yourself.'
        )

    # Enforce ordering: lower UUID first
    if str(user_1.pk) > str(user_2.pk):
        user_1, user_2 = user_2, user_1

    conversation, _ = Conversation.objects.get_or_create(
        participant_1=user_1,
        participant_2=user_2,
        booking=booking,
    )
    return conversation


@transaction.atomic
def send_message(
    conversation_id,
    sender: User,
    content: str,
) -> Message:
    """
    Send a message in a conversation.

    VALIDATION:
    - Only conversation participants can send messages
    - Content must not be empty

    Parameters:
        conversation_id: UUID of the conversation
        sender: The user sending the message
        content: Message text

    Returns:
        Message instance

    Raises:
        MessageNotAllowedError: If sender is not a participant
    """
    conversation = Conversation.objects.get(pk=conversation_id)

    if not conversation.has_participant(sender):
        raise MessageNotAllowedError()

    if not content or not content.strip():
        raise MessageNotAllowedError(
            detail='Message content cannot be empty.'
        )

    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content.strip(),
    )

    # Update conversation's updated_at for sorting
    Conversation.objects.filter(pk=conversation_id).update(
        updated_at=message.created_at
    )

    return message


def mark_messages_read(conversation_id, reader: User) -> int:
    """
    Mark all unread messages in a conversation as read.

    Only marks messages NOT sent by the reader (you don't "read" your own).

    Returns:
        Number of messages marked as read
    """
    return (
        Message.objects
        .filter(
            conversation_id=conversation_id,
            is_read=False,
        )
        .exclude(sender=reader)
        .update(is_read=True)
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 6. QUERY HELPERS (commonly used lookups)
# ═══════════════════════════════════════════════════════════════════════════════


def get_item_availability(item_id, from_date: date, to_date: date):
    """
    Return all active bookings for an item that overlap with the given range.

    Used by the calendar component to show blocked dates.

    This uses the same overlap logic as the ExclusionConstraint:
    Two date ranges [A_start, A_end] and [B_start, B_end] overlap iff:
        A_start <= B_end AND B_start <= A_end
    """
    return Booking.objects.filter(
        item_id=item_id,
        status__in=BookingStatus.active_statuses(),
        start_date__lte=to_date,
        end_date__gte=from_date,
    ).values('start_date', 'end_date', 'status')


def get_user_bookings(user: User, role: str = 'both'):
    """
    Get bookings for a user, optionally filtered by role.

    Parameters:
        user: The user
        role: 'renter', 'owner', or 'both'

    Returns:
        QuerySet of Bookings
    """
    qs = Booking.objects.select_related('item', 'renter', 'owner')

    if role == 'renter':
        return qs.filter(renter=user)
    elif role == 'owner':
        return qs.filter(owner=user)
    else:
        return qs.filter(Q(renter=user) | Q(owner=user))
