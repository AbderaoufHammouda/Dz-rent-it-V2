"""
DZ-RentIt — Management Command: import_categories_from_csv
=============================================================

Imports rental categories from a CSV file into the database.
Supports hierarchical categories via a `parent_slug` column.

CSV FORMAT:
─────────────────────────────────────────────────────────────────
name,slug,parent_slug,icon
Électronique,electronique,,laptop
Smartphones,smartphones,electronique,smartphone
Ordinateurs Portables,ordinateurs-portables,electronique,laptop
Véhicules,vehicules,,car
Voitures,voitures,vehicules,car
Motos,motos,vehicules,bike
Outillage,outillage,,wrench
─────────────────────────────────────────────────────────────────

USAGE:
    # Import from a CSV file
    python manage.py import_categories_from_csv categories.csv

    # Dry run — validate without inserting
    python manage.py import_categories_from_csv categories.csv --dry-run

    # Update existing categories (match by slug)
    python manage.py import_categories_from_csv categories.csv --update

DESIGN:
- Idempotent: running twice with --update doesn't create duplicates
- Parent resolution: parent_slug must reference an existing or earlier row
- Transaction-safe: all-or-nothing import
- UTF-8 encoding: supports French characters (é, è, ê, etc.)
"""

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from core.models import Category


class Command(BaseCommand):
    help = 'Import categories from a CSV file (name, slug, parent_slug, icon).'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Path to the CSV file to import.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate the CSV without inserting into the database.',
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing categories matched by slug instead of skipping them.',
        )

    def handle(self, *args, **options):
        csv_path = Path(options['csv_file'])
        dry_run = options['dry_run']
        update = options['update']

        if not csv_path.exists():
            raise CommandError(f'CSV file not found: {csv_path}')

        # Read and validate CSV
        rows = self._read_csv(csv_path)

        if not rows:
            raise CommandError('CSV file is empty or has no valid rows.')

        self.stdout.write(f'Found {len(rows)} row(s) in {csv_path.name}.')

        # Validate all rows before importing
        errors = self._validate_rows(rows)
        if errors:
            for err in errors:
                self.stderr.write(self.style.ERROR(f'  {err}'))
            raise CommandError(f'{len(errors)} validation error(s). Fix the CSV and retry.')

        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN] Validation passed. No data modified.'))
            for row in rows:
                parent_info = f' (parent: {row["parent_slug"]})' if row.get('parent_slug') else ''
                self.stdout.write(f'  [OK] {row["name"]} [{row["slug"]}]{parent_info}')
            return

        # Import within a transaction
        created, updated, skipped = self._import_rows(rows, update=update)

        self.stdout.write(self.style.SUCCESS(
            f'Import complete: {created} created, {updated} updated, {skipped} skipped.'
        ))

    def _read_csv(self, csv_path: Path) -> list[dict]:
        """Read CSV file and return list of row dicts."""
        rows = []
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            # Validate required columns
            required = {'name', 'slug'}
            if not required.issubset(set(reader.fieldnames or [])):
                raise CommandError(
                    f'CSV must have at least columns: {", ".join(sorted(required))}. '
                    f'Found: {", ".join(reader.fieldnames or [])}'
                )

            for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
                # Clean whitespace
                cleaned = {k.strip(): (v.strip() if v else '') for k, v in row.items()}

                # Auto-generate slug if empty
                if not cleaned.get('slug'):
                    cleaned['slug'] = slugify(cleaned.get('name', ''))

                cleaned['_line'] = i
                rows.append(cleaned)

        return rows

    def _validate_rows(self, rows: list[dict]) -> list[str]:
        """Validate all rows and return list of error messages."""
        errors = []
        seen_slugs = set()

        for row in rows:
            line = row['_line']

            if not row.get('name'):
                errors.append(f'Line {line}: missing "name" column.')

            if not row.get('slug'):
                errors.append(f'Line {line}: missing "slug" (and auto-generation failed).')

            slug = row.get('slug', '')
            if slug in seen_slugs:
                errors.append(f'Line {line}: duplicate slug "{slug}" in CSV.')
            seen_slugs.add(slug)

            # Validate parent_slug references exist in CSV or in DB
            parent_slug = row.get('parent_slug', '')
            if parent_slug:
                if parent_slug not in seen_slugs and not Category.objects.filter(slug=parent_slug).exists():
                    # Check if it appears later in the CSV (two-pass would fix, but we require ordering)
                    errors.append(
                        f'Line {line}: parent_slug "{parent_slug}" not found '
                        f'in database or in preceding CSV rows. '
                        f'Ensure parent categories are listed before children.'
                    )

        return errors

    @transaction.atomic
    def _import_rows(self, rows: list[dict], update: bool = False) -> tuple[int, int, int]:
        """Import rows into the database. Returns (created, updated, skipped) counts."""
        created = 0
        updated = 0
        skipped = 0

        # Cache for parent lookup within this import
        slug_cache: dict[str, Category] = {}

        for row in rows:
            slug = row['slug']
            name = row['name']
            icon = row.get('icon', '')
            parent_slug = row.get('parent_slug', '')

            # Resolve parent
            parent = None
            if parent_slug:
                parent = slug_cache.get(parent_slug) or Category.objects.filter(slug=parent_slug).first()
                if not parent:
                    # Should not happen after validation, but defensive
                    self.stderr.write(self.style.WARNING(
                        f'  [WARN] Skipping "{name}": parent "{parent_slug}" not found.'
                    ))
                    skipped += 1
                    continue

            # Check if category already exists
            existing = Category.objects.filter(slug=slug).first()

            if existing:
                if update:
                    existing.name = name
                    existing.icon = icon
                    existing.parent = parent
                    existing.save()
                    slug_cache[slug] = existing
                    updated += 1
                    self.stdout.write(f'  [UPD] Updated: {name} [{slug}]')
                else:
                    slug_cache[slug] = existing
                    skipped += 1
                    self.stdout.write(f'  [SKIP] Skipped (exists): {name} [{slug}]')
            else:
                cat = Category.objects.create(
                    name=name,
                    slug=slug,
                    icon=icon,
                    parent=parent,
                )
                slug_cache[slug] = cat
                created += 1
                self.stdout.write(f'  [NEW] Created: {name} [{slug}]')

        return created, updated, skipped
