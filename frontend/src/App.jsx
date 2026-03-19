import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import { HospitalProvider } from './utils/hospitalStore.jsx';
import { AuthProvider, useAuth } from './utils/AuthContext.jsx';
import { NotificationProvider } from './utils/notificationStore.jsx';
import { ToastStack } from './components/NotificationCenter.jsx';

const Dashboard    = lazy(() => import('./pages/Dashboard'));
const City         = lazy(() => import('./pages/City'));
const OPD          = lazy(() => import('./pages/OPD'));
const Beds         = lazy(() => import('./pages/Beds'));
const Doctors      = lazy(() => import('./pages/Doctors'));
const Inventory    = lazy(() => import('./pages/Inventory'));
const Login        = lazy(() => import('./pages/Login'));
const Signup       = lazy(() => import('./pages/Signup'));
const Admissions   = lazy(() => import('./pages/Admissions'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

const LOADING_MESSAGES = {
  '/dashboard': 'Loading dashboard...',
  '/city':      'Loading city data...',
  '/opd':       'Loading OPD system...',
  '/beds':      'Loading bed management...',
  '/doctors':   'Loading doctors...',
  '/inventory':  'Loading inventory...',
  '/admissions': 'Loading Smart Admissions...',
  '/login':     'Loading...',
  '/signup':    'Loading...',
};

function PageLoader() {
  const { pathname } = useLocation();
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-300 dark:border-gray-700" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm tracking-wide">
          {LOADING_MESSAGES[pathname] ?? 'Loading page...'}
        </p>
      </div>
    </div>
  );
}

// Redirect logged-in users away from /login and /signup
function GuestRoute({ children }) {
  const { user, homeFor } = useAuth();
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <NotificationProvider>
          <ToastStack />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Guest routes */}
              <Route path="/login"  element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected app routes — auth + RBAC handled inside AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/city"      element={<City />}      />
                <Route path="/opd"       element={<OPD />}       />
                <Route path="/beds"      element={<Beds />}      />
                <Route path="/doctors"   element={<Doctors />}   />
                <Route path="/inventory"  element={<Inventory />}  />
                <Route path="/admissions" element={<Admissions />} />
              </Route>

              {/* Default: redirect to login */}
              <Route index element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
          </NotificationProvider>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
