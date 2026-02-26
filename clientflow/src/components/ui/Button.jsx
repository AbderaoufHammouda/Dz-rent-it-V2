import { forwardRef } from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-md hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-white dark:bg-dark-100 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-50 hover:border-gray-300 dark:hover:border-gray-600',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-50 hover:text-gray-900 dark:hover:text-gray-100',
  danger:
    'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg',
  outline:
    'border-2 border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-base rounded-2xl',
};

const Button = forwardRef(
  ({ children, variant = 'primary', size = 'md', className = '', icon: Icon, iconRight, loading, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={`
          relative inline-flex items-center justify-center gap-2 font-semibold
          transition-all duration-200 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {Icon && !loading && <Icon className="w-4 h-4" />}
        {children}
        {iconRight && <iconRight className="w-4 h-4" />}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
