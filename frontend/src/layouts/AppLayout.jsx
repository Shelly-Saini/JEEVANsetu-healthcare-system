import { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';
import { useAuth } from '../utils/AuthContext.jsx';
import { useHospital } from '../utils/hospitalStore.jsx';
import { onEvent } from '../utils/eventBus.js';
import { useNotifications } from '../utils/notificationStore.jsx';
import GuidedTour from '../components/GuidedTour.jsx';

const TITLES = {
  '/dashboard': 'Hospital Dashboard',
  '/city':      'City Overview',
  '/opd':       'OPD Queue Management',
  '/beds':      'Bed Management',
  '/doctors':   'Doctor Availability',
  '/inventory': 'Inventory Monitoring',
};

const ROLE_SUBTITLE = {
  admin:  'System Overview',
  doctor: 'Patient Queue Focus',
  staff:  'Resource Management',
};

const ROLE_ICON = {
  admin:  '🏥',
  doctor: '👨‍⚕️',
  staff:  '🗂️',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode,  setDarkMode]  = useState(false);
  const { user, canAccess } = useAuth();
  const { sharedBeds } = useHospital();
  const { addNotification } = useNotifications();
  const location = useLocation();
  const active = sharedBeds ? sharedBeds.filter(b => b.status === 'Occupied') : [];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // ── Event bus → notifications ──────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      onEvent('PATIENT_ADDED', ({ patient, severity }) => {
        const isCritical = severity === 'Critical' || severity === 'High';
        addNotification({
          type:    isCritical ? 'critical' : 'info',
          icon:    isCritical ? '🚨' : '🪑',
          title:   'New Patient Registered',
          message: `${patient.name} · ${severity} severity added to OPD queue`,
        });
      }),
      onEvent('PATIENT_COMPLETED', ({ patientName }) => {
        addNotification({
          type:    'success',
          icon:    '✅',
          title:   'Patient Consultation Done',
          message: `${patientName} has been moved to completed`,
        });
      }),
      onEvent('LOW_STOCK_ALERT', ({ itemName, category }) => {
        addNotification({
          type:    'critical',
          icon:    '📦',
          title:   'Critical Stock Shortage',
          message: `${itemName} (${category}) is critically low`,
        });
      }),
      onEvent('DOCTOR_OVERLOADED', ({ department }) => {
        addNotification({
          type:    'warning',
          icon:    '👨‍⚕️',
          title:   'Doctor Overload Alert',
          message: `${department} department workload exceeds 90%`,
        });
      }),
      onEvent('BED_LOW', ({ type: bedType }) => {
        addNotification({
          type:    'warning',
          icon:    '🛏️',
          title:   'Bed Availability Low',
          message: `${bedType} beds below 20% availability`,
        });
      }),
      onEvent('DOCTOR_ASSIGNED', ({ doctor }) => {
        addNotification({
          type:    'info',
          icon:    '👨⚕️',
          title:   'Patient Assigned',
          message: `A patient was assigned to ${doctor}`,
        });
      }),
      onEvent('ITEM_RESTOCKED', ({ item, category }) => {
        addNotification({
          type:    'success',
          icon:    '📦',
          title:   'Item Restocked',
          message: `${item} (${category}) has been restocked`,
        });
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [addNotification]);

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but no access to this path → unauthorized
  if (!canAccess(location.pathname)) return <Navigate to="/unauthorized" replace />;

  const title = TITLES[location.pathname] || 'JEEVANsetu';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => setCollapsed(c => !c)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
          title={title}
        />
        {/* Role greeting banner */}
        <div className="mx-6 mt-5 mb-0 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/40 px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              Welcome back, {user.name} 👋
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {ROLE_SUBTITLE[user.role]}
              <span className="mx-1.5">·</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">{active.length} active patients</span>
            </p>
          </div>
          <div className="text-2xl opacity-60">{ROLE_ICON[user.role]}</div>
        </div>
        <main className="flex-1 overflow-y-auto p-6 transition-opacity duration-300 ease-in-out">
          <Outlet />
        </main>
        <GuidedTour />
      </div>
    </div>
  );
}
