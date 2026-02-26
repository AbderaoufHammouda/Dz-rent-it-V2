import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';

export default function SignupPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use the same checks as validation utility (includes special char)
  const { checks: passwordChecks } = validatePassword(password);

  const handleSignup = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      addToast('Please enter your full name', 'error');
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      addToast(emailCheck.error, 'error');
      return;
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      const unmet = pwCheck.checks.filter((c) => !c.met).map((c) => c.label);
      addToast(`Password: ${unmet[0]}`, 'error');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email, password);
      addToast('Account created! Welcome to DZ-RentIt!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      addToast(err.message || 'Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Visual panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-700 via-brand-700 to-brand-600" />
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-brand-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl mx-auto mb-8 border-2 border-white/20">
              <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=200&h=200&fit=crop" alt="Community" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">Start your journey</h2>
            <p className="text-brand-100 text-lg max-w-md leading-relaxed">
              Whether you want to rent or earn, DZ-RentIt connects you with your community.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-10">
              {[
                { value: '12K+', label: 'Users' },
                { value: '5.6K+', label: 'Items' },
                { value: '4.8', label: 'Avg Rating' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-brand-200">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-sm">DZ</span>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
              Rent<span className="gradient-text">It</span>
            </span>
          </Link>

          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Create your account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Join the community and start renting or earning today
          </p>

          {/* Social */}
          <div className="flex gap-3 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-50 border border-gray-200 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-50 border border-gray-200 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-50 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
              GitHub
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-dark-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-dark text-gray-400">or sign up with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="input-base pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-base pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="input-base pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5 pt-2"
                >
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${check.met ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-dark-50'}`}>
                        {check.met && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-xs ${check.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <label className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="#" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Privacy Policy</a>
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
              disabled={!agreed}
            >
              Create account <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
