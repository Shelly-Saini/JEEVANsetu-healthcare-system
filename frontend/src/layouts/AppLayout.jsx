import { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Wifi, WifiOff, UserCog, Stethoscope, ClipboardList, Building2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../utils/AuthContext.jsx';
import { useHospital } from '../utils/hospitalStore.jsx';
import { onEvent } from '../utils/eventBus.js';
import { useNotifications } from '../utils/notificationStore.jsx';
import { sumBedTotals } from '../utils/bedMath.js';
import GuidedTour from '../components/GuidedTour.jsx';

const TITLES = {
  '/dashboard': 'Hospital Dashboard',
  '/city': 'City Operations',
  '/opd': 'OPD Queue Management',
  '/beds': 'Bed Management',
  '/doctors': 'Doctor Availability',
  '/inventory': 'Inventory Monitoring',
  '/admissions': 'Smart Admissions',
  '/audit': 'Activity Log',
};

const ROLE_SUBTITLE = {
  admin: 'System overview',
  doctor: 'Patient queue focus',
  staff: 'Resource management',
  city_admin: 'City-wide operations',
};

const ROLE_ICON = { admin: UserCog, doctor: Stethoscope, staff: ClipboardList, city_admin: Building2 };

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, canAccess } = useAuth();
  const { sharedBeds, realtimeConnected } = useHospital();
  const { addNotification } = useNotifications();
  const location = useLocation();

  const bedTotals = sumBedTotals(sharedBeds);

  useEffect(() => {
    const unsubs = [
      onEvent('PATIENT_ADDED', ({ patient, severity }) => {
        const isCritical = severity === 'critical' || severity === 'high';
        addNotification({
          type: isCritical ? 'critical' : 'info',
          title: 'New patient registered',
          message: `${patient.patientName || patient.name} · ${severity} severity added to OPD queue`,
        });
      }),
      onEvent('PATIENT_STATUS_CHANGED', ({ patientName, status }) => {
        addNotification({ type: status === 'completed' ? 'success' : 'info', title: 'OPD status updated', message: `${patientName} → ${status}` });
      }),
      onEvent('LOW_STOCK_ALERT', ({ itemName, category }) => {
        addNotification({ type: 'critical', title: 'Critical stock shortage', message: `${itemName} (${category}) is critically low` });
      }),
      onEvent('ITEM_RESTOCKED', ({ item }) => {
        addNotification({ type: 'success', title: 'Item restocked', message: `${item} inventory updated` });
      }),
      onEvent('DOCTOR_STATUS_CHANGED', ({ name, status }) => {
        addNotification({ type: status === 'busy' ? 'warning' : 'info', title: 'Doctor status changed', message: `Dr. ${name} is now ${status}` });
      }),
      onEvent('ADMISSION_DECIDED', ({ patientName, decision }) => {
        addNotification({
          type: decision === 'admit' ? 'success' : decision === 'refer' ? 'critical' : 'warning',
          title: 'Admission decision',
          message: `${patientName} → ${decision.toUpperCase()}`,
        });
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [addNotification]);

  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(location.pathname)) return <Navigate to="/unauthorized" replace />;

  const title = TITLES[location.pathname] || 'JEEVANsetu';
  const RoleIcon = ROLE_ICON[user.role] || UserCog;

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} title={title} />

        <div className="mx-6 mt-5 mb-0 rounded-2xl bg-gradient-to-r from-brand-50 to-brand-100/60 border border-brand-100 px-5 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-surface-900">Welcome back, {user.name}</p>
            <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1.5">
              {ROLE_SUBTITLE[user.role]}
              {user.hospitalId && (
                <>
                  <span className="mx-0.5">·</span>
                  <span className="font-medium text-brand-700">
                    {bedTotals.occupied} occupied / {bedTotals.available} available <span className="font-normal text-surface-400">of {bedTotals.total} beds</span>
                  </span>
                </>
              )}
              <span className="mx-0.5">·</span>
              <span className={`inline-flex items-center gap-1 font-medium ${realtimeConnected ? 'text-status-success' : 'text-surface-400'}`}>
                {realtimeConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {realtimeConnected ? 'Live' : 'Offline'}
              </span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/70 border border-brand-200 flex items-center justify-center text-brand-700">
            <RoleIcon size={18} />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <GuidedTour />
      </div>
    </div>
  );
}
