"""
DZ-RentIt — Production Settings
=================================
Extends base.py with security hardening.
Activated by setting DJANGO_ENV=production.
"""

import os

from .base import *  # noqa: F401,F403
from .base import env, SECRET_KEY as _SECRET_KEY

# ── Fail loudly if SECRET_KEY is still the insecure default ──────────────────
if 'insecure' in _SECRET_KEY:
    raise ValueError(
        'Production requires a proper SECRET_KEY. '
        'Generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )

# ── Debug ────────────────────────────────────────────────────────────────────
DEBUG = False

ALLOWED_HOSTS = env('ALLOWED_HOSTS')
if not ALLOWED_HOSTS:
    raise ValueError('ALLOWED_HOSTS must be set in production (comma-separated).')

# ── CORS — restricted in production ─────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS')

# ── Security hardening ──────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SECURE_HSTS_SECONDS = 31_536_000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── Email — SMTP in production ───────────────────────────────────────────────
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@dzrentit.com')

# ── Logging — production level ───────────────────────────────────────────────
LOGGING['loggers']['django']['level'] = 'WARNING'  # noqa: F405
LOGGING['loggers']['core']['level'] = 'INFO'       # noqa: F405
