// frontend/src/components/ApiStatusBanner.jsx
// Shows a warning when data is stale (served from fallback cache)
// or an error banner when the API is completely unreachable.

export default function ApiStatusBanner({ error, stale, onRetry }) {
  if (!error && !stale) return null;

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Unable to reach server — {error}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-semibold text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl px-4 py-3 mb-4">
      <span className="text-yellow-500">🕐</span>
      <p className="text-sm text-yellow-700 dark:text-yellow-400">
        Showing cached data — live data may be slightly outdated
      </p>
    </div>
  );
}
