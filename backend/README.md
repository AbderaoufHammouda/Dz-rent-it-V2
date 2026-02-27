# DZ-RentIt Backend

Django 5.1 + DRF + SimpleJWT + PostgreSQL rental platform backend.

---

## Quick Start (Development)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit with your local DB credentials
python manage.py migrate
python manage.py runserver
```

The dev server starts with `DEBUG=True`, `CORS_ALLOW_ALL_ORIGINS=True`, and console email backend.

---

## Settings Architecture

```
config/settings/
    __init__.py   # auto-selects dev or prod based on DJANGO_ENV
    base.py       # shared config (DB, DRF, JWT, logging, etc.)
    dev.py        # DEBUG=True, CORS open, console email
    prod.py       # DEBUG=False, security hardening, SMTP email
```

The settings module is selected via the `DJANGO_ENV` environment variable:

| `DJANGO_ENV`   | Settings loaded     |
|----------------|---------------------|
| `dev` (default)| `config.settings.dev` |
| `production`   | `config.settings.prod` |

All `DJANGO_SETTINGS_MODULE` references remain `config.settings` (backward-compatible).

---

## Environment Variables

All sensitive values are read from environment variables via `django-environ`.
See [.env.example](.env.example) for the full list.

Key variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DJANGO_ENV` | No | `dev` | `dev` or `production` |
| `SECRET_KEY` | **Yes (prod)** | insecure default | Django secret key |
| `DATABASE_URL` | No | `postgres://postgres:postgres@localhost:5432/dzrentit` | PostgreSQL connection URL |
| `ALLOWED_HOSTS` | **Yes (prod)** | `[]` | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | **Yes (prod)** | `[]` | Comma-separated origins |
| `ACCESS_TOKEN_LIFETIME_MINUTES` | No | `30` | JWT access token lifetime |
| `REFRESH_TOKEN_LIFETIME_DAYS` | No | `7` | JWT refresh token lifetime |
| `SECURE_SSL_REDIRECT` | No | `True` | Set `False` if PaaS handles SSL |

---

## Production Deployment Checklist

Before deploying to production (Render, Railway, etc.):

- [ ] Set `DJANGO_ENV=production`
- [ ] Generate and set `SECRET_KEY`:
  ```bash
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
- [ ] Set `DATABASE_URL` (provided by your PaaS)
- [ ] Set `ALLOWED_HOSTS` (e.g., `your-app.onrender.com`)
- [ ] Set `CORS_ALLOWED_ORIGINS` (e.g., `https://your-frontend.com`)
- [ ] Run migrations:
  ```bash
  python manage.py migrate
  ```
- [ ] Collect static files:
  ```bash
  python manage.py collectstatic --noinput
  ```
- [ ] Use gunicorn as WSGI server:
  ```bash
  gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
  ```
- [ ] Set `SECURE_SSL_REDIRECT=False` if your PaaS terminates SSL at the load balancer
- [ ] Configure email settings (`EMAIL_HOST`, `EMAIL_HOST_USER`, etc.) if needed
- [ ] Set up a cron job for `python manage.py expire_pending_bookings`
- [ ] Verify `DEBUG=False` in production (enforced by `prod.py`)

---

## API Documentation

- **36+ REST endpoints** mounted at `/api/`
- JWT authentication via `Bearer` token
- See `api/urls.py` for the full URL map

---

## Management Commands

```bash
# Expire stale pending bookings (default: 48h)
python manage.py expire_pending_bookings [--dry-run] [--hours=48]

# Import categories from CSV
python manage.py import_categories_from_csv categories.csv [--dry-run] [--update]
```
