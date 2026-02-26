# DZ-RentIt — Architecture & Defense Guide

## 1. Technology Stack & Justification

| Technology | Version | Why |
|---|---|---|
| **React 18** | 18.2 | Component-based UI, huge ecosystem, dominant industry standard |
| **Vite 5** | 5.x | 10x faster HMR vs CRA/Webpack, ESM-native, zero-config |
| **Tailwind CSS 3.4** | 3.4 | Utility-first → zero CSS bloat, consistent design tokens, tree-shakable |
| **Framer Motion** | Latest | Declarative animations, AnimatePresence for exit animations, production-proven |
| **React Router DOM 6** | 6.x | Industry-standard SPA routing, data-loading pattern support |
| **date-fns 3.2** | 3.2 | Tree-shakable (vs moment.js), pure functions, immutable |
| **Context API** | Built-in | Auth is a single concern → no Redux/Zustand overhead needed |

**Why NOT TypeScript?** JSDoc types provide IntelliSense without compilation step. For a prototype/MVP, this reduces build complexity while maintaining type safety in IDE.

---

## 2. Architecture: Layered Separation of Concerns

```
types/          → Enums, constants, JSDoc type definitions (zero runtime)
  └── index.js

utils/          → Pure functions, no side effects, unit-testable
  ├── pricing.js     — Rental pricing, discounts, formatting
  ├── dates.js       — Calendar generation, availability maps, conflict detection
  └── validation.js  — Form validation, booking validation, review validation

services/       → API abstraction layer (mock adapter pattern)
  └── api.js         — All HTTP calls abstracted; swap mock→real with one env var

context/        → Global state (auth only — minimal Context usage)
  └── AuthContext.jsx — JWT auth, auto-login, token expiration

hooks/          → Business logic (no JSX, no styling)
  ├── useBooking.js  — Booking lifecycle, state machine, conflict checks
  ├── useCalendar.js — Calendar navigation, range selection, availability
  ├── useItems.js    — CRUD operations for item listings
  ├── useMessages.js — Conversation & messaging logic
  ├── usePricing.js  — Reactive pricing computation
  ├── useRatings.js  — Double-direction review system
  └── useSearch.js   — Client-side filtering, sorting, category tree

components/     → Reusable UI (no business logic)
  ├── ui/            — Button, Modal, Input, Toast, ErrorBoundary, etc.
  ├── layout/        — Navbar, Footer, MobileNav
  └── routes/        — ProtectedRoute (auth gate)

pages/          → Route-level components (compose hooks + UI)
  ├── HomePage, SearchPage, ItemDetailPage
  ├── DashboardPage, AddItemPage, EditItemPage
  ├── LoginPage, SignupPage, MessagesPage
  └── NotFoundPage (404)
```

**Defense point:** "Each layer has a single responsibility. A page imports hooks for logic and components for UI — it never calls APIs directly or manipulates raw data."

---

## 3. Key Architectural Decisions

### 3.1 Mock API Adapter Pattern (`services/api.js`)
- All API calls go through `request()` → `mockRequest()` in development
- When backend is ready, change **ONE environment variable** (`VITE_USE_MOCK=false`) — zero component edits
- Each mock handler is registered with `registerMock(method, pattern, handler)`
- Simulates 600ms network latency for realistic loading states

**Defense point:** "We can demo the entire app without a backend, but the backend swap is a single-line config change."

### 3.2 Auth Flow
- JWT stored in `localStorage` with key `dz_rentit_token`
- `AuthProvider` wraps entire app → auth state available everywhere
- On mount: validates stored token via `authAPI.me()` → auto-login or cleanup
- `ProtectedRoute` shows branded loading while auth resolves → prevents flash
- Login/Signup call `AuthContext.login()`/`register()` → real API propagation
- Redirect preserves intended destination via `location.state.from`

### 3.3 Booking State Machine
```
pending → approved → payment_pending → completed
       → rejected
       → cancelled (from any active state)
```
- `BookingTransitions` constant defines valid transitions
- `transitionBooking()` validates legality BEFORE API call
- `isBookingExpired()` flags 48h-stale pending bookings
- Optimistic local state updates after successful API calls

### 3.4 Double-Booking Prevention
1. `validateBookingRequest()` — checks own-item blocking, date validity
2. `checkDateConflicts()` — scans availability map for RESERVED/BLOCKED dates
3. `buildAvailabilityMap()` — **status precedence:** RESERVED > PENDING > BLOCKED > AVAILABLE
4. `useCalendar.isDaySelectable()` — prevents selecting past dates or unavailable dates

### 3.5 Pricing Engine
- Pure function: `calculateRentalPrice(pricePerDay, startDate, endDate)`
- Discount tiers: 7+ days = 10%, 30+ days = 20%
- Edge cases: 0 days returns zero pricing, negative price throws TypeError
- `usePricing` hook wraps this reactively with memoization

---

## 4. Performance Optimizations

| Technique | Where | Impact |
|---|---|---|
| **React.lazy + Suspense** | App.jsx | Initial bundle 304KB (was 486KB), pages loaded on demand |
| **useMemo** | useBooking derived data, useSearch results, usePricing | Prevents recomputation on unrelated re-renders |
| **useCallback** | All hook actions | Stable references prevent child re-renders |
| **Code splitting** | Vite auto-splits per lazy route | 20+ separate JS chunks |
| **Tree-shaking** | Tailwind purge, date-fns ESM | Only used CSS/JS in final bundle |

---

## 5. Error Handling Strategy

| Layer | Mechanism |
|---|---|
| **Global** | `ErrorBoundary` wraps entire app → catches render errors, shows recovery UI |
| **Routing** | `<Route path="*">` → 404 page with navigation links |
| **Auth** | `ProtectedRoute` → redirect to /login with return URL |
| **API** | `ApiError` class with status codes; hooks catch and set error state |
| **Forms** | Client-side validation before API submission (email, password, item form, booking request, review) |
| **Calendar** | Conflict detection before booking creation; past-date prevention |

---

## 6. Remaining Backend Dependencies

When integrating a real backend, these changes are needed:

1. **`services/api.js`**: Set `VITE_USE_MOCK=false` → uncomment real-mode fetch block
2. **401 interceptor**: Uncomment the commented-out 401 handler in `request()`
3. **Token refresh**: Add refresh token rotation in `AuthContext`
4. **WebSocket**: Replace polling in `useMessages` with real-time connection
5. **File upload**: Replace placeholder photo logic in AddItemPage/EditItemPage
6. **Search**: Replace client-side filtering in `useSearch` with API-driven search
7. **Availability API**: Connect `useCalendar` to fetch real availability per item

---

## 7. Audit Summary — Fixes Implemented

| # | Severity | Bug | Fix |
|---|---|---|---|
| 1 | **CRITICAL** | LoginPage never called `AuthContext.login()` — auth was faked | Wired to `useAuth().login()` with try/catch, validation, redirect |
| 2 | **CRITICAL** | SignupPage never called `AuthContext.register()` — auth was faked | Wired to `useAuth().register()` with validation from utils |
| 3 | **HIGH** | `validateItemForm` called with wrong signature — validation bypassed | Fixed callers to pass `(step, formPayload)` for each critical step |
| 4 | **HIGH** | `handleBook` passed wrong params to `createBooking` | Now passes full `item` object + `user.id` + auth gate |
| 5 | **HIGH** | `buildAvailabilityMap` no status precedence — pending could overwrite reserved | Added STATUS_PRIORITY map, only upgrade status |
| 6 | **MEDIUM** | DashboardPage never fetched data — showed stale mock imports | Added `useEffect` calling `fetchBookings()` + `fetchItems()` |
| 7 | **MEDIUM** | useBooking derived data recomputed every render | Wrapped in `useMemo` with `[bookings]` dependency |
| 8 | **LOW** | `console.warn` in AuthContext production code | Removed |
| 9 | **ARCH** | No ErrorBoundary, no 404 route, no code splitting | Added ErrorBoundary component, NotFoundPage, React.lazy+Suspense |
| 10 | **LOW** | useRatings didn't clear error before fetch; useMessages no loading in send | Fixed both hooks |
| 11 | **MEDIUM** | Calendar allowed selecting past dates | Added `isPastDate` check in `isDaySelectable` |

---

## 8. Defense-Ready Q&A

**Q: Why Context API instead of Redux/Zustand?**
A: Auth is a single global concern. Context API provides this without adding a 3rd-party dependency. For more complex state (items, bookings), we use custom hooks with local state — each hook is its own "mini store" with clear boundaries.

**Q: Why mock API instead of a real backend?**
A: The mock adapter pattern lets us build and demo the full frontend independently. Every API call goes through `services/api.js` — switching to a real backend requires changing ONE environment variable, zero component edits.

**Q: How do you prevent double bookings?**
A: Four-layer defense: (1) Client validation blocks own-item bookings, (2) Availability map with status precedence (RESERVED > PENDING > BLOCKED), (3) Date conflict detection scans the range before submission, (4) Calendar UI disables non-selectable dates. The backend would add a 5th layer with database-level locking.

**Q: How is pricing calculated?**
A: Pure function `calculateRentalPrice()` in `utils/pricing.js`. Discount tiers: 7+ days = 10%, 30+ days = 20%. Inclusive day counting (3 Jan → 5 Jan = 3 days). The function is deterministic and unit-testable.

**Q: What security measures exist?**
A: JWT tokens with expiration checking, ProtectedRoute redirects, client-side input validation (email, password strength, booking parameters), ErrorBoundary catches unhandled errors. In production, would add CSRF tokens, rate limiting, and server-side validation.

**Q: How does the booking lifecycle work?**
A: State machine pattern: `pending → approved → payment_pending → completed`. Valid transitions are defined in `BookingTransitions` constant. `transitionBooking()` validates the transition is legal before calling the API. Pending bookings auto-expire after 48 hours.

---

*Generated during production-readiness audit. Build: 304KB JS (gzipped ~98KB), 65KB CSS (gzipped ~11KB). 42 chunks with code splitting.*
