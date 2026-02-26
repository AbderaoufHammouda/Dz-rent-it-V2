import { Link } from 'react-router-dom';
import { Heart, Github, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  const footerLinks = {
    Product: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Explore Rentals', href: '/search' },
      { label: 'List Your Item', href: '/add-item' },
      { label: 'Pricing', href: '#' },
      { label: 'Mobile App', href: '#' },
    ],
    Company: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Press', href: '#' },
      { label: 'Partners', href: '#' },
    ],
    Support: [
      { label: 'Help Center', href: '#' },
      { label: 'Safety Center', href: '#' },
      { label: 'Community', href: '#' },
      { label: 'Contact Us', href: '#' },
      { label: 'Accessibility', href: '#' },
    ],
    Legal: [
      { label: 'Terms of Service', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'Insurance', href: '#' },
    ],
  };

  return (
    <footer className="bg-white dark:bg-dark-200 border-t border-gray-200 dark:border-dark-border mt-20 pb-20 md:pb-0">
      {/* CTA Section */}
      <div className="section py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-noise opacity-5" />
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-4">
              Start renting or earning today
            </h2>
            <p className="text-brand-100 max-w-xl mx-auto mb-8 text-lg">
              Join thousands of people who are already saving money and earning passive income through DZ-RentIt.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/search"
                className="px-8 py-3.5 rounded-xl bg-white text-brand-700 font-semibold hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore Rentals
              </Link>
              <Link
                to="/add-item"
                className="px-8 py-3.5 rounded-xl bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                List Your First Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Links Grid */}
      <div className="section pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">DZ</span>
              </div>
              <span className="font-display font-bold text-lg text-gray-900 dark:text-white">
                Rent<span className="gradient-text">It</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Own Less. Live More.<br />
              The premium peer-to-peer rental marketplace.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="section py-6 border-t border-gray-200 dark:border-dark-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} DZ-RentIt. All rights reserved.
          </p>
          <p className="text-sm text-gray-400 flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> in Algeria
          </p>
        </div>
      </div>
    </footer>
  );
}
