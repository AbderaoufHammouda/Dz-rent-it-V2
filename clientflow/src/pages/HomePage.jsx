import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, Shield, Users, Star, MapPin, TrendingUp,
  Camera, Wrench, Bike, Tent, Laptop, Music, Gamepad2, Car, PartyPopper, Home,
  CalendarCheck, ThumbsUp, Zap, ChevronRight,
} from 'lucide-react';
import PageTransition, { ScrollReveal, StaggerContainer, StaggerItem } from '../components/ui/PageTransition';
import ItemCard from '../components/ui/ItemCard';
import { items, categories, stats, howItWorks } from '../data/mockData';

const iconMap = { Camera, Wrench, Bike, Tent, Laptop, Music, Gamepad2, Car, PartyPopper, Home, Search, CalendarCheck, ThumbsUp };

// Floating card for hero
function FloatingCard({ item, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      className={`absolute hidden lg:block ${className}`}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: 'easeInOut' }}
        className="glass-card p-3 shadow-elevated w-56"
      >
        <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{item.price} DA/day</span>
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs text-gray-500">{item.rating}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    else navigate('/search');
  };

  const recentItems = items.slice(0, 8);

  return (
    <PageTransition>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden bg-gray-50 dark:bg-dark">
        {/* Background effects */}
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-3xl" />

        {/* Floating cards */}
        <FloatingCard item={items[0]} className="top-32 left-[5%] z-10" delay={0.2} />
        <FloatingCard item={items[4]} className="top-48 right-[4%] z-10" delay={0.5} />
        <FloatingCard item={items[9]} className="bottom-32 left-[8%] z-10" delay={0.8} />

        <div className="section relative z-20 pt-16 pb-24 lg:pt-28 lg:pb-36">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 mb-8"
            >
              <Zap className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Algeria's #1 Rental Marketplace
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-brand-400" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-display font-extrabold text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6"
            >
              Monetize What You{' '}
              <span className="gradient-text">Own</span>.{' '}
              <br className="hidden sm:block" />
              Rent What You{' '}
              <span className="gradient-text">Need</span>.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 text-balance leading-relaxed"
            >
              Rent cameras, tools, sports equipment, and more from people in your neighborhood.
              Earn money from items sitting idle. Own less, live more.
            </motion.p>

            {/* Search bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="relative flex items-center gap-2 p-2 bg-white dark:bg-dark-100 rounded-2xl shadow-elevated border border-gray-200/50 dark:border-dark-border">
                <div className="flex-1 flex items-center gap-3 pl-4">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What do you want to rent?"
                    className="w-full py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-semibold rounded-xl hover:shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="hidden sm:inline">Search</span>
                  <Search className="w-5 h-5 sm:hidden" />
                </button>
              </div>
            </motion.form>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/search"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                <span>Explore Rentals</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <Link
                to="/add-item"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                <span>List Your Item</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-dark to-transparent" />
      </section>

      {/* ═══════════════════ TRUST BAR ═══════════════════ */}
      <ScrollReveal>
        <section className="section py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Users', value: (stats.totalUsers / 1000).toFixed(1) + 'K+', icon: Users },
              { label: 'Items Listed', value: (stats.totalItems / 1000).toFixed(1) + 'K+', icon: TrendingUp },
              { label: 'Completed Rentals', value: (stats.totalRentals / 1000).toFixed(1) + 'K+', icon: Star },
              { label: 'Cities Covered', value: stats.citiesCovered + '+', icon: MapPin },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white dark:bg-dark-100 border border-gray-100 dark:border-dark-border">
                <stat.icon className="w-6 h-6 mx-auto mb-3 text-brand-500" />
                <div className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════════════ CATEGORIES ═══════════════════ */}
      <ScrollReveal>
        <section className="section py-16">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white mb-3">
                Browse by Category
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Find exactly what you need from our curated categories
              </p>
            </div>
            <Link
              to="/search"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {categories.map((cat, i) => {
              const IconComponent = iconMap[cat.icon] || Laptop;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link
                    to={`/search?category=${cat.id}`}
                    className="group block p-5 rounded-2xl bg-white dark:bg-dark-100 border border-gray-100 dark:border-dark-border hover:border-brand-200 dark:hover:border-brand-500/20 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors">
                      <IconComponent className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{cat.name}</h3>
                    <p className="text-xs text-gray-400">{cat.count} items</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════════════ RECENTLY ADDED ═══════════════════ */}
      <ScrollReveal>
        <section className="section py-16">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white mb-3">
                Recently Added
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Fresh items just listed by our community
              </p>
            </div>
            <Link
              to="/search"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentItems.map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} />
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-dark-100 border border-gray-200 dark:border-dark-border rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-50 transition-colors"
            >
              View all listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <ScrollReveal>
        <section id="how-it-works" className="section py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Three simple steps to start renting or earning
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((step, i) => {
              const IconComponent = iconMap[step.icon] || Search;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative text-center"
                >
                  {/* Connector line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200 dark:border-dark-border" />
                  )}

                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-bold mb-3 -mt-2">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══════════════════ TRUST SECTION ═══════════════════ */}
      <ScrollReveal>
        <section className="section py-20">
          <div className="rounded-3xl bg-white dark:bg-dark-100 border border-gray-100 dark:border-dark-border p-8 md:p-14">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white mb-6">
                  Built on <span className="gradient-text">Trust</span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
                  Every transaction on DZ-RentIt is protected. We verify users, insure items,
                  and provide secure payments so you can rent with total confidence.
                </p>
                <div className="space-y-5">
                  {[
                    { icon: Shield, title: 'Verified Profiles', desc: 'Every user is ID-verified for your safety' },
                    { icon: Star, title: 'Review System', desc: 'Community-driven ratings you can trust' },
                    { icon: TrendingUp, title: 'Item Insurance', desc: 'Items protected up to 50,000 DA' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-0.5">{feature.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-accent-500/10 rounded-3xl blur-2xl" />
                <div className="relative grid grid-cols-2 gap-4">
                  {items.slice(0, 4).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="rounded-2xl overflow-hidden aspect-square"
                    >
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </PageTransition>
  );
}
