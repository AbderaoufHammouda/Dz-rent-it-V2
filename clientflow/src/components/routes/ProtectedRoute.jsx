/**
 * DZ-RentIt — Protected Route Component
 * =======================================
 * 
 * Wraps routes that require authentication.
 * If user is not authenticated → redirects to /login with return URL.
 * Shows a loading skeleton while auth state is resolving to prevent flash.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { motion } from 'framer-motion';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Auth state still resolving (initial token validation)
  // Show a branded loading state instead of flashing login page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow animate-pulse">
            <span className="text-white font-bold text-sm">DZ</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-500"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated → redirect to login, preserve intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Authenticated → render the protected content
  return children;
}
