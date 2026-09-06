const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-surface-200 disabled:text-surface-400',
  secondary: 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 disabled:opacity-50',
  ghost: 'text-surface-600 hover:bg-surface-100 disabled:opacity-50',
  danger: 'bg-status-critical text-white hover:opacity-90 disabled:opacity-50',
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
};

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, loading, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />
      )}
      {children}
    </button>
  );
}

const PROGRESS_TONE = {
  brand: 'bg-brand-500',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
};

export function ProgressBar({ value, tone = 'brand', className = '' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full bg-surface-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${PROGRESS_TONE[tone]} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
