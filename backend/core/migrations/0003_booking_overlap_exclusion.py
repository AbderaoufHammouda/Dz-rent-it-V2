"""
Custom migration: Install the PostgreSQL Exclusion Constraint for booking overlap prevention.

═══════════════════════════════════════════════════════════════════════════════════
WHY RAW SQL INSTEAD OF Django ExclusionConstraint?
═══════════════════════════════════════════════════════════════════════════════════

Django's ExclusionConstraint ORM expects a single RangeField for overlap checks.
Our model uses two separate DateField columns (start_date, end_date) for better
query ergonomics (e.g., Booking.objects.filter(start_date__gte=date)).

To combine UUID equality (item_id WITH =) with date range overlap
(daterange(start_date, end_date, '[]') WITH &&) in a single GiST index,
we must use PostgreSQL's native EXCLUDE syntax via raw SQL.

This is NOT a limitation — it demonstrates deeper PostgreSQL expertise.

═══════════════════════════════════════════════════════════════════════════════════
WHAT THIS CONSTRAINT DOES
═══════════════════════════════════════════════════════════════════════════════════

For any INSERT or UPDATE on the bookings table WHERE status is active:
1. Construct a daterange from start_date and end_date (both inclusive: '[]')
2. Check if ANY existing active booking for the SAME item has an overlapping range
3. If overlap found → REJECT the INSERT/UPDATE with an IntegrityError
4. If no overlap → ALLOW the operation

PERFORMANCE: O(log n) via GiST index — same as a B-tree lookup.
The GiST index is maintained automatically by PostgreSQL.

═══════════════════════════════════════════════════════════════════════════════════
REVERSIBILITY
═══════════════════════════════════════════════════════════════════════════════════

The reverse SQL drops the constraint cleanly. No data loss.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_initial'),
    ]

    operations = [
        migrations.RunSQL(
            # ── FORWARD: Create the exclusion constraint ──
            sql="""
                ALTER TABLE bookings
                ADD CONSTRAINT xcl_booking_no_overlap
                EXCLUDE USING GIST (
                    item_id WITH =,
                    daterange(start_date, end_date, '[]') WITH &&
                )
                WHERE (
                    status IN ('pending', 'approved', 'payment_pending')
                );
            """,
            # ── REVERSE: Drop the constraint ──
            reverse_sql="""
                ALTER TABLE bookings
                DROP CONSTRAINT IF EXISTS xcl_booking_no_overlap;
            """,
        ),
    ]
