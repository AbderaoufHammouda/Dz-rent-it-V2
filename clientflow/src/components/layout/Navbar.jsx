import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Menu, X, Sun, Moon, User, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/search', label: 'Explore' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/add-item', label: 'List Item', icon: Plus },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled || !isHome
            ? 'glass-nav shadow-sm'
            : 'bg-transparent border-b border-transparent'
          }
        `}
      >
        <div className="section">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
                <span className="text-white font-bold text-sm">DZ</span>
              </div>
              <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
                Rent<span className="gradient-text">It</span>
              </span>
            </Link>

            {/* Center: Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <motion.div
                animate={{ width: searchFocused ? '100%' : '100%' }}
                className="relative w-full"
              >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cameras, tools, gear..."
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                    bg-gray-100/80 dark:bg-dark-50/80 
                    border border-transparent
                    placeholder-gray-400 dark:placeholder-gray-500
                    text-gray-900 dark:text-gray-100
                    transition-all duration-200
                    focus:outline-none focus:bg-white dark:focus:bg-dark-100
                    focus:border-brand-300 dark:focus:border-brand-500/30
                    focus:ring-2 focus:ring-brand-500/10
                    ${searchFocused ? 'shadow-lg' : ''}
                  `}
                />
              </motion.div>
            </div>

            {/* Right: Nav + Actions */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${location.pathname === link.to
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-50'
                    }
                  `}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}

              <div className="w-px h-6 bg-gray-200 dark:bg-dark-border mx-2" />

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              {/* Notifications */}
              <button className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Auth */}
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">Sign up</Button>
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-300"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden glass border-t border-gray-200/50 dark:border-dark-border"
            >
              <div className="px-4 py-4 space-y-2">
                {/* Mobile search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="input-base pl-10"
                  />
                </div>

                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`
                      flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                      ${location.pathname === link.to
                        ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-50'
                      }
                    `}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                ))}

                <div className="pt-4 border-t border-gray-200 dark:border-dark-border flex gap-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="secondary" size="md" className="w-full">Log in</Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button variant="primary" size="md" className="w-full">Sign up</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer */}
      <div className="h-16 lg:h-[72px]" />
    </>
  );
}
