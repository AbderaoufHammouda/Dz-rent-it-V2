"""
DZ-RentIt — Admin Configuration
=================================
Registers all core models with Django admin for easy data inspection.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User,
    Category,
    Item,
    ItemImage,
    Booking,
    Review,
    Conversation,
    Message,
)


# ═══════════════════════════════════════════════════════════════════════════════
# USER ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom user admin with additional fields."""

    list_display = (
        'email', 'username', 'get_full_name', 'is_verified',
        'rating_avg', 'review_count', 'is_staff', 'created_at',
    )
    list_filter = ('is_verified', 'is_staff', 'is_active', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-created_at',)

    # Add custom fields to the admin form
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('phone', 'bio', 'avatar', 'location'),
        }),
        ('Platform', {
            'fields': ('is_verified', 'rating_avg', 'review_count'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Profile', {
            'fields': ('email', 'phone', 'location'),
        }),
    )
    readonly_fields = ('rating_avg', 'review_count')


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'full_path')
    list_filter = ('parent',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


# ═══════════════════════════════════════════════════════════════════════════════
# ITEM + IMAGES ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1
    fields = ('image', 'is_cover', 'order')


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'owner', 'category', 'price_per_day',
        'deposit_amount', 'condition', 'is_active', 'created_at',
    )
    list_filter = ('is_active', 'condition', 'category', 'created_at')
    search_fields = ('title', 'description', 'owner__email')
    inlines = [ItemImageInline]
    readonly_fields = ('id', 'created_at', 'updated_at')


# ═══════════════════════════════════════════════════════════════════════════════
# BOOKING ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'short_id', 'item', 'renter', 'owner', 'status',
        'start_date', 'end_date', 'total_days', 'final_total', 'created_at',
    )
    list_filter = ('status', 'created_at', 'start_date')
    search_fields = ('item__title', 'renter__email', 'owner__email')
    readonly_fields = (
        'id', 'total_days', 'base_total', 'discount_rate',
        'discount_amount', 'final_total', 'deposit',
        'created_at', 'updated_at',
    )
    date_hierarchy = 'created_at'

    @admin.display(description='ID')
    def short_id(self, obj):
        return str(obj.id)[:8]


# ═══════════════════════════════════════════════════════════════════════════════
# REVIEW ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'reviewer', 'reviewed_user', 'direction',
        'rating', 'booking', 'created_at',
    )
    list_filter = ('direction', 'rating', 'created_at')
    search_fields = ('reviewer__email', 'reviewed_user__email', 'comment')
    readonly_fields = ('id', 'created_at')


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGING ADMIN
# ═══════════════════════════════════════════════════════════════════════════════


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ('sender', 'content', 'is_read', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        'short_id', 'participant_1', 'participant_2',
        'booking', 'created_at', 'updated_at',
    )
    search_fields = ('participant_1__email', 'participant_2__email')
    inlines = [MessageInline]
    readonly_fields = ('id', 'created_at', 'updated_at')

    @admin.display(description='ID')
    def short_id(self, obj):
        return str(obj.id)[:8]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('sender__email', 'content')
    readonly_fields = ('id', 'created_at')
