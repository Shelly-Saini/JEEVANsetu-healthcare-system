import { useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useNotifications } from '../utils/notificationStore.jsx';

const TYPE = {
  critical: { bar: 'bg-status-critical', badge: 'bg-status-criticalBg text-status-critical', toast: 'border-status-critical bg-status-criticalBg', icon: AlertTriangle },
  warning:  { bar: 'bg-status-warning',  badge: 'bg-status-warningBg text-status-warning',    toast: 'border-status-warning bg-status-warningBg',  icon: AlertCircle },
  success:  { bar: 'bg-status-success',  badge: 'bg-status-successBg text-status-success',    toast: 'border-status-success bg-status-successBg',  icon: CheckCircle2 },
  info:     { bar: 'bg-status-info',     badge: 'bg-status-infoBg text-status-info',           toast: 'border-status-info bg-status-infoBg',        icon: Info },
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export function NotificationCenter({ open, onClose }) {
  const { notifications, unreadCount, dismiss, markRead, markAllRead, clearAll } = useNotifications();
  const panelRef = useRef(null);

  useEffect(() => { if (open) markAllRead(); }, [open, markAllRead]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-surface-950/20 pointer-events-auto" onClick={onClose} />
      <div
        ref={panelRef}
        className="absolute top-14 right-0 w-full sm:w-96 h-[calc(100vh-3.5rem)] bg-white border-l border-surface-200 shadow-popover flex flex-col pointer-events-auto animate-slide-up"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-surface-900 flex items-center gap-1.5"><Bell size={14} /> Notifications</h2>
            <p className="text-xs text-surface-400 mt-0.5">{notifications.length} total · {unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button onClick={markAllRead} className="text-xs text-surface-400 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-brand-50">Mark all read</button>
                <button onClick={clearAll} className="text-xs text-surface-400 hover:text-status-critical transition-colors px-2 py-1 rounded hover:bg-status-criticalBg">Clear all</button>
              </>
            )}
            <button onClick={onClose} aria-label="Close notifications" className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-400 gap-3 px-6 text-center">
              <Bell size={36} className="text-surface-300" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">Events from OPD, Inventory, Doctors &amp; Admissions will appear here</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-50">
              {notifications.map((n) => {
                const s = TYPE[n.type] || TYPE.info;
                const Icon = s.icon;
                return (
                  <li
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`relative flex gap-3 px-5 py-4 cursor-pointer hover:bg-surface-50 transition-colors ${!n.read ? 'bg-brand-50/40' : ''}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${s.bar}`} />
                    <Icon size={17} className="shrink-0 mt-0.5 text-surface-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-surface-800 leading-snug">{n.title}</p>
                        <span className="text-xs text-surface-400 shrink-0 mt-0.5">{timeAgo(n.ts)}</span>
                      </div>
                      {n.message && <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{n.message}</p>}
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>{n.type}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} aria-label={`Dismiss notification: ${n.title}`} className="shrink-0 text-surface-300 hover:text-surface-500 transition-colors mt-0.5">
                      <X size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const s = TYPE[t.type] || TYPE.info;
        const Icon = s.icon;
        return (
          <div key={t.id} className={`flex items-start gap-3 w-80 px-4 py-3 rounded-xl border-l-4 shadow-raised pointer-events-auto animate-slide-up ${s.toast}`}>
            <Icon size={17} className="shrink-0 mt-0.5 text-surface-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-800 leading-snug">{t.title}</p>
              {t.message && <p className="text-xs text-surface-500 mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} aria-label={`Dismiss: ${t.title}`} className="text-surface-400 hover:text-surface-600 shrink-0">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
