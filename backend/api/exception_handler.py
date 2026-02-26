"""
DZ-RentIt — Custom DRF Exception Handler
============================================

Maps domain exceptions from the service layer to proper HTTP responses.

FLOW:
  Service raises DomainException
    → View doesn't catch it (thin views)
    → DRF exception handler catches it here
    → Returns structured JSON: {"error": "...", "detail": {...}}

This keeps views clean — they never need try/except for domain errors.
"""

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response

from core.exceptions import DomainException


def custom_exception_handler(exc, context):
    """
    Extends DRF's default handler to also handle DomainException.

    DRF default handles:
    - ValidationError → 400
    - AuthenticationFailed → 401
    - NotAuthenticated → 401
    - PermissionDenied → 403
    - NotFound → 404
    - MethodNotAllowed → 405

    We add:
    - DomainException → exc.status_code (409, 410, 422, etc.)
    """

    # Let DRF handle its own exceptions first
    response = drf_exception_handler(exc, context)

    if response is not None:
        return response

    # Handle our domain exceptions
    if isinstance(exc, DomainException):
        data = {
            'error': exc.message,
        }
        if exc.detail:
            data['detail'] = exc.detail
        return Response(data, status=exc.status_code)

    # Everything else → 500 (only in DEBUG mode will Django show traceback)
    return None
