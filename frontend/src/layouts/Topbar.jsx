import { useState } from 'react';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../utils/notificationStore.jsx';
import { NotificationCenter } from '../components/NotificationCenter.jsx';

const ROLE_BADGE = {
  admin:  'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  doctor: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  staff:  'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
};

export default function Topbar({ onToggleSidebar, darkMode, onToggleDark, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout,  setConfirmLogout]  = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ☰
          </button>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Bell icon */}
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Live indicator */}
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Role badge */}
          {user && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${ROLE_BADGE[user.role]}`}>
              {user.role}
            </span>
          )}

          {/* User name + avatar + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium hidden sm:block">{user.name}</span>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="text-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-1 leading-none"
                title="Logout"
              >
                ⏻
              </button>
            </div>
          )}
        </div>
      </header>

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* Logout confirmation modal */}
      {confirmLogout && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 w-80 text-center animate-[scaleIn_0.2s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">Confirm Logout</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Are you sure you want to logout? Your session will end.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-bold transition-all duration-200 shadow-md hover:shadow-red-200 dark:hover:shadow-red-900/40"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
