"""
Custom migration: Install btree_gist PostgreSQL extension.

REQUIRED FOR: ExclusionConstraint on Booking model (xcl_booking_no_overlap).

WHAT IS btree_gist?
─────────────────────────────────────────────────────────────────────
PostgreSQL's GiST (Generalized Search Tree) index type natively supports
range types and geometric types, but NOT scalar types like UUID and VARCHAR.

The btree_gist extension adds GiST operator classes for scalar types,
allowing them to participate in ExclusionConstraints alongside range types.

In our case, we need:
  - item_id (UUID) WITH = (equality via GiST)
  - daterange(start_date, end_date) WITH && (overlap via GiST)

Without btree_gist, PostgreSQL cannot combine UUID equality and date range
overlap in a single GiST index, and the ExclusionConstraint would fail.

THIS MIGRATION MUST RUN BEFORE 0001_initial (which creates the Booking table).
Django handles this via the `dependencies` list — this migration has no deps,
so it runs first.

POSTGRESQL PRIVILEGE REQUIREMENT:
Creating extensions requires the PostgreSQL superuser or a user with
CREATE privilege on the database. In development, the 'postgres' user has this.
In production, run: GRANT CREATE ON DATABASE dbname TO username;
"""

from django.db import migrations
from django.contrib.postgres.operations import BtreeGistExtension


class Migration(migrations.Migration):

    # No dependencies — this must run before any model migration
    dependencies = []

    operations = [
        BtreeGistExtension(),
    ]
