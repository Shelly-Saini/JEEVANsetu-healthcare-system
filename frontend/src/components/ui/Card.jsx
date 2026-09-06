export function Card({ children, className = '', padded = true, hover = false, ...rest }) {
  return (
    <div
      className={`bg-white border border-surface-200 rounded-card shadow-card ${padded ? 'p-5' : ''} ${
        hover ? 'transition-shadow hover:shadow-raised' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
          {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * StatCard — a single headline metric with an icon, optional trend, and
 * optional footnote. `trend` must be a real computed value (e.g. from
 * history data) — never fabricate one just to fill the slot.
 */
export function StatCard({ label, value, icon: Icon, tone = 'brand', trend, footnote, loading }) {
  const toneClasses = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-status-successBg text-status-success',
    warning: 'bg-status-warningBg text-status-warning',
    critical: 'bg-status-criticalBg text-status-critical',
    info: 'bg-status-infoBg text-status-info',
  };

  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-8 w-16 bg-surface-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-surface-900 mt-1 tabular-nums">{value}</p>
          )}
          {footnote && <p className="text-xs text-surface-500 mt-1">{footnote}</p>}
          {trend != null && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-status-success' : 'text-status-critical'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs previous period
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}
