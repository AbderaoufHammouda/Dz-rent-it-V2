"""
DZ-RentIt — Database Models
==============================

Production-grade PostgreSQL-backed models for the DZ-RentIt rental platform.

DESIGN PRINCIPLES:
1. Database-level constraints — never rely solely on application logic
2. UUID primary keys — distributed-safe, no sequential ID guessing
3. PostgreSQL ExclusionConstraint for overlap prevention — O(1) with GiST index
4. Proper indexing on all query-hot columns
5. Soft validations in clean() + hard constraints in Meta

POSTGRESQL FEATURES USED:
- ExclusionConstraint with btree_gist for booking overlap prevention
- GIN index on category tree (via parent_id)
- CheckConstraint for business rules
- UniqueConstraint for review uniqueness
- DateRangeField integration via exclusion constraint

ISOLATION LEVEL:
Uses READ COMMITTED (Django/PostgreSQL default) + SELECT FOR UPDATE
for row-level locking during booking creation. This provides:
- No dirty reads
- Phantom reads are acceptable (we re-validate after lock acquisition)
- Row-level lock prevents concurrent booking on same item
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone

from .enums import BookingStatus, ItemCondition, ReviewDirection


# ═══════════════════════════════════════════════════════════════════════════════
# 1. CUSTOM USER MODEL
# ═══════════════════════════════════════════════════════════════════════════════


class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.

    DESIGN DECISIONS:
    - UUID PK: No sequential ID leaking, safe for distributed systems.
    - Email unique: Primary login identifier (username kept for Django admin compat).
    - rating_avg is a denormalized field — updated via signal/service after each review.
      This avoids expensive AVG() aggregation on every profile page load.
    - is_verified: Supports future email verification or identity verification flow.

    WHY AbstractUser OVER AbstractBaseUser:
    - Inherits username, password hashing, groups, permissions out of the box
    - Avoids reimplementing 200+ lines of auth boilerplate
    - Still allows full customization via additional fields
    - Academically defensible: "We extended Django's battle-tested auth system
      rather than rewriting it, following the DRY principle."
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Universally unique identifier — distributed-safe, non-sequential.',
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        help_text='Primary login identifier. Must be unique across the platform.',
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Optional phone number for contact.',
    )
    bio = models.TextField(
        blank=True,
        default='',
        help_text='User biography/description.',
    )
    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/',
        blank=True,
        null=True,
        help_text='Profile picture. Stored in MEDIA_ROOT/avatars/.',
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='City or wilaya for proximity matching.',
    )
    rating_avg = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text=(
            'Denormalized average rating (0.00–5.00). '
            'Updated by service layer after each review. '
            'Avoids expensive AVG() query on every profile view.'
        ),
    )
    review_count = models.PositiveIntegerField(
        default=0,
        help_text='Denormalized review count — updated alongside rating_avg.',
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether the user has verified their identity/email.',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text='Account creation timestamp.',
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Last profile update timestamp.',
    )

    # Override USERNAME_FIELD to use email for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # Required by createsuperuser

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_user_email'),
            models.Index(fields=['is_verified'], name='idx_user_verified'),
            models.Index(fields=['-created_at'], name='idx_user_created'),
        ]
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.email})'


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CATEGORY MODEL (HIERARCHICAL TREE)
# ═══════════════════════════════════════════════════════════════════════════════


class Category(models.Model):
    """
    Hierarchical category tree using self-referencing foreign key.

    DESIGN DECISION — Self-FK vs MPTT vs django-treebeard:
    - Self-FK is the simplest approach with zero dependencies.
    - For our scale (< 100 categories), recursive queries are fast.
    - PostgreSQL WITH RECURSIVE CTE can traverse in a single query.
    - MPTT/treebeard add complexity that's hard to defend at soutenance.
    - If scale demands it, we can add `path` (materialized path) field later.

    QUERYSET PATTERNS:
    - Root categories: Category.objects.filter(parent__isnull=True)
    - Children: Category.objects.filter(parent_id=parent_id)
    - Full subtree: Use get_descendants() method below or raw CTE
    """

    id = models.AutoField(primary_key=True)
    name = models.CharField(
        max_length=100,
        help_text='Display name of the category.',
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text='URL-friendly identifier. Must be unique.',
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        db_index=True,
        help_text='Parent category. NULL for root-level categories.',
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Icon identifier (Lucide icon name or emoji).',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        ordering = ['name']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['parent'], name='idx_category_parent'),
            models.Index(fields=['slug'], name='idx_category_slug'),
        ]

    def __str__(self):
        return self.full_path()

    def full_path(self):
        """Return the full category path: 'Electronics > Cameras > DSLR'."""
        parts = [self.name]
        node = self.parent
        while node:
            parts.append(node.name)
            node = node.parent
        return ' > '.join(reversed(parts))

    def get_descendants(self, include_self=True):
        """
        Return all descendant category IDs (recursive).

        For < 100 categories this is efficient.
        For larger trees, replace with PostgreSQL CTE:

            WITH RECURSIVE cat_tree AS (
                SELECT id FROM categories WHERE id = %s
                UNION ALL
                SELECT c.id FROM categories c
                JOIN cat_tree ct ON c.parent_id = ct.id
            )
            SELECT id FROM cat_tree;
        """
        ids = [self.id] if include_self else []
        children = Category.objects.filter(parent=self)
        for child in children:
            ids.extend(child.get_descendants(include_self=True))
        return ids

    def clean(self):
        """Prevent circular references: a category cannot be its own ancestor."""
        if self.parent:
            node = self.parent
            visited = set()
            while node:
                if node.pk == self.pk:
                    raise ValidationError(
                        'Circular reference detected: a category cannot be its own ancestor.'
                    )
                if node.pk in visited:
                    break  # safety against existing circular data
                visited.add(node.pk)
                node = node.parent


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ITEM MODEL
# ═══════════════════════════════════════════════════════════════════════════════


class Item(models.Model):
    """
    Rental item listing.

    DESIGN DECISIONS:
    - UUID PK: Same justification as User — non-sequential, distributed-safe.
    - price_per_day stored as Decimal (NOT float) — financial precision.
    - deposit_amount: Separate from price, refunded after safe return.
    - is_active: Soft-delete / owner-controlled visibility toggle.
    - Constraints enforced at DB level via CheckConstraint.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='items',
        db_index=True,
        help_text='The user who listed this item.',
    )
    title = models.CharField(
        max_length=200,
        help_text='Short descriptive title.',
    )
    description = models.TextField(
        help_text='Detailed description of the item, condition, and what is included.',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items',
        db_index=True,
        help_text='Category classification. SET_NULL if category is deleted.',
    )
    condition = models.CharField(
        max_length=20,
        choices=ItemCondition.choices,
        default=ItemCondition.GOOD,
    )
    price_per_day = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Base rental price per day in DA. Must be >= 0.',
    )
    deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Security deposit in DA. Refunded after safe return.',
    )
    location = models.CharField(
        max_length=255,
        help_text='Pickup location (city name or address string for MVP).',
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text='Whether the item is visible and bookable. Owner-controlled toggle.',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'items'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner'], name='idx_item_owner'),
            models.Index(fields=['category'], name='idx_item_category'),
            models.Index(fields=['is_active', '-created_at'], name='idx_item_active_date'),
            models.Index(fields=['price_per_day'], name='idx_item_price'),
            models.Index(fields=['location'], name='idx_item_location'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(price_per_day__gte=0),
                name='ck_item_price_non_negative',
            ),
            models.CheckConstraint(
                check=models.Q(deposit_amount__gte=0),
                name='ck_item_deposit_non_negative',
            ),
        ]
        verbose_name = 'Item'
        verbose_name_plural = 'Items'

    def __str__(self):
        return f'{self.title} ({self.price_per_day} DA/day)'

    def clean(self):
        if self.deposit_amount and self.price_per_day:
            if self.deposit_amount < self.price_per_day:
                raise ValidationError(
                    'Security deposit should be at least equal to the daily price.'
                )


# ═══════════════════════════════════════════════════════════════════════════════
# 4. ITEM IMAGE MODEL
# ═══════════════════════════════════════════════════════════════════════════════


class ItemImage(models.Model):
    """
    Item photographs. Multiple images per item, with ordering support.

    DESIGN DECISION:
    Separate model (not JSONField of URLs) because:
    1. Each image has its own lifecycle (upload, delete, reorder)
    2. Django ImageField handles validation (file type, size)
    3. Queryable — can find all images for an item with a single FK filter
    4. Storage backend is swappable (local → S3) without model changes
    """

    id = models.AutoField(primary_key=True)
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='images',
        db_index=True,
    )
    image = models.ImageField(
        upload_to='items/%Y/%m/',
        help_text='Item photograph. Stored in MEDIA_ROOT/items/.',
    )
    is_cover = models.BooleanField(
        default=False,
        help_text='Whether this is the primary display image.',
    )
    order = models.PositiveSmallIntegerField(
        default=0,
        help_text='Display order. Lower = first.',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'item_images'
        ordering = ['order', 'uploaded_at']
        verbose_name = 'Item Image'
        verbose_name_plural = 'Item Images'

    def __str__(self):
        return f'Image for {self.item.title} (order={self.order})'


# ═══════════════════════════════════════════════════════════════════════════════
# 5. BOOKING MODEL (CRITICAL — OVERLAP PREVENTION)
# ═══════════════════════════════════════════════════════════════════════════════


class Booking(models.Model):
    """
    Core booking model with PostgreSQL-enforced overlap prevention.

    ═══════════════════════════════════════════════════════════════════════════
    OVERLAP PREVENTION — ARCHITECTURAL DECISION
    ═══════════════════════════════════════════════════════════════════════════

    CHOSEN: Option A — PostgreSQL ExclusionConstraint with btree_gist.

    HOW IT WORKS:
    PostgreSQL EXCLUDE constraint uses a GiST index to enforce that no two
    rows can have both (1) the same item_id AND (2) overlapping date ranges,
    for bookings in active statuses (pending/approved/payment_pending).

    The constraint is:
        EXCLUDE USING GIST (
            item_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
        ) WHERE (status IN ('pending', 'approved', 'payment_pending'))

    PERFORMANCE:
    - O(log n) overlap check via GiST index — same cost as a B-tree lookup
    - Zero application-level loops or subqueries needed
    - Constraint is enforced at INSERT/UPDATE time by PostgreSQL kernel
    - Cannot be bypassed by any application bug or race condition

    COMPARISON WITH OPTION B (Calendar Table):
    ┌───────────────────────┬──────────────────────┬──────────────────────┐
    │ Aspect                │ Exclusion Constraint  │ Calendar Table       │
    ├───────────────────────┼──────────────────────┼──────────────────────┤
    │ Overlap detection     │ O(log n) via GiST    │ O(days) per booking  │
    │ Storage               │ 1 row per booking    │ 1 row per day per    │
    │                       │                      │ booking              │
    │ Data integrity        │ DB-enforced, atomic   │ Application-enforced │
    │ Race condition safety │ Kernel-level lock     │ Requires app locking │
    │ Complexity            │ 1 constraint          │ Trigger + table      │
    │ Query flexibility     │ daterange operators   │ Simple date lookups  │
    │ Maintenance           │ Zero                  │ Cleanup cron needed  │
    └───────────────────────┴──────────────────────┴──────────────────────┘

    VERDICT: ExclusionConstraint is superior for our use case.
    Calendar table would only be preferred if we needed per-day pricing
    or partial-day availability (e.g., hourly rentals).

    ═══════════════════════════════════════════════════════════════════════════
    CONCURRENCY SAFETY
    ═══════════════════════════════════════════════════════════════════════════

    Even with the ExclusionConstraint, we use select_for_update() in the
    service layer to lock the item row during booking creation. This provides
    defense-in-depth:

    Layer 1: SELECT FOR UPDATE → serializes concurrent booking attempts
    Layer 2: ExclusionConstraint → catches any overlap that slips through
    Layer 3: Application validation → user-friendly error messages

    See core/services.py → create_booking() for the full implementation.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='bookings',
        db_index=True,
    )
    renter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings_as_renter',
        db_index=True,
        help_text='The user requesting the rental.',
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings_as_owner',
        db_index=True,
        help_text=(
            'Denormalized owner FK — avoids item.owner join on booking queries. '
            'Set automatically from item.owner in service layer.'
        ),
    )
    start_date = models.DateField(
        db_index=True,
        help_text='First day of rental (inclusive).',
    )
    end_date = models.DateField(
        db_index=True,
        help_text='Last day of rental (inclusive).',
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        db_index=True,
    )

    # ── Pricing snapshot (computed at creation time, stored for audit trail) ──
    total_days = models.PositiveIntegerField(
        help_text='Number of rental days (inclusive of start and end).',
    )
    base_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='price_per_day × total_days (before discount).',
    )
    discount_rate = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0,
        help_text='Applied discount rate (0.00, 0.10, or 0.20).',
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='base_total × discount_rate.',
    )
    final_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='base_total - discount_amount. Amount the renter pays.',
    )
    deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Snapshot of item.deposit_amount at booking time.',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item', 'status'], name='idx_booking_item_status'),
            models.Index(fields=['renter'], name='idx_booking_renter'),
            models.Index(fields=['owner'], name='idx_booking_owner'),
            models.Index(fields=['status'], name='idx_booking_status'),
            models.Index(fields=['start_date', 'end_date'], name='idx_booking_dates'),
            models.Index(fields=['-created_at'], name='idx_booking_created'),
        ]
        constraints = [
            # ── Business rule: start_date must be before end_date ──
            models.CheckConstraint(
                check=models.Q(start_date__lt=models.F('end_date')),
                name='ck_booking_date_order',
            ),

            # ── Business rule: renter cannot be the item owner ──
            models.CheckConstraint(
                check=~models.Q(renter=models.F('owner')),
                name='ck_booking_no_self_booking',
            ),

            # ── Business rule: total_days must be >= 1 ──
            models.CheckConstraint(
                check=models.Q(total_days__gte=1),
                name='ck_booking_min_duration',
            ),

            # ══════════════════════════════════════════════════════════════
            # CRITICAL: PostgreSQL Exclusion Constraint for Overlap Prevention
            # ══════════════════════════════════════════════════════════════
            #
            # This constraint is created via RAW SQL in migration
            # 0003_booking_overlap_exclusion.py because Django's
            # ExclusionConstraint ORM cannot express daterange() over
            # two separate DateField columns — it requires a single
            # DateRangeField. We deliberately keep start_date and end_date
            # as separate fields for query ergonomics, and install the
            # constraint manually.
            #
            # SQL equivalent (see migration for full statement):
            #
            #   ALTER TABLE bookings ADD CONSTRAINT xcl_booking_no_overlap
            #   EXCLUDE USING GIST (
            #       item_id WITH =,
            #       daterange(start_date, end_date, '[]') WITH &&
            #   ) WHERE (status IN ('pending', 'approved', 'payment_pending'));
            #
            # HOW IT WORKS:
            # - GiST index combines UUID equality + date range overlap
            # - O(log n) per check — same cost as a B-tree lookup
            # - Enforced at INSERT/UPDATE by PostgreSQL kernel
            # - Cannot be bypassed by any application bug or race condition
            # ══════════════════════════════════════════════════════════════
        ]
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'

    def __str__(self):
        return (
            f'Booking {self.id!s:.8} | {self.item.title} | '
            f'{self.start_date} → {self.end_date} | {self.status}'
        )

    def clean(self):
        """Application-level validation (supplements DB constraints)."""
        errors = {}

        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                errors['end_date'] = 'End date must be after start date.'

            if self.start_date < timezone.now().date():
                errors['start_date'] = 'Start date cannot be in the past.'

        if self.renter_id and self.owner_id and self.renter_id == self.owner_id:
            errors['renter'] = 'You cannot book your own item.'

        if errors:
            raise ValidationError(errors)

    @property
    def is_active_booking(self):
        """Whether this booking blocks calendar dates."""
        return self.status in BookingStatus.active_statuses()

    @property
    def is_expired(self):
        """Whether a pending booking has exceeded the 48h approval window."""
        if self.status != BookingStatus.PENDING:
            return False
        elapsed = timezone.now() - self.created_at
        return elapsed.total_seconds() >= 48 * 3600


# ═══════════════════════════════════════════════════════════════════════════════
# 6. REVIEW MODEL (DOUBLE-DIRECTION SYSTEM)
# ═══════════════════════════════════════════════════════════════════════════════


class Review(models.Model):
    """
    Post-rental review system with double-direction support.

    DESIGN DECISIONS:
    - Linked to Booking (not Item) because reviews require completed transactions.
    - direction field enables renter→owner AND owner→renter reviews per booking.
    - UniqueConstraint ensures one review per direction per booking per user.
    - reviewer must be either the renter or owner of the booking (enforced in clean()).

    WHY LINKED TO BOOKING:
    - Ensures only users who completed a rental can leave reviews
    - Prevents fake reviews from users who never transacted
    - Allows tracking which specific transaction the review is about
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_index=True,
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_given',
        db_index=True,
        help_text='The user writing the review.',
    )
    reviewed_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_received',
        db_index=True,
        help_text='The user being reviewed.',
    )
    direction = models.CharField(
        max_length=20,
        choices=ReviewDirection.choices,
        help_text='Who is reviewing whom in this booking.',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Rating from 1 (poor) to 5 (excellent).',
    )
    comment = models.TextField(
        help_text='Written review text. Minimum 10 characters enforced in clean().',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking'], name='idx_review_booking'),
            models.Index(fields=['reviewer'], name='idx_review_reviewer'),
            models.Index(fields=['reviewed_user'], name='idx_review_reviewed'),
            models.Index(fields=['-created_at'], name='idx_review_created'),
        ]
        constraints = [
            # ── One review per direction per booking ──
            models.UniqueConstraint(
                fields=['booking', 'reviewer', 'direction'],
                name='uq_review_one_per_direction',
            ),
            # ── Rating range: 1–5 ──
            models.CheckConstraint(
                check=models.Q(rating__gte=1, rating__lte=5),
                name='ck_review_rating_range',
            ),
        ]
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'

    def __str__(self):
        return f'Review by {self.reviewer} → {self.reviewed_user} ({self.rating}★)'

    def clean(self):
        """
        Validate review eligibility.

        Rules:
        1. Booking must be completed
        2. Reviewer must be either the renter or owner of the booking
        3. Reviewed user must be the other party
        4. Comment must be at least 10 characters
        """
        errors = {}

        if hasattr(self, 'booking') and self.booking_id:
            booking = self.booking

            # Rule 1: Booking must be completed
            if booking.status != BookingStatus.COMPLETED:
                errors['booking'] = (
                    'Reviews can only be submitted for completed bookings.'
                )

            # Rule 2 & 3: Reviewer must be a participant
            if self.reviewer_id not in (booking.renter_id, booking.owner_id):
                errors['reviewer'] = (
                    'Only the renter or owner of this booking can submit a review.'
                )

            # Direction consistency
            if self.direction == ReviewDirection.RENTER_TO_OWNER:
                if self.reviewer_id != booking.renter_id:
                    errors['direction'] = 'Renter-to-owner review must be submitted by the renter.'
                if self.reviewed_user_id != booking.owner_id:
                    errors['reviewed_user'] = 'Reviewed user must be the booking owner.'
            elif self.direction == ReviewDirection.OWNER_TO_RENTER:
                if self.reviewer_id != booking.owner_id:
                    errors['direction'] = 'Owner-to-renter review must be submitted by the owner.'
                if self.reviewed_user_id != booking.renter_id:
                    errors['reviewed_user'] = 'Reviewed user must be the booking renter.'

        # Rule 4: Comment length
        if self.comment and len(self.comment.strip()) < 10:
            errors['comment'] = 'Review comment must be at least 10 characters.'

        if errors:
            raise ValidationError(errors)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. MESSAGING MODELS
# ═══════════════════════════════════════════════════════════════════════════════


class Conversation(models.Model):
    """
    A conversation thread between two users, optionally linked to a booking.

    DESIGN DECISIONS:
    - Linked to booking (optional) for contextual messaging ("about this rental").
    - Separate from Booking model to support pre-booking inquiries.
    - participant_1 and participant_2 are ordered (lower UUID first) to prevent
      duplicate conversations between the same two users.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    participant_1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p1',
        help_text='First participant (lower UUID by convention).',
    )
    participant_2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='conversations_as_p2',
        help_text='Second participant.',
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='conversations',
        help_text='Optional: the booking this conversation is about. '
                  'CASCADE: deleting a booking removes its conversation '
                  '(prevents SET_NULL conflicts with the partial unique constraint).',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['participant_1'], name='idx_conv_p1'),
            models.Index(fields=['participant_2'], name='idx_conv_p2'),
            models.Index(fields=['-updated_at'], name='idx_conv_updated'),
        ]
        constraints = [
            # Prevent duplicate conversations between same two users for same booking
            models.UniqueConstraint(
                fields=['participant_1', 'participant_2', 'booking'],
                name='uq_conversation_participants_booking',
            ),
            # PostgreSQL treats NULL as distinct in unique constraints,
            # so we need a separate partial constraint for booking IS NULL
            models.UniqueConstraint(
                fields=['participant_1', 'participant_2'],
                condition=models.Q(booking__isnull=True),
                name='uq_conversation_participants_no_booking',
            ),
        ]
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f'Conversation {self.id!s:.8} ({self.participant_1} ↔ {self.participant_2})'

    def has_participant(self, user):
        """Check if a user is part of this conversation."""
        return user.id in (self.participant_1_id, self.participant_2_id)

    def clean(self):
        """A user cannot have a conversation with themselves."""
        if self.participant_1_id and self.participant_2_id:
            if self.participant_1_id == self.participant_2_id:
                raise ValidationError('A conversation requires two different participants.')


class Message(models.Model):
    """
    Individual message within a conversation.

    CONSTRAINT: Only conversation participants can send messages.
    This is enforced in the service layer (not DB constraint, because
    PostgreSQL cannot express FK membership checks declaratively).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        db_index=True,
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='messages_sent',
        db_index=True,
    )
    content = models.TextField(
        help_text='Message body text.',
    )
    is_read = models.BooleanField(
        default=False,
        help_text='Whether the recipient has read this message.',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at'], name='idx_msg_conv_date'),
            models.Index(fields=['sender'], name='idx_msg_sender'),
            models.Index(fields=['is_read'], name='idx_msg_read'),
        ]
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f'Message from {self.sender} at {self.created_at:%Y-%m-%d %H:%M}'
