"""
DZ-RentIt — API Views
========================

THIN VIEWS — all business logic lives in core/services.py.

Views are responsible for:
1. Deserializing request data via serializers
2. Calling the appropriate service function
3. Serializing the response
4. Setting permission classes

Views do NOT:
- Contain business logic
- Directly create/update model instances (except simple CRUD on Item)
- Handle domain exception translation (that's in exception_handler.py)
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from core.models import Category, Item, ItemImage, Booking, Review, Conversation, Message
from core.enums import BookingStatus
from core import services

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CategorySerializer,
    ItemListSerializer,
    ItemDetailSerializer,
    ItemWriteSerializer,
    ItemImageSerializer,
    BookingCreateSerializer,
    BookingSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    ConversationSerializer,
    AvailabilityQuerySerializer,
)
from .permissions import IsOwnerOrReadOnly, IsBookingParticipant, IsConversationParticipant

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════════════════
# 1. AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/

    Creates a new user account and returns user data.
    JWT tokens are obtained separately via /api/auth/login/.
    """

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/me/  → current user profile
    PUT  /api/auth/me/  → update profile
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CATEGORY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/categories/
    GET /api/categories/{id}/

    Read-only — categories are managed via admin.
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Categories are few — no pagination needed


# ═══════════════════════════════════════════════════════════════════════════════
# 3. ITEM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class ItemViewSet(viewsets.ModelViewSet):
    """
    GET    /api/items/              → list (public, filtered, paginated)
    GET    /api/items/{id}/         → detail (public)
    POST   /api/items/              → create (auth required)
    PUT    /api/items/{id}/         → update (owner only)
    DELETE /api/items/{id}/         → delete (owner only)
    GET    /api/items/{id}/availability/  → blocked dates
    GET    /api/items/{id}/reviews/       → reviews for this item
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['price_per_day', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'availability', 'reviews'):
            return [AllowAny()]
        if self.action == 'create':
            return [IsAuthenticated()]
        # update, partial_update, destroy
        return [IsAuthenticated(), IsOwnerOrReadOnly()]

    def get_queryset(self):
        qs = Item.objects.select_related('owner', 'category')

        # Public views only show active items (owner sees all their own)
        if self.action == 'list':
            qs = qs.filter(is_active=True)

        # Prefetch images for list views
        qs = qs.prefetch_related(
            Prefetch('images', queryset=ItemImage.objects.order_by('order'))
        )

        # ── Manual filtering (simple and transparent) ──
        params = self.request.query_params
        category = params.get('category')
        if category:
            qs = qs.filter(category_id=category)

        min_price = params.get('min_price')
        if min_price:
            qs = qs.filter(price_per_day__gte=min_price)

        max_price = params.get('max_price')
        if max_price:
            qs = qs.filter(price_per_day__lte=max_price)

        location = params.get('location')
        if location:
            qs = qs.filter(location__icontains=location)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ItemListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ItemWriteSerializer
        return ItemDetailSerializer

    def perform_create(self, serializer):
        """Set owner from authenticated user."""
        serializer.save(owner=self.request.user)

    # ── Custom actions ──

    @action(detail=True, methods=['get'], url_path='availability')
    def availability(self, request, pk=None):
        """
        GET /api/items/{id}/availability/?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD

        Returns active bookings that overlap with the queried range.
        """
        query_ser = AvailabilityQuerySerializer(data=request.query_params)
        query_ser.is_valid(raise_exception=True)

        blocked = services.get_item_availability(
            item_id=pk,
            from_date=query_ser.validated_data['from_date'],
            to_date=query_ser.validated_data['to_date'],
        )
        return Response(list(blocked))

    @action(detail=True, methods=['get'], url_path='reviews')
    def reviews(self, request, pk=None):
        """
        GET /api/items/{id}/reviews/

        Returns all reviews for bookings of this item.
        """
        reviews = (
            Review.objects
            .filter(booking__item_id=pk)
            .select_related('reviewer', 'reviewed_user')
            .order_by('-created_at')
        )
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. BOOKING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class BookingViewSet(viewsets.GenericViewSet):
    """
    Booking operations — all mutations go through the service layer.

    POST   /api/bookings/              → create booking
    GET    /api/bookings/my/           → user's bookings
    GET    /api/bookings/{id}/         → booking detail
    PATCH  /api/bookings/{id}/approve/ → owner approves
    PATCH  /api/bookings/{id}/reject/  → owner rejects
    PATCH  /api/bookings/{id}/cancel/  → either party cancels
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Booking.objects
            .select_related('item', 'renter', 'owner')
            .filter(Q(renter=self.request.user) | Q(owner=self.request.user))
        )

    def create(self, request):
        """
        POST /api/bookings/

        Delegates to services.create_booking().
        Domain exceptions (overlap, self-booking, etc.) are caught
        by the custom exception handler → proper HTTP status codes.
        """
        ser = BookingCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        booking = services.create_booking(
            renter=request.user,
            item_id=ser.validated_data['item_id'],
            start_date=ser.validated_data['start_date'],
            end_date=ser.validated_data['end_date'],
        )

        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        """GET /api/bookings/{id}/ — only participants can view."""
        booking = self.get_object()
        return Response(BookingSerializer(booking).data)

    @action(detail=False, methods=['get'], url_path='my')
    def my_bookings(self, request):
        """
        GET /api/bookings/my/?role=renter|owner|both

        Returns the current user's bookings filtered by role.
        """
        role = request.query_params.get('role', 'both')
        bookings = services.get_user_bookings(request.user, role=role)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    # ── State transitions — thin wrappers around transition_booking() ──

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve(self, request, pk=None):
        """PATCH /api/bookings/{id}/approve/ — owner approves."""
        booking = services.transition_booking(pk, BookingStatus.APPROVED, request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'], url_path='reject')
    def reject(self, request, pk=None):
        """PATCH /api/bookings/{id}/reject/ — owner rejects."""
        booking = services.transition_booking(pk, BookingStatus.REJECTED, request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'], url_path='cancel')
    def cancel(self, request, pk=None):
        """PATCH /api/bookings/{id}/cancel/ — either party cancels."""
        booking = services.transition_booking(pk, BookingStatus.CANCELLED, request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'], url_path='complete')
    def complete(self, request, pk=None):
        """PATCH /api/bookings/{id}/complete/ — owner marks completed."""
        booking = services.transition_booking(pk, BookingStatus.COMPLETED, request.user)
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['patch'], url_path='payment-pending')
    def payment_pending(self, request, pk=None):
        """PATCH /api/bookings/{id}/payment-pending/ — owner marks payment pending."""
        booking = services.transition_booking(pk, BookingStatus.PAYMENT_PENDING, request.user)
        return Response(BookingSerializer(booking).data)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. REVIEW ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class ReviewViewSet(viewsets.GenericViewSet):
    """
    POST /api/reviews/ → create review (delegates to service)
    """

    permission_classes = [IsAuthenticated]

    def create(self, request):
        """
        POST /api/reviews/

        Delegates to services.create_review().
        Service determines direction, validates eligibility, prevents duplicates.
        """
        ser = ReviewCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        review = services.create_review(
            booking_id=ser.validated_data['booking_id'],
            reviewer=request.user,
            rating=ser.validated_data['rating'],
            comment=ser.validated_data['comment'],
        )

        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 6. MESSAGING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class ConversationViewSet(viewsets.GenericViewSet):
    """
    GET  /api/conversations/                     → user's conversations
    GET  /api/conversations/{booking_id}/         → conversation for a booking
    POST /api/conversations/{booking_id}/messages/ → send message
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects
            .filter(Q(participant_1=user) | Q(participant_2=user))
            .select_related('participant_1', 'participant_2', 'booking')
            .prefetch_related('messages')
        )

    def list(self, request):
        """GET /api/conversations/ — all conversations for the current user."""
        qs = self.get_queryset().order_by('-updated_at')
        serializer = ConversationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path=r'by-booking/(?P<booking_id>[^/.]+)')
    def by_booking(self, request, booking_id=None):
        """
        GET /api/conversations/by-booking/{booking_id}/

        Returns the conversation + messages for a specific booking.
        Creates the conversation if it doesn't exist yet.
        """
        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only booking participants can access
        if request.user.pk not in (booking.renter_id, booking.owner_id):
            return Response(
                {'error': 'You are not a participant of this booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation = services.get_or_create_conversation(
            user_1=booking.renter,
            user_2=booking.owner,
            booking=booking,
        )

        # Mark messages as read for the requester
        services.mark_messages_read(conversation.pk, request.user)

        messages = (
            conversation.messages
            .select_related('sender')
            .order_by('created_at')
        )

        return Response({
            'conversation': ConversationSerializer(conversation).data,
            'messages': MessageSerializer(messages, many=True).data,
        })

    @action(
        detail=False,
        methods=['post'],
        url_path=r'by-booking/(?P<booking_id>[^/.]+)/messages',
    )
    def send_message(self, request, booking_id=None):
        """
        POST /api/conversations/by-booking/{booking_id}/messages/

        Sends a message in the conversation for the given booking.
        """
        ser = MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only booking participants can send messages
        if request.user.pk not in (booking.renter_id, booking.owner_id):
            return Response(
                {'error': 'You are not a participant of this booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation = services.get_or_create_conversation(
            user_1=booking.renter,
            user_2=booking.owner,
            booking=booking,
        )

        message = services.send_message(
            conversation_id=conversation.pk,
            sender=request.user,
            content=ser.validated_data['content'],
        )

        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 7. PRICING PREVIEW
# ═══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([AllowAny])
def price_preview(request, item_id):
    """
    GET /api/items/{id}/price-preview/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

    Returns a pricing breakdown without creating a booking.
    Useful for the frontend to show pricing before the user commits.
    """
    try:
        item = Item.objects.get(pk=item_id)
    except Item.DoesNotExist:
        return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    if not start_date or not end_date:
        return Response(
            {'error': 'start_date and end_date query params are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pricing = services.calculate_rental_price(item.price_per_day, start, end)

    return Response({
        'item_id': str(item.pk),
        'price_per_day': str(item.price_per_day),
        'deposit_amount': str(item.deposit_amount),
        **{k: str(v) if hasattr(v, 'quantize') else v for k, v in pricing.items()},
    })
