import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MapPin, Shield, Clock, ChevronLeft, ChevronRight, Heart,
  Share2, CheckCircle, MessageCircle, Calendar, Tag, Info, Flame, Rocket,
  X, Maximize2, AlertCircle,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import { ScrollReveal } from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import StarRating from '../components/ui/StarRating';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import useCalendar from '../hooks/useCalendar';
import usePricing from '../hooks/usePricing';
import useBooking from '../hooks/useBooking';
import { items, reviews } from '../data/mockData';
import { formatPrice } from '../utils/pricing';
import { DayStatus } from '../types/index.js';

/**
 * Calendar component backed by useCalendar hook.
 * Zero business logic — purely presentational.
 */
function AvailabilityCalendar({ calendar }) {
  const {
    weeks, monthLabel, nextMonth, prevMonth, selectDay,
    startDate, endDate, isInRange, isDaySelectable, getDayStatus,
  } = calendar;

  const statusColors = {
    [DayStatus.AVAILABLE]: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer',
    [DayStatus.PENDING]: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    [DayStatus.RESERVED]: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    [DayStatus.BLOCKED]: 'bg-gray-100 dark:bg-dark-50 text-gray-400 dark:text-gray-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-gray-900 dark:text-white">{monthLabel}</h3>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-50 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>

      {/* Weeks grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={`empty-${wi}-${di}`} />;
              const status = getDayStatus(day.dateKey);
              const selectable = isDaySelectable(day.dateKey);
              const selected = day.dateKey === startDate || day.dateKey === endDate;
              const inRange = isInRange(day.dateKey);
              return (
                <motion.button
                  key={day.dateKey}
                  whileHover={selectable ? { scale: 1.1 } : {}}
                  whileTap={selectable ? { scale: 0.95 } : {}}
                  onClick={() => selectable && selectDay(day.dateKey)}
                  disabled={!selectable}
                  className={`
                    relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all
                    ${selected
                      ? 'bg-brand-500 text-white shadow-glow'
                      : inRange
                      ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300'
                      : statusColors[status] || statusColors[DayStatus.AVAILABLE]
                    }
                    ${!selectable && !selected ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {day.dayOfMonth}
                  {status === DayStatus.AVAILABLE && !selected && !inRange && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-dark-border">
        {[
          { color: 'bg-emerald-400', label: 'Available' },
          { color: 'bg-amber-400', label: 'Pending' },
          { color: 'bg-red-400', label: 'Reserved' },
          { color: 'bg-gray-400', label: 'Blocked' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const item = items.find((i) => i.id === id) || items[0];
  const itemReviews = reviews.filter((r) => r.itemId === item.id);

  const [activeImage, setActiveImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [liked, setLiked] = useState(false);

  // ── Calendar hook: replaces all inline calendar logic ──
  const calendar = useCalendar({
    availabilityMap: {}, // In production, fetched from API for this item
    isOwner: false,
  });

  // ── Pricing hook: replaces inline useMemo ──
  const pricing = usePricing(item.price, calendar.startDate, calendar.endDate);

  // ── Booking hook: replaces toast-only handleBook ──
  const { createBooking, loading: bookingLoading } = useBooking();

  const handleBook = async () => {
    if (!user) {
      addToast('Please log in to book this item', 'warning');
      navigate('/login');
      return;
    }
    if (!calendar.startDate || !calendar.endDate) {
      addToast('Please select rental dates first', 'warning');
      return;
    }
    try {
      await createBooking({
        item,
        renterId: user.id,
        startDate: calendar.startDate,
        endDate: calendar.endDate,
        availabilityMap: calendar.getDayStatus ? {} : {},
      });
      addToast('Booking request sent! The owner will respond shortly.', 'success');
      calendar.clearSelection();
    } catch (err) {
      addToast(err.message || 'Booking failed', 'error');
    }
  };

  const handleContactOwner = () => {
    if (!user) {
      addToast('Please log in to message the owner', 'warning');
      navigate('/login');
      return;
    }
    navigate('/messages');
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark">
        {/* Breadcrumb */}
        <div className="section pt-4 pb-2">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/search" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Explore</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/search?category=${item.category}`} className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors capitalize">{item.category}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{item.title}</span>
          </nav>
        </div>

        <div className="section pb-20">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* LEFT: Images */}
            <div className="lg:col-span-3 space-y-4">
              {/* Main image */}
              <motion.div
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-100 cursor-pointer group"
                onClick={() => setFullscreen(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    src={item.images[activeImage]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Image nav */}
                {item.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImage((prev) => (prev - 1 + item.images.length) % item.images.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-dark-100/90 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveImage((prev) => (prev + 1) % item.images.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-dark-100/90 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
                    className="p-2.5 rounded-full bg-white/90 dark:bg-dark-100/90 shadow-lg hover:scale-105 transition-transform"
                  >
                    <Heart className={`w-5 h-5 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); addToast('Link copied!', 'info'); }}
                    className="p-2.5 rounded-full bg-white/90 dark:bg-dark-100/90 shadow-lg hover:scale-105 transition-transform"
                  >
                    <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </motion.div>

              {/* Thumbnails */}
              <div className="flex gap-3">
                {item.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden transition-all ${
                      activeImage === i
                        ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-dark'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Description */}
              <ScrollReveal>
                <div className="card p-6 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About this item</h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>

                  {/* Features */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {item.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-brand-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-4 flex-wrap">
                    <span className="badge-brand">
                      <Tag className="w-3 h-3" /> {item.category}
                    </span>
                    <span className="badge-success">
                      <CheckCircle className="w-3 h-3" /> {item.condition}
                    </span>
                  </div>
                </div>
              </ScrollReveal>

              {/* Reviews */}
              <ScrollReveal>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Reviews ({item.reviewCount})
                    </h2>
                    <StarRating rating={item.rating} count={item.reviewCount} size="md" />
                  </div>
                  {itemReviews.length > 0 ? (
                    <div className="space-y-5">
                      {itemReviews.map((review) => (
                        <div key={review.id} className="pb-5 border-b border-gray-100 dark:border-dark-border last:border-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <img src={review.user.avatar} alt={review.user.name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">{review.user.name}</h4>
                                <span className="text-xs text-gray-400">{review.date}</span>
                              </div>
                              <StarRating rating={review.rating} showCount={false} size="sm" />
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{review.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No reviews yet. Be the first to rent and review!</p>
                  )}
                </div>
              </ScrollReveal>

              {/* Calendar */}
              <ScrollReveal>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Availability Calendar</h2>
                  <AvailabilityCalendar calendar={calendar} />
                </div>
              </ScrollReveal>
            </div>

            {/* RIGHT: Booking Panel */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-[88px] space-y-5">
                {/* Item info card */}
                <div className="card p-6">
                  <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">{item.title}</h1>
                  <div className="flex items-center gap-3 mb-4">
                    <StarRating rating={item.rating} count={item.reviewCount} size="sm" />
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {item.location}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-display font-bold gradient-text">{formatPrice(item.price)}</span>
                    <span className="text-gray-500 dark:text-gray-400">/day</span>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-3 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Select Dates</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-50 border border-gray-200 dark:border-dark-border">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {calendar.startDate || 'Select date'}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-50 border border-gray-200 dark:border-dark-border">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {calendar.endDate || 'Select date'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price breakdown — driven by usePricing hook */}
                  <AnimatePresence>
                    {pricing.totalDays > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 mb-6 p-4 rounded-xl bg-gray-50 dark:bg-dark-50">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{pricing.formatted.pricePerDay} × {pricing.totalDays} days</span>
                            <span className="text-gray-900 dark:text-white font-medium">{pricing.formatted.baseTotal}</span>
                          </div>
                          {pricing.discountLabel && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                {pricing.discountRate >= 0.2 ? <Rocket className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                                {pricing.discountLabel}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{pricing.formatted.discountAmount}</span>
                            </motion.div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Security deposit</span>
                            <span className="text-gray-900 dark:text-white font-medium">{formatPrice(item.deposit)}</span>
                          </div>
                          <div className="pt-3 border-t border-gray-200 dark:border-dark-border flex justify-between">
                            <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                            <motion.span
                              key={pricing.finalTotal}
                              initial={{ scale: 1.1 }}
                              animate={{ scale: 1 }}
                              className="text-xl font-display font-bold gradient-text"
                            >
                              {formatPrice(pricing.finalTotal + item.deposit)}
                            </motion.span>
                          </div>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Deposit refunded after safe return
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Book button */}
                  <Button
                    variant="primary"
                    size="xl"
                    className="w-full"
                    onClick={handleBook}
                    icon={Calendar}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Sending...' : pricing.totalDays > 0 ? `Book for ${pricing.formatted.finalTotal}` : 'Select dates to book'}
                  </Button>

                  <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Free cancellation up to 24 hours before pickup
                  </p>
                </div>

                {/* Owner card */}
                <div className="card p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={item.owner.avatar} alt={item.owner.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-500/20" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.owner.name}</h3>
                        {item.owner.verified && (
                          <CheckCircle className="w-4 h-4 text-brand-500" />
                        )}
                      </div>
                      <StarRating rating={item.owner.rating} count={item.owner.reviews} size="sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-50 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Response rate</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.owner.responseRate}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-50 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Responds in</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.owner.responseTime}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="md" className="w-full" icon={MessageCircle} onClick={handleContactOwner}>
                    Contact Owner
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky booking bar */}
        <div className="fixed bottom-16 left-0 right-0 z-40 lg:hidden">
          <div className="glass-nav border-t border-gray-200/50 dark:border-dark-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold gradient-text">{formatPrice(item.price)}</span>
                <span className="text-sm text-gray-500">/day</span>
                {pricing.totalDays > 0 && (
                  <p className="text-xs text-gray-400">Total: {pricing.formatted.finalTotal} for {pricing.totalDays} days</p>
                )}
              </div>
              <Button variant="primary" size="lg" onClick={handleBook} icon={Calendar}>
                Book Now
              </Button>
            </div>
          </div>
        </div>

        {/* Fullscreen modal */}
        <Modal isOpen={fullscreen} onClose={() => setFullscreen(false)} size="full">
          <div className="flex items-center justify-center min-h-[60vh]">
            <img src={item.images[activeImage]} alt={item.title} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
          </div>
          <div className="flex justify-center gap-3 mt-4">
            {item.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden ${activeImage === i ? 'ring-2 ring-brand-500' : 'opacity-50 hover:opacity-100'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
