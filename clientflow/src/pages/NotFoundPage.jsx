/**
 * DZ-RentIt — 404 Not Found Page
 * ================================
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="text-8xl font-display font-extrabold gradient-text mb-4">404</div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">
            Page not found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-colors shadow-glow"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-50 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
            >
              <Search className="w-4 h-4" />
              Browse Items
            </Link>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
