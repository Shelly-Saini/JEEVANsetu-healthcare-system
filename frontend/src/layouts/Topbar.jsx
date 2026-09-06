import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { NotificationCenter } from '../components/NotificationCenter.jsx';

const ROLE_BADGE = {
  admin: 'bg-status-criticalBg text-status-critical',
  doctor: 'bg-status-infoBg text-status-info',
  staff: 'bg-status-successBg text-status-success',
  city_admin: 'bg-brand-50 text-brand-700',
};

const ROLE_LABEL = { admin: 'Admin', doctor: 'Doctor', staff: 'Staff', city_admin: 'City Admin' };

export default function Topbar({ onToggleSidebar, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      <header className="h-14 bg-white border-b border-surface-200 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} aria-label="Toggle sidebar" className="p-1.5 rounded-md text-surface-500 hover:bg-surface-100 transition-colors">
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-surface-800">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-1.5 rounded-md text-surface-500 hover:bg-surface-100 transition-colors"
            title="Notifications"
            aria-label="Toggle notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-status-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {user && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${ROLE_BADGE[user.role]}`}>
              {ROLE_LABEL[user.role]}
            </span>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-600 font-medium hidden sm:block">{user.name}</span>
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="text-surface-400 hover:text-status-critical transition-colors p-1"
                title="Logout"
                aria-label="Log out"
              >
                <LogOut size={17} />
              </button>
            </div>
          )}
        </div>
      </header>

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {confirmLogout && (
        <div className="fixed inset-0 bg-surface-950/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-popover border border-surface-200 p-6 w-80 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-status-criticalBg flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="text-status-critical" size={22} />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">Confirm logout</h3>
            <p className="text-sm text-surface-500 mb-5">Are you sure you want to log out? Your session will end.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2 rounded-lg border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-status-critical hover:opacity-90 text-white text-sm font-bold transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
