import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileNav from './components/layout/MobileNav';
import ProtectedRoute from './components/routes/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import Toast from './components/ui/Toast';
import { ToastProvider } from './components/ui/Toast';

// ── Lazy-loaded pages — code splitting for smaller initial bundle ──
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AddItemPage = lazy(() => import('./pages/AddItemPage'));
const EditItemPage = lazy(() => import('./pages/EditItemPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Branded loading fallback for Suspense */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow animate-pulse">
          <span className="text-white font-bold text-sm">DZ</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {!isAuthPage && <Navbar />}
            <Suspense fallback={<PageLoader />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/item/:id" element={<ItemDetailPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />

                  {/* Protected routes — require authentication */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/add-item" element={<ProtectedRoute><AddItemPage /></ProtectedRoute>} />
                  <Route path="/edit-item/:id" element={<ProtectedRoute><EditItemPage /></ProtectedRoute>} />
                  <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />

                  {/* 404 catch-all */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
            {!isAuthPage && <Footer />}
            {!isAuthPage && <MobileNav />}
            <Toast />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
