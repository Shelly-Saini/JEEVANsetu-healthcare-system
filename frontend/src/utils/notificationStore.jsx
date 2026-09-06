/* eslint-disable react-refresh/only-export-components -- intentional context+provider+hook pattern */
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

// Dedupe key — same type+category within 5s = skip
const dedupeKey = (type, message) => `${type}::${message}`;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts,        setToasts]        = useState([]);
  const recentKeys = useRef(new Map()); // key → timestamp

  const addNotification = useCallback(({ type = 'info', title, message, icon }) => {
    const key = dedupeKey(type, message);
    const now = Date.now();
    // suppress if same alert fired within last 5s
    if (recentKeys.current.has(key) && now - recentKeys.current.get(key) < 5000) return;
    recentKeys.current.set(key, now);

    const id = `${now}-${Math.random().toString(36).slice(2)}`;
    const entry = { id, type, title, message, icon, ts: now, read: false };

    setNotifications(prev => [entry, ...prev].slice(0, 20));

    // spawn toast
    setToasts(prev => [...prev, { ...entry }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss       = useCallback((id) => setNotifications(prev => prev.filter(n => n.id !== id)), []);
  const markRead      = useCallback((id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead   = useCallback(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))), []);
  const clearAll      = useCallback(() => setNotifications([]), []);
  const dismissToast  = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // addToast — immediate action feedback (e.g. "Bed updated") that shows as a
  // toast but doesn't clutter the persistent notification list, unlike
  // addNotification which is for real system/domain events.
  const addToast = useCallback(({ type = 'info', title, message }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message, ts: Date.now() }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, toasts, unreadCount, addNotification, addToast, dismiss, markRead, markAllRead, clearAll, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
