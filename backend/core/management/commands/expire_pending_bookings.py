"""
DZ-RentIt — Management Command: expire_pending_bookings
==========================================================

Automatically cancels bookings that have been in PENDING status
for more than 48 hours without owner action.

BUSINESS RULE:
─────────────────────────────────────────────────────────────────
If a booking remains PENDING for 48 hours after creation,
it is considered expired and automatically transitions to CANCELLED.
This frees the calendar dates for other renters.
─────────────────────────────────────────────────────────────────

USAGE:
    # One-time run
    python manage.py expire_pending_bookings

    # Dry run — shows what would be expired without modifying data
    python manage.py expire_pending_bookings --dry-run

    # Cron job (recommended — every hour)
    0 * * * * cd /path/to/backend && python manage.py expire_pending_bookings

CONCURRENCY SAFETY:
- Uses select_for_update() to lock rows during expiration
- Wrapped in transaction.atomic() to prevent partial updates
- Safe to run concurrently from multiple workers

WHY 48 HOURS:
- Gives the owner enough time to review and respond
- Prevents indefinite calendar blocking by unresponded bookings
- Industry standard for peer-to-peer rental platforms
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import Booking
from core.enums import BookingStatus


class Command(BaseCommand):
    help = (
        'Expire PENDING bookings older than 48 hours. '
        'Transitions them to CANCELLED status to free calendar dates.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show which bookings would be expired without modifying data.',
        )
        parser.add_argument(
            '--hours',
            type=int,
            default=48,
            help='Number of hours after which a PENDING booking expires (default: 48).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        hours = options['hours']
        cutoff = timezone.now() - timedelta(hours=hours)

        # Find all PENDING bookings older than the cutoff
        expired_qs = Booking.objects.filter(
            status=BookingStatus.PENDING,
            created_at__lt=cutoff,
        )

        count = expired_qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'No PENDING bookings older than {hours}h found. Nothing to expire.'
            ))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'[DRY RUN] Would expire {count} booking(s):'
            ))
            for booking in expired_qs.select_related('item', 'renter'):
                age = timezone.now() - booking.created_at
                self.stdout.write(
                    f'  - {booking.id} | Item: {booking.item.title} '
                    f'| Renter: {booking.renter.email} '
                    f'| Created: {booking.created_at:%Y-%m-%d %H:%M} '
                    f'| Age: {age.total_seconds() / 3600:.1f}h'
                )
            return

        # Atomic bulk expiration with row-level locking
        with transaction.atomic():
            locked_bookings = (
                expired_qs
                .select_for_update(skip_locked=True)
                # skip_locked: if another worker is expiring the same row, skip it
            )

            updated = locked_bookings.update(
                status=BookingStatus.CANCELLED,
                updated_at=timezone.now(),
            )

        self.stdout.write(self.style.SUCCESS(
            f'Successfully expired {updated} PENDING booking(s) older than {hours}h.'
        ))
