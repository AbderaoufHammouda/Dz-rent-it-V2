# ══════════════════════════════════════════════════════════════
#  DZ-RentIt — Production Dockerfile
# ══════════════════════════════════════════════════════════════
#  Multi-stage build:
#    Stage 1 (builder)  — compile C-extension wheels
#    Stage 2 (runtime)  — slim image, non-root, healthcheck
#
#  Build:  docker build -t dz-rentit .
#  Run:    docker run -p 8000:8000 --env-file .env dz-rentit
# ══════════════════════════════════════════════════════════════

# ── Stage 1: Build dependencies ──────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

# Install build-time system libs (C headers for psycopg2, Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        libjpeg62-turbo-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Production runtime ──────────────────────────────
FROM python:3.12-slim

LABEL maintainer="DZ-RentIt Team" \
      description="DZ-RentIt Django API — production image"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings \
    DJANGO_ENV=production

WORKDIR /app

# Install only runtime system libs (no compilers)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libjpeg62-turbo \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder
COPY --from=builder /install /usr/local

# Copy project source
COPY . .

# Collect static files at build time.
# Use DJANGO_ENV=dev so prod.py's SECRET_KEY / ALLOWED_HOSTS guards
# don't fire — collectstatic needs neither a real key nor a database.
RUN DJANGO_ENV=dev \
    python manage.py collectstatic --noinput

# ── Non-root user ────────────────────────────────────────────
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

# ── Port & healthcheck ───────────────────────────────────────
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:8000/health/ || exit 1

# ── Entrypoint — Gunicorn ────────────────────────────────────
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
