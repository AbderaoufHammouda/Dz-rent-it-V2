"""
DZ-RentIt — Settings Package
==============================
Automatically selects dev or prod based on the DJANGO_ENV environment variable.

Usage:
    DJANGO_ENV=production  →  config.settings.prod
    DJANGO_ENV=dev (or unset) →  config.settings.dev

IMPORTANT: This file is imported when DJANGO_SETTINGS_MODULE='config.settings',
which preserves backward compatibility with manage.py, wsgi.py, asgi.py, and
all test scripts.
"""

import os

_env = os.environ.get('DJANGO_ENV', 'dev').lower()

if _env == 'production':
    from .prod import *  # noqa: F401,F403
else:
    from .dev import *   # noqa: F401,F403
