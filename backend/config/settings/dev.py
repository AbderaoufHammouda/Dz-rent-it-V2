"""
DZ-RentIt — Development Settings
==================================
Extends base.py with development-friendly defaults.
Activated by default (no DJANGO_ENV needed).
"""

from .base import *  # noqa: F401,F403
from .base import env

# ── Debug ────────────────────────────────────────────────────────────────────
DEBUG = True

ALLOWED_HOSTS = ['*']

# ── CORS — allow everything in development ───────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

# ── Email — console backend for development ──────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ── Logging — more verbose in development ────────────────────────────────────
LOGGING['loggers']['django']['level'] = 'DEBUG'  # noqa: F405
LOGGING['loggers']['core']['level'] = 'DEBUG'    # noqa: F405
