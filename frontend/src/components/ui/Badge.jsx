import { STATUS_TONE } from '../../constants/enums';

const TONE_CLASSES = {
  success: 'bg-status-successBg text-status-success',
  warning: 'bg-status-warningBg text-status-warning',
  critical: 'bg-status-criticalBg text-status-critical',
  info: 'bg-status-infoBg text-status-info',
  neutral: 'bg-surface-100 text-surface-600',
};

/**
 * Badge — renders a status pill. Pass either a raw `tone` ('success' |
 * 'warning' | 'critical' | 'info' | 'neutral') or a known status `value`
 * (e.g. 'critical', 'occupied', 'busy') and it will look up the tone from
 * the shared enum metadata so every screen colors the same status the same way.
 */
export default function Badge({ children, tone, value, icon: Icon, className = '' }) {
  const resolvedTone = tone || STATUS_TONE[value] || 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
