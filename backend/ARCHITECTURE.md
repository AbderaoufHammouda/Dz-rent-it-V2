# DZ-RentIt — Backend Architecture & Defense Guide

## Table of Contents
1. [Technology Stack](#1-technology-stack)
2. [Database Schema Overview](#2-database-schema-overview)
3. [Model Design Decisions](#3-model-design-decisions)
4. [Overlap Prevention (Critical)](#4-overlap-prevention-critical)
5. [Concurrency Safety](#5-concurrency-safety)
6. [Pricing System](#6-pricing-system)
7. [Review System](#7-review-system)
8. [Messaging System](#8-messaging-system)
9. [State Machine (Booking Lifecycle)](#9-state-machine-booking-lifecycle)
10. [Constraint Summary](#10-constraint-summary)
11. [Index Strategy](#11-index-strategy)
12. [Anticipated Defense Questions](#12-anticipated-defense-questions)

---

## 1. Technology Stack

| Component | Choice | Justification |
|-----------|--------|---------------|
| **Framework** | Django 5.1 | Mature, batteries-included, ORM with PostgreSQL-native support |
| **Database** | PostgreSQL | Exclusion constraints, GiST indexes, ACID compliance, `daterange()` type |
| **Auth** | AbstractUser | Extends Django's battle-tested auth (password hashing, sessions, groups) |
| **Primary Keys** | UUID v4 | Non-sequential (no ID guessing), distributed-safe |
| **Financial fields** | `DecimalField` | NOT `FloatField` — avoids IEEE 754 floating-point precision loss |

### Why PostgreSQL over SQLite?

SQLite lacks:
- **Exclusion constraints** — cannot prevent booking overlaps at DB level
- **`daterange()` type** — no native range overlap operator (`&&`)
- **`SELECT FOR UPDATE`** — no row-level locking for concurrency
- **GiST indexes** — no support for composite range+equality indexing
- **Concurrent writes** — SQLite uses database-level locking (one writer at a time)

---

## 2. Database Schema Overview

```
┌─────────────┐
│    User      │ ← AbstractUser + UUID PK + rating_avg (denormalized)
├─────────────┤
│ id (UUID)    │───────────────────┐
│ email (uniq) │                   │
│ rating_avg   │ ← denormalized    │
│ review_count │ ← denormalized    │
└──────┬───┬──┘                    │
       │   │                       │
  owns │   │ rents                 │
       │   │                       │
┌──────▼───▼──┐  ┌───────────┐    │
│    Item      │  │ Category   │    │
├─────────────┤  ├───────────┤    │
│ id (UUID)    │  │ id (int)   │    │
│ owner_id ────┤  │ parent_id ─┤◄── self-FK (tree)
│ category_id ─┤──│ slug (uniq)│    │
│ price_per_day│  └───────────┘    │
│ deposit      │                    │
│ is_active    │  ┌───────────┐    │
└──────┬───┬──┘  │ ItemImage  │    │
       │   │     ├───────────┤    │
       │   └─────│ item_id    │    │
       │         │ image      │    │
       │         │ is_cover   │    │
       │         └───────────┘    │
       │                           │
┌──────▼──────────────────────────▼────┐
│              Booking                  │
├──────────────────────────────────────┤
│ id (UUID)                             │
│ item_id ──── FK to Item               │
│ renter_id ── FK to User (renter)      │
│ owner_id ─── FK to User (denorm.)     │
│ start_date ┐                          │
│ end_date   ┘ ← ExclusionConstraint   │
│ status ────── BookingStatus enum      │
│ total_days, base_total, final_total   │ ← pricing snapshot
│ deposit ──── snapshot at booking time │
├──────────────────────────────────────┤
│ CONSTRAINTS:                          │
│ • ck_booking_date_order               │
│ • ck_booking_no_self_booking          │
│ • ck_booking_min_duration             │
│ • xcl_booking_no_overlap (GiST)      │ ← CRITICAL
└──────┬───────────────────────────────┘
       │
       ├─── has many ──► Review
       │                 • UniqueConstraint (1 per direction per booking)
       │                 • rating 1–5 (CheckConstraint)
       │
       └─── has many ──► Conversation ──► Message
                         • UniqueConstraint (participants + booking)
```

---

## 3. Model Design Decisions

### 3.1 Custom User (AbstractUser)

**Why AbstractUser over AbstractBaseUser?**
- Inherits 200+ lines of tested auth infrastructure (password hashing, sessions, permissions)
- Still allows adding custom fields (phone, bio, avatar, location, rating_avg)
- `USERNAME_FIELD = 'email'` → email-based login without losing admin compatibility

**Denormalized `rating_avg` and `review_count`:**
- Profile pages are viewed 100× more than reviews are written
- Computing `AVG()` on every profile view = O(n) per request
- Denormalized fields = O(1) read, updated only when reviews change
- Updated atomically in `_update_user_rating()` service function

### 3.2 Category (Self-Referencing FK)

**Why self-FK over MPTT/django-treebeard?**
- Zero external dependencies — self-contained
- For < 100 categories, recursive Python traversal is fast
- PostgreSQL `WITH RECURSIVE` CTE can traverse the tree in a single query
- MPTT adds `lft`/`rght`/`tree_id` columns and complex rebuild logic
- Simpler to explain and defend at soutenance

### 3.3 Item

**Why `SET_NULL` on category FK?**
- Deleting a category should NOT delete all its items
- Items become uncategorized, not destroyed
- Owner can reassign category later

**Why separate `deposit_amount`?**
- Separate from price — different lifecycle (refunded after safe return)
- Snapshot stored in Booking for audit trail (price may change after booking)

### 3.4 Booking — Owner denormalization

**Why store `owner_id` separately?**
- Most booking queries need the owner (dashboard, notifications, stats)
- Without denormalization: `JOIN bookings ON items WHERE items.owner_id = ?`
- With denormalization: `WHERE bookings.owner_id = ?` — no join needed
- Set automatically from `item.owner` in `create_booking()` service

---

## 4. Overlap Prevention (Critical)

### The Problem

> "User A books a camera from Jan 3–5. User B should NOT be able to book the same camera for Jan 4–6."

This is a **constraint satisfaction problem** that MUST be enforced at the database level.

### Solution: PostgreSQL Exclusion Constraint

```sql
ALTER TABLE bookings
ADD CONSTRAINT xcl_booking_no_overlap
EXCLUDE USING GIST (
    item_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('pending', 'approved', 'payment_pending'));
```

### How It Works

1. **GiST Index**: A Generalized Search Tree that supports both equality (`=`) and range overlap (`&&`) operators in a single composite index.

2. **`btree_gist` Extension**: Adds GiST operator classes for scalar types (UUID, VARCHAR), allowing them to participate alongside range types.

3. **`daterange(start_date, end_date, '[]')`**: Constructs a closed date range (both bounds inclusive). Jan 3–5 means days 3, 4, and 5 are all occupied.

4. **`&&` (Overlaps)**: Two ranges overlap iff `A.start ≤ B.end AND B.start ≤ A.end`.

5. **`WHERE` Clause**: Only active bookings (pending, approved, payment_pending) block dates. Rejected/cancelled/completed bookings are ignored.

### Comparison with Alternative: Calendar Table

| Aspect | Exclusion Constraint | Calendar Table |
|--------|---------------------|---------------|
| **Overlap detection** | O(log n) via GiST | O(days) per booking |
| **Storage** | 1 row per booking | 1 row per day per booking |
| **Data integrity** | DB-enforced, atomic | Application-enforced |
| **Race condition safety** | Kernel-level | Requires app locking |
| **Complexity** | 1 constraint | Trigger + table + cleanup cron |

**Verdict**: Exclusion constraint is superior for daily-granularity rentals. Calendar table would be preferred only for per-day variable pricing or hourly rentals.

---

## 5. Concurrency Safety

### The Race Condition Problem

```
Time    Transaction A              Transaction B
────    ──────────────             ──────────────
T1      Check: Jan 3-5 free? ✓
T2                                 Check: Jan 3-5 free? ✓
T3      INSERT booking (Jan 3-5)
T4                                 INSERT booking (Jan 3-5)  ← DOUBLE BOOKING!
```

### Defense-in-Depth Solution (3 Layers)

```python
@transaction.atomic
def create_booking(renter, item_id, start_date, end_date):
    # Layer 1: SELECT FOR UPDATE — serializes concurrent requests
    item = Item.objects.select_for_update().get(pk=item_id)
    
    # Layer 2: Application validation (user-friendly errors)
    ...
    
    # Layer 3: ExclusionConstraint — DB kernel rejects overlaps
    try:
        booking = Booking.objects.create(...)
    except IntegrityError as e:
        if 'xcl_booking_no_overlap' in str(e):
            raise BookingOverlapError()
        raise
```

**How it prevents the race condition:**

```
Time    Transaction A                    Transaction B
────    ──────────────                   ──────────────
T1      BEGIN
T2      SELECT FOR UPDATE item_id=X
        (acquires ROW EXCLUSIVE lock)
T3                                       BEGIN
T4                                       SELECT FOR UPDATE item_id=X
                                         (BLOCKED — waiting for lock)
T5      INSERT booking ✓
T6      COMMIT (lock released)
T7                                       (acquires lock)
T8                                       INSERT booking
                                         ← xcl_booking_no_overlap REJECTS
T9                                       ROLLBACK
```

### Isolation Level

**READ COMMITTED** (PostgreSQL default) is sufficient because:
- `SELECT FOR UPDATE` provides row-level serialization
- The exclusion constraint catches any remaining edge cases
- We don't need SERIALIZABLE (which would add SSI overhead)

---

## 6. Pricing System

### Dynamic Computation

```python
def calculate_rental_price(price_per_day, start_date, end_date):
    total_days = (end_date - start_date).days + 1  # INCLUSIVE
    base_total = price_per_day × total_days
    
    # Duration-based discounts
    if total_days >= 30: discount = 20%
    elif total_days >= 7: discount = 10%
    else: discount = 0%
    
    final_total = base_total × (1 - discount)
```

### Why +1 (Inclusive Counting)?

Renting from Jan 3 to Jan 5 occupies **3 days** (3rd, 4th, 5th), not 2.
This matches:
- User expectation ("I pick it up on the 3rd and return it on the 5th")
- The `'[]'` (closed range) in the exclusion constraint
- Standard hotel booking convention

### Pricing Snapshot in Booking

When a booking is created, the pricing is **computed and stored**:
- `total_days`, `base_total`, `discount_rate`, `discount_amount`, `final_total`
- `deposit` (snapshot of `item.deposit_amount`)

**Why snapshot?** The item's price may change after booking. The booking's financial terms must be immutable — this is an audit trail requirement.

---

## 7. Review System

### Double-Direction Reviews

Each completed booking allows **two reviews**:
1. **Renter → Owner**: "Was the owner responsive? Item as described?"
2. **Owner → Renter**: "Did the renter return the item in good condition?"

This is enforced by:
- `direction` field (RENTER_TO_OWNER or OWNER_TO_RENTER)
- `UniqueConstraint(fields=['booking', 'reviewer', 'direction'])` — prevents duplicates

### Review Eligibility Rules

1. **Booking must be completed** — no reviews for cancelled/pending bookings
2. **Reviewer must be a participant** — only renter or owner
3. **Direction must match role** — renter can only submit renter→owner reviews
4. **One review per direction per booking** — enforced by DB UniqueConstraint
5. **Rating 1–5** — enforced by DB CheckConstraint

### Denormalized User Rating

After each review, `_update_user_rating()` recalculates:
```python
stats = Review.objects.filter(reviewed_user=user).aggregate(
    avg_rating=Avg('rating'),
    total_count=Count('id'),
)
user.rating_avg = stats['avg_rating']
user.review_count = stats['total_count']
user.save(update_fields=['rating_avg', 'review_count'])
```

---

## 8. Messaging System

### Architecture

```
Conversation (1) ──►(N) Message
    │
    ├── participant_1 (FK → User)
    ├── participant_2 (FK → User)
    └── booking (FK → Booking, nullable)
```

**Ordering convention**: `participant_1` has the lower UUID string.
This prevents A↔B and B↔A being stored as separate conversations.

**UniqueConstraint**: `(participant_1, participant_2, booking)` — one conversation per user pair per booking (or per pair with `booking=NULL` for general messaging).

---

## 9. State Machine (Booking Lifecycle)

```
                    ┌───────────┐
                    │  PENDING   │ ← initial state
                    └─────┬─────┘
                          │
                ┌─────────┼─────────┐
                ▼         ▼         ▼
          ┌──────────┐ ┌─────────┐ ┌──────────┐
          │ APPROVED │ │REJECTED │ │CANCELLED │
          └────┬─────┘ └─────────┘ └──────────┘
               │        (terminal)   (terminal)
               ▼
        ┌─────────────────┐
        │ PAYMENT_PENDING  │
        └────────┬────────┘
                 │
           ┌─────┼─────┐
           ▼           ▼
     ┌──────────┐ ┌──────────┐
     │COMPLETED │ │CANCELLED │
     └──────────┘ └──────────┘
      (terminal)   (terminal)
```

### Valid Transitions (from `enums.py`)

| From | To |
|------|----|
| PENDING | APPROVED, REJECTED, CANCELLED |
| APPROVED | PAYMENT_PENDING, CANCELLED |
| PAYMENT_PENDING | COMPLETED, CANCELLED |
| REJECTED | — (terminal) |
| CANCELLED | — (terminal) |
| COMPLETED | — (terminal) |

### Authorization

| Action | Who can do it |
|--------|--------------|
| APPROVE / REJECT | Owner only |
| CANCEL | Either party |
| PAYMENT_PENDING / COMPLETE | Owner only |

### Expiration

Pending bookings expire after **48 hours**. Expired bookings cannot be approved (raises `BookingExpiredError`).

---

## 10. Constraint Summary

| Constraint | Type | Table | Purpose |
|-----------|------|-------|---------|
| `ck_item_price_non_negative` | CHECK | items | price_per_day ≥ 0 |
| `ck_item_deposit_non_negative` | CHECK | items | deposit_amount ≥ 0 |
| `ck_booking_date_order` | CHECK | bookings | start_date < end_date |
| `ck_booking_no_self_booking` | CHECK | bookings | renter ≠ owner |
| `ck_booking_min_duration` | CHECK | bookings | total_days ≥ 1 |
| `xcl_booking_no_overlap` | EXCLUDE (GiST) | bookings | No overlapping active bookings |
| `uq_review_one_per_direction` | UNIQUE | reviews | 1 review per direction per booking |
| `ck_review_rating_range` | CHECK | reviews | 1 ≤ rating ≤ 5 |
| `uq_conversation_participants_booking` | UNIQUE | conversations | 1 conversation per pair per booking |

---

## 11. Index Strategy

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_user_email` | users | email | Login lookup |
| `idx_user_verified` | users | is_verified | Filter verified users |
| `idx_user_created` | users | -created_at | Recent users list |
| `idx_category_parent` | categories | parent_id | Tree traversal |
| `idx_category_slug` | categories | slug | URL lookup |
| `idx_item_owner` | items | owner_id | "My items" dashboard |
| `idx_item_category` | items | category_id | Category browse |
| `idx_item_active_date` | items | is_active, -created_at | Homepage listing |
| `idx_item_price` | items | price_per_day | Price range filter |
| `idx_item_location` | items | location | Location filter |
| `idx_booking_item_status` | bookings | item_id, status | Calendar availability |
| `idx_booking_renter` | bookings | renter_id | "My rentals" |
| `idx_booking_owner` | bookings | owner_id | "My listing bookings" |
| `idx_booking_status` | bookings | status | Status filter |
| `idx_booking_dates` | bookings | start_date, end_date | Date range queries |
| `idx_booking_created` | bookings | -created_at | Recent bookings |
| `idx_review_*` | reviews | various | Review lookups |
| `idx_msg_conv_date` | messages | conversation, created_at | Chat timeline |
| `idx_conv_updated` | conversations | -updated_at | Inbox sorting |

---

## 12. Anticipated Defense Questions

### Q: "Why PostgreSQL instead of SQLite?"
**A**: SQLite cannot enforce booking overlap prevention at the database level. It lacks exclusion constraints, `daterange()` type, `SELECT FOR UPDATE`, and GiST indexes. For a rental platform where double-booking is a critical bug, database-level enforcement is non-negotiable.

### Q: "Why not use a DateRangeField instead of separate start_date/end_date?"
**A**: Separate DateFields provide better query ergonomics (`filter(start_date__gte=...)`) and are more familiar to Django developers. The exclusion constraint is applied via raw SQL migration to combine both fields into a `daterange()` at the database level — best of both worlds.

### Q: "How do you prevent two users from booking the same dates simultaneously?"
**A**: Three layers of defense:
1. `SELECT FOR UPDATE` locks the item row — serializes concurrent requests
2. ExclusionConstraint with GiST index — PostgreSQL kernel rejects overlaps
3. Application validation — user-friendly error messages

Even if layers 1 and 3 fail, layer 2 (database constraint) is authoritative.

### Q: "Why is pricing stored in the booking instead of computed dynamically?"
**A**: The booking's financial terms must be immutable. If the item's price changes after booking, the original agreed-upon price is preserved. This is an audit trail requirement — you can always prove what the renter agreed to pay.

### Q: "Why denormalize `rating_avg` instead of computing it with AVG()?"
**A**: Read optimization. Profile pages are viewed 100× more than reviews are written. Computing `AVG()` on every profile view is O(n). The denormalized field is O(1) read, updated only when a review is created — classic read-heavy optimization.

### Q: "Why `transaction.atomic` + `select_for_update` if you already have an ExclusionConstraint?"
**A**: Defense-in-depth. The exclusion constraint is the safety net; `select_for_update` provides predictable serialization. Without it, concurrent requests would both attempt INSERT and one would get an IntegrityError — a worse UX than blocking briefly while the lock is held.

### Q: "Why UUIDs instead of auto-increment integers?"
**A**: 
1. No sequential ID guessing (security: `/api/bookings/1` vs `/api/bookings/f47ac10b-...`)
2. Can be generated client-side without DB round-trip
3. Distributed-safe (no coordination between servers)
4. Standard in modern API design (matches frontend expectations)

### Q: "Why are reviews linked to Booking instead of Item?"
**A**: Prevents fake reviews. A review MUST be backed by a completed transaction. Linking to Booking proves the reviewer actually rented (or owned) the item for that specific period. Also enables double-direction reviews (renter↔owner) per transaction.

### Q: "What happens if a category is deleted?"
**A**: `on_delete=models.CASCADE` on the self-FK means deleting a parent category deletes all its children. But `on_delete=models.SET_NULL` on Item.category means items in a deleted category become uncategorized (not deleted).

### Q: "Why is the exclusion constraint in a raw SQL migration?"
**A**: Django's `ExclusionConstraint` ORM requires a single `DateRangeField` for overlap checks. Our model uses two separate `DateField` columns for better query ergonomics. The raw SQL migration uses PostgreSQL's native `daterange(start_date, end_date, '[]')` to construct the range at the database level — demonstrating deeper PostgreSQL knowledge while maintaining a clean Django model API.
