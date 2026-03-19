import { useEffect, useRef } from 'react';
import { useNotifications } from '../utils/notificationStore.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       toast: 'border-red-400 bg-red-50 dark:bg-red-900/30' },
  warning:  { bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', toast: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' },
  success:  { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  toast: 'border-green-400 bg-green-50 dark:bg-green-900/30' },
  info:     { bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', toast: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' },
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

// ─── Notification Panel ───────────────────────────────────────────────────────

export function NotificationCenter({ open, onClose }) {
  const { notifications, unreadCount, dismiss, markRead, markAllRead, clearAll } = useNotifications();
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) markAllRead();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 pointer-events-auto" onClick={onClose} />
      <div
        ref={panelRef}
        className="absolute top-14 right-0 w-full sm:w-96 h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col pointer-events-auto animate-[slideIn_0.2s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">🔔 Notifications</h2>
            <p className="text-xs text-gray-400 mt-0.5">{notifications.length} total · {unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                  Mark all read
                </button>
                <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                  Clear all
                </button>
              </>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl leading-none ml-1">
              ×
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3 px-6 text-center">
              <span className="text-5xl">🔔</span>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">Events from OPD, Inventory &amp; Doctors will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {notifications.map(n => {
                const s = TYPE[n.type] || TYPE.info;
                return (
                  <li
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`relative flex gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${s.bar}`} />
                    <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{n.title}</p>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(n.ts)}</span>
                      </div>
                      {n.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>}
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>{n.type}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      className="shrink-0 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none mt-0.5"
                    >×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Toast Stack ──────────────────────────────────────────────────────────────

export function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const s = TYPE[t.type] || TYPE.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 w-80 px-4 py-3 rounded-xl border-l-4 shadow-lg pointer-events-auto animate-[toastIn_0.25s_ease-out] ${s.toast}`}
          >
            <span className="text-lg shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{t.title}</p>
              {t.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none shrink-0"
            >×</button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
