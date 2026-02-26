"""
DZ-RentIt — API URL Configuration
=====================================

URL structure:
    /api/auth/register/        POST   — create account
    /api/auth/login/           POST   — obtain JWT pair (access + refresh)
    /api/auth/login/refresh/   POST   — refresh access token
    /api/auth/me/              GET    — current user profile

    /api/categories/           GET    — list categories
    /api/categories/{id}/      GET    — category detail

    /api/items/                GET    — list items (filtered, paginated)
    /api/items/                POST   — create item
    /api/items/{id}/           GET    — item detail
    /api/items/{id}/           PUT    — update item (owner)
    /api/items/{id}/           DELETE — delete item (owner)
    /api/items/{id}/availability/    GET — blocked dates
    /api/items/{id}/reviews/         GET — item reviews
    /api/items/{id}/price-preview/   GET — pricing breakdown

    /api/bookings/             POST   — create booking
    /api/bookings/{id}/        GET    — booking detail
    /api/bookings/my/          GET    — user's bookings
    /api/bookings/{id}/approve/        PATCH
    /api/bookings/{id}/reject/         PATCH
    /api/bookings/{id}/cancel/         PATCH
    /api/bookings/{id}/complete/       PATCH
    /api/bookings/{id}/payment-pending/ PATCH

    /api/reviews/              POST   — create review

    /api/conversations/                          GET  — user's conversations
    /api/conversations/by-booking/{id}/          GET  — conversation for booking
    /api/conversations/by-booking/{id}/messages/  POST — send message
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'items', views.ItemViewSet, basename='item')
router.register(r'bookings', views.BookingViewSet, basename='booking')
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'conversations', views.ConversationViewSet, basename='conversation')

urlpatterns = [
    # ── Auth ──
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('auth/login/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/me/', views.MeView.as_view(), name='auth-me'),

    # ── Price preview (function-based — not in router) ──
    path('items/<uuid:item_id>/price-preview/', views.price_preview, name='item-price-preview'),

    # ── Router-generated URLs ──
    path('', include(router.urls)),
]
