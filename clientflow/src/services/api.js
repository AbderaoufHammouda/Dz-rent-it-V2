/**
 * DZ-RentIt — API Service Layer
 * ==============================
 * 
 * ARCHITECTURE DECISION:
 * All API calls are abstracted behind service functions.
 * Currently uses a mock adapter (simulates network delay + returns mock data).
 * When the real backend is ready, ONLY this file changes — zero component edits.
 * 
 * This pattern is critical for:
 * 1. Decoupling UI from data layer
 * 2. Enabling easy backend swap during integration
 * 3. Simulating realistic async flows (loading states, errors)
 * 4. Defending architecture choices during soutenance
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MOCK_DELAY = 600; // ms — simulate network latency

// ─── HTTP Client ────────────────────────────────────────────────────────────

/**
 * Base fetch wrapper with auth token injection and error handling.
 * When backend is ready, this becomes the single connection point.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('dz_rentit_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  // ── MOCK MODE: Simulate API with delay ──
  // Remove this block when connecting to real backend
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return mockRequest(endpoint, config);
  }

  // ── REAL MODE: Uncomment when backend ready ──
  // const response = await fetch(`${API_BASE}${endpoint}`, config);
  // if (response.status === 401) {
  //   localStorage.removeItem('dz_rentit_token');
  //   window.location.href = '/login';
  //   throw new Error('Session expired');
  // }
  // if (!response.ok) {
  //   const error = await response.json().catch(() => ({}));
  //   throw new ApiError(error.message || 'Request failed', response.status, error);
  // }
  // return response.json();
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// ─── Mock Request Adapter ───────────────────────────────────────────────────

/** @type {Map<string, Function>} */
const mockHandlers = new Map();

function registerMock(method, pattern, handler) {
  mockHandlers.set(`${method}:${pattern}`, handler);
}

async function mockRequest(endpoint, config) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const method = (config.method || 'GET').toUpperCase();
  
  // Try exact match first, then pattern match
  for (const [key, handler] of mockHandlers) {
    const [m, pattern] = key.split(':');
    if (m !== method) continue;
    
    const regex = new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`);
    const match = endpoint.match(regex);
    if (match) {
      const params = match.slice(1);
      const body = config.body ? JSON.parse(config.body) : null;
      return handler({ params, body, endpoint });
    }
  }

  throw new ApiError(`Mock not found: ${method} ${endpoint}`, 404, {});
}

// ─── Lazy import mock data (avoids circular deps) ──────────────────────────

let _mockData = null;
async function getMockData() {
  if (!_mockData) {
    _mockData = await import('../data/mockData.js');
  }
  return _mockData;
}

// ─── Register Mock Handlers ─────────────────────────────────────────────────

// Auth
registerMock('POST', '/auth/login', async ({ body }) => {
  const data = await getMockData();
  const user = data.owners[0]; // Simulate logged-in user
  return { user: { ...user, email: body.email }, token: 'mock-jwt-token-' + Date.now() };
});

registerMock('POST', '/auth/register', async ({ body }) => {
  return {
    user: { id: 'new-' + Date.now(), name: body.name, email: body.email, avatar: '', rating: 0, reviewCount: 0, verified: false },
    token: 'mock-jwt-token-' + Date.now(),
  };
});

registerMock('GET', '/auth/me', async () => {
  const data = await getMockData();
  return { user: { ...data.owners[0], email: 'demo@dzrentit.com' } };
});

// Items
registerMock('GET', '/items', async () => {
  const data = await getMockData();
  return { items: data.items, total: data.items.length };
});

registerMock('GET', '/items/:id', async ({ params }) => {
  const data = await getMockData();
  const item = data.items.find((i) => i.id === params[0]);
  if (!item) throw new ApiError('Item not found', 404, {});
  return { item };
});

registerMock('POST', '/items', async ({ body }) => {
  return { item: { id: 'item-' + Date.now(), ...body, createdAt: new Date().toISOString() } };
});

registerMock('PUT', '/items/:id', async ({ params, body }) => {
  const data = await getMockData();
  const item = data.items.find((i) => i.id === params[0]);
  return { item: { ...item, ...body } };
});

registerMock('DELETE', '/items/:id', async ({ params }) => {
  return { success: true, itemId: params[0] };
});

// Bookings
registerMock('GET', '/bookings', async () => {
  const data = await getMockData();
  return { bookings: data.bookings };
});

registerMock('POST', '/bookings', async ({ body }) => {
  return {
    booking: {
      id: 'booking-' + Date.now(),
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  };
});

registerMock('PATCH', '/bookings/:id/approve', async ({ params }) => {
  return { booking: { id: params[0], status: 'approved', approvedAt: new Date().toISOString() } };
});

registerMock('PATCH', '/bookings/:id/reject', async ({ params }) => {
  return { booking: { id: params[0], status: 'rejected', rejectedAt: new Date().toISOString() } };
});

registerMock('PATCH', '/bookings/:id/cancel', async ({ params }) => {
  return { booking: { id: params[0], status: 'cancelled', cancelledAt: new Date().toISOString() } };
});

// Reviews
registerMock('GET', '/items/:id/reviews', async ({ params }) => {
  const data = await getMockData();
  const reviews = data.reviews.filter((r) => r.itemId === params[0]);
  return { reviews };
});

registerMock('POST', '/reviews', async ({ body }) => {
  return { review: { id: 'review-' + Date.now(), ...body, createdAt: new Date().toISOString() } };
});

// Messages
registerMock('GET', '/conversations', async () => {
  const data = await getMockData();
  return { conversations: data.conversations || [] };
});

registerMock('GET', '/conversations/:id/messages', async () => {
  const data = await getMockData();
  return { messages: data.messages || [] };
});

registerMock('POST', '/conversations/:id/messages', async ({ body }) => {
  return { message: { id: 'msg-' + Date.now(), ...body, createdAt: new Date().toISOString(), read: false } };
});

// Availability
registerMock('GET', '/items/:id/availability', async ({ params }) => {
  const data = await getMockData();
  const avail = data.availabilityData?.[params[0]] || {};
  return { availability: avail };
});

registerMock('PATCH', '/items/:id/availability', async ({ params, body }) => {
  return { success: true, itemId: params[0], dates: body.dates };
});

// Categories
registerMock('GET', '/categories', async () => {
  const data = await getMockData();
  return { categories: data.categories };
});

// ─── Exported API Service Functions ─────────────────────────────────────────

export const authAPI = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  
  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  
  me: () => request('/auth/me'),
};

export const itemsAPI = {
  getAll: (params) => request('/items'),
  getById: (id) => request(`/items/${id}`),
  create: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/items/${id}`, { method: 'DELETE' }),
};

export const bookingsAPI = {
  getAll: () => request('/bookings'),
  create: (data) => request('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id) => request(`/bookings/${id}/approve`, { method: 'PATCH' }),
  reject: (id) => request(`/bookings/${id}/reject`, { method: 'PATCH' }),
  cancel: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
};

export const reviewsAPI = {
  getForItem: (itemId) => request(`/items/${itemId}/reviews`),
  create: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
};

export const messagesAPI = {
  getConversations: () => request('/conversations'),
  getMessages: (conversationId) => request(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, data) =>
    request(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
};

export const availabilityAPI = {
  getForItem: (itemId) => request(`/items/${itemId}/availability`),
  update: (itemId, dates) =>
    request(`/items/${itemId}/availability`, { method: 'PATCH', body: JSON.stringify({ dates }) }),
};

export const categoriesAPI = {
  getAll: () => request('/categories'),
};
