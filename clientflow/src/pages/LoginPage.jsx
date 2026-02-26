import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield, Star, Users, Zap, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Client-side validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      addToast(emailCheck.error, 'error');
      return;
    }
    if (!password || password.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      addToast('Welcome back!', 'success');
      // Redirect to intended destination or dashboard
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      addToast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Testimonials carousel data
  const testimonials = [
    {
      text: "I've earned over 45,000 DA renting my camera equipment on weekends. It literally pays for itself!",
      name: 'Sarah Chen',
      role: 'Camera owner · Algiers',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
      rating: 5,
    },
    {
      text: 'Found the perfect camping gear for a weekend trip. Saved thousands compared to buying new equipment.',
      name: 'Karim Benali',
      role: 'Outdoor enthusiast · Oran',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
      rating: 5,
    },
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left: Form — glassmorphism card with premium feel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10 bg-white dark:bg-dark">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-100/40 dark:bg-brand-900/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent-100/30 dark:bg-accent-900/15 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 mb-12 group">
            <motion.div
              whileHover={{ rotate: 6, scale: 1.05 }}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow"
            >
              <span className="text-white font-bold text-sm tracking-wide">DZ</span>
            </motion.div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
              Rent<span className="gradient-text">It</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed">
              Sign in to manage your rentals, track bookings, and connect with your community.
            </p>
          </div>

          {/* Social login — premium pill buttons */}
          <div className="flex gap-3 mb-7">
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white dark:bg-dark-50 border border-gray-200/80 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </motion.button>
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white dark:bg-dark-50 border border-gray-200/80 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
              GitHub
            </motion.button>
          </div>

          {/* Divider — elegant */}
          <div className="relative mb-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200/60 dark:border-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white dark:bg-dark text-gray-400 font-medium uppercase tracking-wider">or continue with email</span>
            </div>
          </div>

          {/* Form — refined inputs */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email address</label>
              <motion.div
                className={`relative rounded-2xl transition-all duration-200 ${focusedField === 'email' ? 'ring-2 ring-brand-500/30 dark:ring-brand-400/30' : ''}`}
              >
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-200 ${focusedField === 'email' ? 'text-brand-500' : 'text-gray-400'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 pl-12 rounded-2xl border border-gray-200/80 dark:border-dark-border bg-gray-50/50 dark:bg-dark-50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:bg-white dark:focus:bg-dark-50 transition-all text-[15px]"
                  required
                />
              </motion.div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                <a href="#" className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors">
                  Forgot password?
                </a>
              </div>
              <motion.div
                className={`relative rounded-2xl transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-brand-500/30 dark:ring-brand-400/30' : ''}`}
              >
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-200 ${focusedField === 'password' ? 'text-brand-500' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 pl-12 pr-12 rounded-2xl border border-gray-200/80 dark:border-dark-border bg-gray-50/50 dark:bg-dark-50 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:bg-white dark:focus:bg-dark-50 transition-all text-[15px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </motion.div>
            </div>

            <motion.div whileTap={{ scale: 0.995 }}>
              <Button type="submit" variant="primary" size="lg" className="w-full !py-3.5 !rounded-2xl !text-[15px] !font-semibold mt-1 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-shadow" loading={loading}>
                Sign in <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </motion.div>
          </form>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-5 mt-7 mb-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>SSL Encrypted</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>SOC2 Compliant</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 dark:text-brand-400 font-bold hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right: Immersive visual panel with real photography */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Full-bleed hero photograph */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=1600&fit=crop&q=85"
            alt="Beautiful modern interior"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/50 to-gray-900/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 to-accent-900/20" />
        </div>

        {/* Floating glassmorphism elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-16 right-12 w-44 h-44 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm"
          />
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-32 left-10 w-32 h-32 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm"
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-10 w-full h-full">
          {/* Top: Brand statement */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=60&h=60&fit=crop" alt="Key" className="w-6 h-6 rounded object-cover" />
            </div>
            <span className="text-white/80 text-sm font-medium tracking-wide">Trusted by 12,000+ members</span>
          </motion.div>

          {/* Center: Hero stats floating cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="space-y-6"
          >
            <h2 className="text-5xl font-display font-extrabold text-white leading-[1.1] tracking-tight">
              Own Less.<br />
              <span className="bg-gradient-to-r from-brand-300 via-accent-300 to-brand-300 bg-clip-text text-transparent">Live More.</span>
            </h2>
            <p className="text-white/70 text-lg max-w-sm leading-relaxed">
              Your community marketplace for renting everything you need — from cameras to camping gear.
            </p>

            {/* Floating stat pills */}
            <div className="flex gap-3 flex-wrap">
              {[
                { icon: Users, label: '12K+ Users', color: 'from-blue-500/20 to-blue-600/10' },
                { icon: Star, label: '4.8 Rating', color: 'from-amber-500/20 to-amber-600/10' },
                { icon: Zap, label: '98% Satisfaction', color: 'from-emerald-500/20 to-emerald-600/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r ${stat.color} backdrop-blur-xl border border-white/10`}
                >
                  <stat.icon className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-semibold">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom: Testimonial card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10 max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[15px] text-white/90 leading-relaxed mb-4">
                    "{testimonials[activeTestimonial].text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img
                      src={testimonials[activeTestimonial].avatar}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                      alt={testimonials[activeTestimonial].name}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{testimonials[activeTestimonial].name}</p>
                      <p className="text-xs text-white/60">{testimonials[activeTestimonial].role}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Testimonial dots */}
              <div className="flex gap-2 mt-4">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>

            {/* Bottom row of real item thumbnails */}
            <div className="flex gap-3 mt-5">
              {[
                { img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=100&h=100&fit=crop', label: 'Cameras' },
                { img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=100&h=100&fit=crop', label: 'Camping' },
                { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop', label: 'Sports' },
                { img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop', label: 'Tools' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.08, duration: 0.4 }}
                  className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/15 hover:border-white/30 transition-colors cursor-pointer"
                >
                  <img src={item.img} alt={item.label} className="w-full h-full object-cover" />
                </motion.div>
              ))}
              <div className="w-14 h-14 rounded-2xl border-2 border-white/15 flex items-center justify-center">
                <span className="text-white/50 text-xs font-semibold">+20</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
