"""
DZ-RentIt — API Serializers
===============================

Serializers handle:
1. Input validation (deserialize request data)
2. Output formatting (serialize model instances to JSON)
3. Field-level control (read-only, write-only, computed)

DESIGN:
- No business logic here — that lives in services.py
- Serializers validate shape/type; services validate business rules
- Nested serializers for read; flat IDs for write
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.models import Category, Item, ItemImage, Booking, Review, Conversation, Message

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════════════════
# USER SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class UserSerializer(serializers.ModelSerializer):
    """Public user representation — excludes sensitive fields."""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'bio', 'avatar', 'location',
            'rating_avg', 'review_count', 'is_verified',
            'created_at',
        ]
        read_only_fields = ['id', 'rating_avg', 'review_count', 'is_verified', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """Registration input — accepts password, creates user."""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        """Use create_user() to hash the password properly."""
        return User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════════


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'icon']


# ═══════════════════════════════════════════════════════════════════════════════
# ITEM SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class ItemImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemImage
        fields = ['id', 'image', 'is_cover', 'order', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class ItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — avoids N+1 on images."""

    owner = UserSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'title', 'price_per_day', 'deposit_amount',
            'location', 'condition', 'is_active',
            'owner', 'category', 'category_name', 'cover_image',
            'created_at',
        ]

    def get_cover_image(self, obj):
        """Return URL of the cover image (or first image)."""
        images = getattr(obj, '_prefetched_images', None)
        if images is None:
            img = obj.images.filter(is_cover=True).first() or obj.images.first()
        else:
            img = next((i for i in images if i.is_cover), None)
            if img is None and images:
                img = images[0]
        if img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None


class ItemDetailSerializer(serializers.ModelSerializer):
    """Full item detail including all images."""

    owner = UserSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    images = ItemImageSerializer(many=True, read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'title', 'description', 'price_per_day', 'deposit_amount',
            'location', 'condition', 'is_active',
            'owner', 'category', 'category_name', 'images',
            'created_at', 'updated_at',
        ]


class ItemWriteSerializer(serializers.ModelSerializer):
    """Write serializer — owner is set from request.user in the view."""

    class Meta:
        model = Item
        fields = [
            'title', 'description', 'category', 'condition',
            'price_per_day', 'deposit_amount', 'location',
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# BOOKING SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class BookingCreateSerializer(serializers.Serializer):
    """
    Input for booking creation.
    NOT a ModelSerializer — we delegate creation to create_booking() service.
    """

    item_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.',
            })
        return data


class BookingSerializer(serializers.ModelSerializer):
    """Read serializer for booking details."""

    item_title = serializers.CharField(source='item.title', read_only=True)
    renter = UserSerializer(read_only=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'item', 'item_title', 'renter', 'owner',
            'start_date', 'end_date', 'status',
            'total_days', 'base_total', 'discount_rate',
            'discount_amount', 'final_total', 'deposit',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


# ═══════════════════════════════════════════════════════════════════════════════
# REVIEW SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class ReviewCreateSerializer(serializers.Serializer):
    """
    Input for review creation.
    Delegates to create_review() service.
    """

    booking_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(min_length=10)


class ReviewSerializer(serializers.ModelSerializer):
    """Read serializer for reviews."""

    reviewer = UserSerializer(read_only=True)
    reviewed_user = UserSerializer(read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'reviewer', 'reviewed_user',
            'direction', 'rating', 'comment', 'created_at',
        ]
        read_only_fields = fields


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGING SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_username', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_username', 'is_read', 'created_at']


class MessageCreateSerializer(serializers.Serializer):
    """Input for sending a message."""

    content = serializers.CharField(min_length=1, max_length=5000)


class ConversationSerializer(serializers.ModelSerializer):
    participant_1 = UserSerializer(read_only=True)
    participant_2 = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'participant_1', 'participant_2',
            'booking', 'last_message',
            'created_at', 'updated_at',
        ]

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return MessageSerializer(msg).data
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY SERIALIZER
# ═══════════════════════════════════════════════════════════════════════════════


class AvailabilityQuerySerializer(serializers.Serializer):
    """Query params for item availability endpoint."""

    from_date = serializers.DateField()
    to_date = serializers.DateField()

    def validate(self, data):
        if data['from_date'] > data['to_date']:
            raise serializers.ValidationError('from_date must be before to_date.')
        return data
