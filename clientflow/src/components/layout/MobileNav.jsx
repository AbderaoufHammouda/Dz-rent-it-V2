import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, LayoutDashboard, User } from 'lucide-react';
import { motion } from 'framer-motion';

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Explore' },
  { to: '/add-item', icon: PlusCircle, label: 'List', isSpecial: true },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/login', icon: User, label: 'Account' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass-nav border-t border-gray-200/50 dark:border-dark-border pb-safe">
        <div className="flex items-center justify-around px-2 py-1.5">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="relative flex flex-col items-center justify-center w-16 py-1.5"
              >
                {link.isSpecial ? (
                  <div className="w-11 h-11 -mt-5 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
                    <link.icon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <link.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                )}
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-400 dark:text-gray-500'
                  } ${link.isSpecial ? 'mt-1.5' : ''}`}
                >
                  {link.label}
                </span>
                {isActive && !link.isSpecial && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-0.5 w-6 h-0.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
