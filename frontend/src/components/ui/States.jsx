import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';

export function EmptyState({ icon, title, description, action }) {
  const Icon = icon || Inbox;
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-surface-100 text-surface-400 flex items-center justify-center mb-3">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-surface-800">{title}</h3>
      {description && <p className="text-xs text-surface-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-status-criticalBg text-status-critical flex items-center justify-center mb-3">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-surface-800">{title}</h3>
      {description && <p className="text-xs text-surface-500 mt-1 max-w-sm">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 text-white text-xs font-medium hover:bg-surface-800 transition-colors"
        >
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}

export function OfflineState({ onRetry }) {
  return (
    <ErrorState
      title="Can't reach the JEEVANsetu API"
      description="Make sure the backend is running and reachable at the configured API URL."
      onRetry={onRetry}
    />
  );
}
export { WifiOff };

export function Skeleton({ className = '' }) {
  return <div className={`bg-surface-100 rounded animate-pulse ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-surface-200 rounded-card p-5">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-16 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
