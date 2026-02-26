"""
DZ-RentIt — Custom DRF Permissions
=====================================

Reusable permission classes that enforce ownership and participation rules.
These are applied at the view level via `permission_classes`.

DESIGN:
- Each class checks ONE concern (Single Responsibility).
- Views compose multiple permission classes as needed.
- `has_object_permission` is called automatically by DRF on retrieve/update/delete.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission:
    - Read (GET, HEAD, OPTIONS): anyone
    - Write (PUT, PATCH, DELETE): only the object's `owner` field
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.owner_id == request.user.pk


class IsBookingParticipant(BasePermission):
    """
    Only the renter or owner of a booking can access it.
    Works on Booking objects (must have `renter_id` and `owner_id`).
    """

    def has_object_permission(self, request, view, obj):
        return request.user.pk in (obj.renter_id, obj.owner_id)


class IsConversationParticipant(BasePermission):
    """
    Only conversation participants can access messages.
    Works on Conversation objects (must have `participant_1_id` and `participant_2_id`).
    """

    def has_object_permission(self, request, view, obj):
        return obj.has_participant(request.user)
