/**
 * DZ-RentIt — API Service Layer
 * ==============================
 *
 * ARCHITECTURE DECISION:
 * All API calls are abstracted behind service functions.
 * Hooks/components call these exported objects; they never touch axios directly.
 * If the backend contract changes, ONLY this file changes — zero component edits.
 *
 * Each entity has a normalizer that converts snake_case backend fields
 * to the camelCase shape the UI already expects.
 */

import api, { ACCESS_KEY, REFRESH_KEY } from '../api/axios.js';

// ─── Error helpers ──────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/** Extract a user-friendly message from an axios error response. */
function extractError(err) {
  const d = err.response?.data;
  if (!d) return err.message || 'Something went wrong';
  if (typeof d.error === 'string') return d.error;
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d === 'object') {
    const msgs = [];
    for (const [key, val] of Object.entries(d)) {
      if (Array.isArray(val)) msgs.push(`${key}: ${val.join(', ')}`);
      else if (typeof val === 'string') msgs.push(val);
    }
    if (msgs.length) return msgs.join('. ');
  }
  return err.message || 'Something went wrong';
}

/** Wrap an axios call: unwrap .data on success, throw ApiError on failure. */
async function request(fn) {
  try {
    const response = await fn();
    return response.data;
  } catch (err) {
    throw new ApiError(
      extractError(err),
      err.response?.status || 500,
      err.response?.data || {},
    );
  }
}

// ─── Normalizers ────────────────────────────────────────────────────────────
// Convert Django snake_case → frontend camelCase shape.

function normalizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name:
      u.first_name && u.last_name
        ? `${u.first_name} ${u.last_name}`.trim()
        : u.username || '',
    username: u.username,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    avatar: u.avatar || '',
    rating: parseFloat(u.rating_avg) || 0,
    reviewCount: u.review_count || 0,
    verified: u.is_verified || false,
    phone: u.phone || '',
    bio: u.bio || '',
    location: u.location || '',
    memberSince: u.created_at
      ? new Date(u.created_at).getFullYear().toString()
      : '',
    createdAt: u.created_at,
  };
}

function normalizeItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    category: (item.category_name || '').toLowerCase(),
    categoryId: item.category,
    categoryName: item.category_name || '',
    price: parseFloat(item.price_per_day) || 0,
    deposit: parseFloat(item.deposit_amount) || 0,
    location: item.location || '',
    condition: item.condition || '',
    available: item.is_active !== false,
    owner: normalizeUser(item.owner),
    ownerId: item.owner?.id,
    images:
      item.images?.map((img) => (typeof img === 'string' ? img : img.image)) ||
      (item.cover_image ? [item.cover_image] : []),
    coverImage: item.cover_image || (item.images?.[0]?.image ?? ''),
    rating: parseFloat(item.owner?.rating_avg) || 0,
    reviewCount: item.owner?.review_count || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function normalizeBooking(b) {
  if (!b) return null;
  return {
    id: b.id,
    item: b.item_title
      ? { id: b.item, title: b.item_title }
      : typeof b.item === 'object'
        ? normalizeItem(b.item)
        : { id: b.item },
    itemId: typeof b.item === 'object' ? b.item?.id : b.item,
    renter: normalizeUser(b.renter),
    renterId: b.renter?.id,
    owner: normalizeUser(b.owner),
    ownerId: b.owner?.id,
    startDate: b.start_date,
    endDate: b.end_date,
    status: b.status,
    totalDays: b.total_days,
    baseTotal: parseFloat(b.base_total) || 0,
    discountRate: parseFloat(b.discount_rate) || 0,
    discountAmount: parseFloat(b.discount_amount) || 0,
    finalTotal: parseFloat(b.final_total) || 0,
    deposit: parseFloat(b.deposit) || 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

function normalizeReview(r) {
  if (!r) return null;
  return {
    id: r.id,
    bookingId: r.booking,
    reviewer: normalizeUser(r.reviewer),
    reviewerId: r.reviewer?.id,
    reviewedUser: normalizeUser(r.reviewed_user),
    targetUserId: r.reviewed_user?.id,
    direction: r.direction,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

function normalizeMessage(m) {
  if (!m) return null;
  return {
    id: m.id,
    senderId: m.sender,
    senderName: m.sender_username || '',
    text: m.content,
    read: m.is_read ?? false,
    createdAt: m.created_at,
  };
}

function normalizeConversation(c) {
  if (!c) return null;
  return {
    id: c.id,
    participants: [c.participant_1?.id, c.participant_2?.id].filter(Boolean),
    participant1: normalizeUser(c.participant_1),
    participant2: normalizeUser(c.participant_2),
    bookingId: c.booking,
    lastMessage: c.last_message ? normalizeMessage(c.last_message) : null,
    unreadCount: c.unread_count || 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/** Extract array from a DRF response (handles paginated & unpaginated). */
function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export const authAPI = {
  /**
   * POST /auth/login/ → {access, refresh}
   * Then GET /auth/me/ → user profile.
   * Returns {user, token} for AuthContext compatibility.
   */
  login: async (email, password) => {
    const tokens = await request(() =>
      api.post('/auth/login/', { email, password }),
    );
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);

    const userData = await request(() => api.get('/auth/me/'));
    const user = normalizeUser(userData);
    localStorage.setItem('dz_rentit_user', JSON.stringify(user));
    return { user, token: tokens.access };
  },

  /**
   * POST /auth/register/ → 201 (user created)
   * Then auto-login to obtain tokens.
   */
  register: async (name, email, password) => {
    await request(() =>
      api.post('/auth/register/', {
        username: name.toLowerCase().replace(/\s+/g, '_'),
        email,
        password,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
      }),
    );
    // Auto-login after successful registration
    return authAPI.login(email, password);
  },

  /** GET /auth/me/ → current user profile. */
  me: async () => {
    const data = await request(() => api.get('/auth/me/'));
    return { user: normalizeUser(data) };
  },

  /** PUT /auth/me/ → update profile. */
  updateProfile: async (updates) => {
    const payload = {};
    if (updates.name) {
      payload.first_name = updates.name.split(' ')[0] || updates.name;
      payload.last_name = updates.name.split(' ').slice(1).join(' ') || '';
    }
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.location !== undefined) payload.location = updates.location;
    const data = await request(() => api.put('/auth/me/', payload));
    return { user: normalizeUser(data) };
  },
};

// ─── Items API ──────────────────────────────────────────────────────────────

export const itemsAPI = {
  /** GET /items/ → paginated list. */
  getAll: async (params) => {
    const data = await request(() => api.get('/items/', { params }));
    const results = unwrapList(data);
    return { items: results.map(normalizeItem), total: data.count || results.length };
  },

  /** GET /items/{id}/ → single item detail. */
  getById: async (id) => {
    const data = await request(() => api.get(`/items/${id}/`));
    return { item: normalizeItem(data) };
  },

  /** POST /items/ — convert frontend field names to backend. */
  create: async (itemData) => {
    const payload = {
      title: itemData.title,
      description: itemData.description,
      category: itemData.categoryId || itemData.category,
      condition: itemData.condition,
      price_per_day: itemData.price,
      deposit_amount: itemData.deposit,
      location: itemData.location,
    };
    const data = await request(() => api.post('/items/', payload));
    return { item: normalizeItem(data) };
  },

  /** PUT /items/{id}/ */
  update: async (id, itemData) => {
    const payload = {};
    if (itemData.title !== undefined) payload.title = itemData.title;
    if (itemData.description !== undefined) payload.description = itemData.description;
    if (itemData.categoryId || itemData.category) payload.category = itemData.categoryId || itemData.category;
    if (itemData.condition !== undefined) payload.condition = itemData.condition;
    if (itemData.price !== undefined) payload.price_per_day = itemData.price;
    if (itemData.deposit !== undefined) payload.deposit_amount = itemData.deposit;
    if (itemData.location !== undefined) payload.location = itemData.location;
    if (itemData.available !== undefined) payload.is_active = itemData.available;
    const data = await request(() => api.put(`/items/${id}/`, payload));
    return { item: normalizeItem(data) };
  },

  /** DELETE /items/{id}/ */
  delete: async (id) => {
    await request(() => api.delete(`/items/${id}/`));
    return { success: true };
  },
};

// ─── Bookings API ───────────────────────────────────────────────────────────

export const bookingsAPI = {
  /** GET /bookings/my/?role= → user's bookings. */
  getAll: async (role = 'both') => {
    const data = await request(() =>
      api.get('/bookings/my/', { params: { role } }),
    );
    const results = unwrapList(data);
    return { bookings: results.map(normalizeBooking) };
  },

  /** GET /bookings/{id}/ */
  getById: async (id) => {
    const data = await request(() => api.get(`/bookings/${id}/`));
    return { booking: normalizeBooking(data) };
  },

  /** POST /bookings/ — only item_id + dates; backend calculates pricing. */
  create: async ({ itemId, startDate, endDate }) => {
    const data = await request(() =>
      api.post('/bookings/', {
        item_id: itemId,
        start_date: startDate,
        end_date: endDate,
      }),
    );
    return { booking: normalizeBooking(data) };
  },

  approve: async (id) => {
    const data = await request(() => api.patch(`/bookings/${id}/approve/`));
    return { booking: normalizeBooking(data) };
  },

  reject: async (id) => {
    const data = await request(() => api.patch(`/bookings/${id}/reject/`));
    return { booking: normalizeBooking(data) };
  },

  cancel: async (id) => {
    const data = await request(() => api.patch(`/bookings/${id}/cancel/`));
    return { booking: normalizeBooking(data) };
  },

  complete: async (id) => {
    const data = await request(() => api.patch(`/bookings/${id}/complete/`));
    return { booking: normalizeBooking(data) };
  },

  paymentPending: async (id) => {
    const data = await request(() =>
      api.patch(`/bookings/${id}/payment-pending/`),
    );
    return { booking: normalizeBooking(data) };
  },
};

// ─── Reviews API ────────────────────────────────────────────────────────────

export const reviewsAPI = {
  /** GET /items/{id}/reviews/ → plain array. */
  getForItem: async (itemId) => {
    const data = await request(() => api.get(`/items/${itemId}/reviews/`));
    const results = unwrapList(data);
    return { reviews: results.map(normalizeReview) };
  },

  /** POST /reviews/ — only booking_id + rating + comment. */
  create: async (params) => {
    const data = await request(() =>
      api.post('/reviews/', {
        booking_id: params.bookingId,
        rating: params.rating,
        comment: params.comment,
      }),
    );
    return { review: normalizeReview(data) };
  },
};

// ─── Messages API ───────────────────────────────────────────────────────────

export const messagesAPI = {
  /** GET /conversations/ → list of user's conversations. */
  getConversations: async () => {
    const data = await request(() => api.get('/conversations/'));
    const results = unwrapList(data);
    return { conversations: results.map(normalizeConversation) };
  },

  /** GET /conversations/by-booking/{bookingId}/ → {conversation, messages}. */
  getByBooking: async (bookingId) => {
    const data = await request(() =>
      api.get(`/conversations/by-booking/${bookingId}/`),
    );
    return {
      conversation: normalizeConversation(data.conversation),
      messages: (data.messages || []).map(normalizeMessage),
    };
  },

  /** POST /conversations/by-booking/{bookingId}/messages/ */
  sendMessage: async (bookingId, { content }) => {
    const data = await request(() =>
      api.post(`/conversations/by-booking/${bookingId}/messages/`, { content }),
    );
    return { message: normalizeMessage(data) };
  },
};

// ─── Availability API ───────────────────────────────────────────────────────

export const availabilityAPI = {
  /** GET /items/{id}/availability/?from_date=&to_date= */
  getForItem: async (itemId, fromDate, toDate) => {
    const data = await request(() =>
      api.get(`/items/${itemId}/availability/`, {
        params: { from_date: fromDate, to_date: toDate },
      }),
    );
    return { availability: data };
  },
};

// ─── Categories API ─────────────────────────────────────────────────────────

export const categoriesAPI = {
  /** GET /categories/ — no pagination. */
  getAll: async () => {
    const data = await request(() => api.get('/categories/'));
    const results = unwrapList(data);
    return { categories: results };
  },
};
