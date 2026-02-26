import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Calendar, Package, Clock, Star, ChevronRight,
  DollarSign, Eye, BarChart3, CheckCircle, XCircle, AlertCircle,
  Edit, Trash2, Lock, MessageSquare, ArrowRight, Plus, MoreVertical,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import StarRating from '../components/ui/StarRating';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import useBooking from '../hooks/useBooking';
import useItems from '../hooks/useItems';
import useRatings from '../hooks/useRatings';
import { items as allItems, bookings as mockBookings, revenueData, owners } from '../data/mockData';
import { formatPrice } from '../utils/pricing';
import { formatDateRange } from '../utils/dates';
import { BookingStatus } from '../types/index.js';

const statusConfig = {
  pending: { color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle, label: 'Approved' },
  payment_pending: { color: 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-500/20', icon: DollarSign, label: 'Payment Pending' },
  completed: { color: 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/20', icon: CheckCircle, label: 'Completed' },
  rejected: { color: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20', icon: XCircle, label: 'Rejected' },
};

const statusSteps = ['Requested', 'Approved', 'Payment Pending', 'Completed'];

function StatusTracker({ currentStatus }) {
  const stepIndex = { pending: 0, approved: 1, payment_pending: 2, completed: 3 }[currentStatus] ?? 0;

  return (
    <div className="flex items-center gap-2">
      {statusSteps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i <= stepIndex
                  ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-glow'
                  : 'bg-gray-200 dark:bg-dark-50 text-gray-400 dark:text-gray-500'
                }
              `}
            >
              {i <= stepIndex ? '✓' : i + 1}
            </motion.div>
            <span className={`text-xs mt-1.5 text-center ${i <= stepIndex ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {step}
            </span>
          </div>
          {i < statusSteps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full mt-[-20px] ${i < stepIndex ? 'bg-brand-500' : 'bg-gray-200 dark:bg-dark-50'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Mini revenue chart
function RevenueChart({ data }) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.amount / maxAmount) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-accent-400 min-h-[4px]"
          />
          <span className="text-xs text-gray-400">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [mode, setMode] = useState('owner');
  const [reviewModal, setReviewModal] = useState(null); // stores booking object or null
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [deleteModal, setDeleteModal] = useState(null); // stores item object or null
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Hooks: business logic extracted from JSX ──
  const { bookings: fetchedBookings, fetchBookings, approveBooking, rejectBooking, cancelBooking, loading: bookingsLoading } = useBooking();
  const { items: fetchedItems, fetchItems, deleteItem, loading: itemsLoading } = useItems();
  const { submitReview, hasReviewed } = useRatings();

  // ── Fetch data on mount ──
  useEffect(() => {
    fetchBookings();
    fetchItems();
  }, [fetchBookings, fetchItems]);

  // Use fetched data if available, otherwise fallback to mock static data
  const bookingsList = fetchedBookings.length > 0 ? fetchedBookings : mockBookings;
  const ownerItems = (fetchedItems.length > 0 ? fetchedItems : allItems).slice(0, 6);

  // ── Revenue computation (extracted from inline) ──
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.amount, 0);
  const thisMonth = revenueData[revenueData.length - 1].amount;
  const lastMonth = revenueData[revenueData.length - 2].amount;
  const growth = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(0) : 0;

  // ── Booking actions with real lifecycle ──
  const handleApprove = async (bookingId) => {
    try {
      await approveBooking(bookingId);
      addToast('Booking approved! The renter has been notified.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to approve booking', 'error');
    }
  };

  const handleReject = async (bookingId) => {
    try {
      await rejectBooking(bookingId);
      addToast('Booking declined.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to decline booking', 'error');
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      await cancelBooking(bookingId);
      addToast('Booking cancelled.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  // ── Delete item with confirmation ──
  const handleDeleteItem = async () => {
    if (!deleteModal) return;
    try {
      await deleteItem(deleteModal.id);
      addToast('Item deleted successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete item', 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  // ── Review submission with double-direction support ──
  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    try {
      await submitReview({
        bookingId: reviewModal.id,
        reviewerId: user?.id || 'u1',
        targetUserId: reviewModal.item?.owner?.id || reviewModal.ownerId,
        rating: reviewRating,
        comment: reviewText,
        direction: 'renter_to_owner',
      });
      addToast('Review submitted! Thank you for your feedback.', 'success');
      setReviewModal(null);
      setReviewRating(5);
      setReviewText('');
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark pb-20">
        {/* Header */}
        <div className="bg-white dark:bg-dark-200 border-b border-gray-200 dark:border-dark-border">
          <div className="section py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white mb-1">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your rentals and bookings</p>
              </div>
              <Button variant="primary" size="md" icon={Plus} onClick={() => navigate('/add-item')}>
                List New Item
              </Button>
            </div>

            {/* Mode Toggle */}
            <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-dark-50 rounded-xl">
              {['owner', 'renter'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`
                    relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${mode === m
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="dashboard-tab"
                      className="absolute inset-0 bg-white dark:bg-dark-100 rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative capitalize">{m} Dashboard</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="section py-8">
          <AnimatePresence mode="wait">
            {mode === 'owner' ? (
              <motion.div
                key="owner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Revenue Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="card p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Overview</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-display font-bold gradient-text">{totalRevenue.toLocaleString()} DA</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{growth}% vs last month
                        </p>
                      </div>
                    </div>
                    <RevenueChart data={revenueData} />
                  </div>

                  <div className="space-y-5">
                    {[
                      { label: 'Active Listings', value: ownerItems.length, icon: Package, color: 'text-brand-500 bg-brand-50 dark:bg-brand-500/10' },
                      { label: 'Pending Requests', value: bookingsList.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
                      { label: 'Total Reviews', value: '47', icon: Star, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
                    ].map((stat) => (
                      <div key={stat.label} className="card p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booking Requests */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Booking Requests</h2>
                  <div className="space-y-3">
                    {bookingsList.map((booking) => {
                      const config = statusConfig[booking.status] || statusConfig.pending;
                      const StatusIcon = config.icon;
                      return (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="card p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <img src={booking.item.images[0]} alt={booking.item.title} className="w-16 h-16 rounded-xl object-cover" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{booking.item.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <img src={booking.renter.avatar} alt="" className="w-5 h-5 rounded-full" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">{booking.renter.name}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {booking.startDate} → {booking.endDate}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`badge border ${config.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(booking.totalPrice)}</span>
                            </div>
                            {booking.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleApprove(booking.id)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(booking.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* My Listings */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Listings</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ownerItems.map((item) => (
                      <div key={item.id} className="card p-4 flex gap-4">
                        <img src={item.images[0]} alt={item.title} className="w-20 h-20 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.title}</h3>
                          <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-1">{formatPrice(item.price)}/day</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Link to={`/edit-item/${item.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 text-gray-400 hover:text-brand-500 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 text-gray-400 hover:text-amber-500 transition-colors">
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteModal(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className={item.available ? 'badge-success text-xs h-fit' : 'badge-error text-xs h-fit'}>
                          {item.available ? 'Active' : 'Rented'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* RENTER DASHBOARD */
              <motion.div
                key="renter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Active Booking */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Booking</h2>
                  {bookingsList.length > 0 ? (
                    <div className="card p-6">
                      <div className="flex flex-col sm:flex-row gap-5 mb-6">
                        <img src={bookingsList[0].item.images[0]} alt="" className="w-full sm:w-32 h-24 rounded-xl object-cover" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{bookingsList[0].item.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {bookingsList[0].startDate} → {bookingsList[0].endDate}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <img src={bookingsList[0].item.owner.avatar} alt="" className="w-6 h-6 rounded-full" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Owner: {bookingsList[0].item.owner.name}</span>
                          </div>
                        </div>
                        <div className="sm:ml-auto text-right">
                          <p className="text-xl font-bold gradient-text">{formatPrice(bookingsList[0].totalPrice)}</p>
                        </div>
                      </div>
                      <StatusTracker currentStatus={bookingsList[0].status} />
                    </div>
                  ) : (
                    <EmptyState icon={Calendar} title="No active bookings" description="Book an item to see your active rental here." action={() => navigate('/search')} actionLabel="Browse Items" />
                  )}
                </div>

                {/* Rental History */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rental History</h2>
                  <div className="space-y-3">
                    {bookingsList.map((booking) => {
                      const config = statusConfig[booking.status] || statusConfig.pending;
                      const StatusIcon = config.icon;
                      return (
                        <div key={booking.id} className="card p-4 flex items-center gap-4">
                          <img src={booking.item.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{booking.item.title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {booking.startDate} → {booking.endDate}
                            </p>
                          </div>
                          <span className={`badge border ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{formatPrice(booking.totalPrice)}</span>
                          {booking.status === 'completed' && (
                            <Button variant="ghost" size="sm" onClick={() => setReviewModal(booking)}>
                              <Star className="w-3.5 h-3.5" /> Review
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Saved Items Placeholder */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved Items</h2>
                  <EmptyState
                    icon={Eye}
                    title="No saved items yet"
                    description="Items you save while browsing will appear here for quick access."
                    action={() => navigate('/search')}
                    actionLabel="Start Browsing"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Review Modal */}
        <Modal isOpen={!!reviewModal} onClose={() => { setReviewModal(null); setReviewRating(5); setReviewText(''); }} title="Leave a Review">
          <div className="space-y-5">
            {reviewModal && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-50 rounded-xl">
                <img src={reviewModal.item?.images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{reviewModal.item?.title}</p>
                  <p className="text-xs text-gray-500">{reviewModal.startDate} → {reviewModal.endDate}</p>
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-3">How was your rental experience?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)}>
                    <Star className={`w-8 h-8 transition-colors ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="input-base resize-none"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setReviewModal(null); setReviewRating(5); setReviewText(''); }}>Cancel</Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmitReview}
                disabled={!reviewText.trim()}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Item">
          <div className="space-y-4">
            {deleteModal && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                <img src={deleteModal.images?.[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{deleteModal.title}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">This action cannot be undone</p>
                </div>
              </div>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-sm">Are you sure you want to permanently delete this listing? Any active bookings will be cancelled.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1 !bg-red-600 hover:!bg-red-700" onClick={handleDeleteItem}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
