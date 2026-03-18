import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const City      = lazy(() => import('./pages/City'));
const OPD       = lazy(() => import('./pages/OPD'));
const Beds      = lazy(() => import('./pages/Beds'));
const Doctors   = lazy(() => import('./pages/Doctors'));
const Inventory = lazy(() => import('./pages/Inventory'));

const LOADING_MESSAGES = {
  '/dashboard': 'Loading dashboard...',
  '/city':      'Loading city data...',
  '/opd':       'Loading OPD system...',
  '/beds':      'Loading bed management...',
  '/doctors':   'Loading doctors...',
  '/inventory': 'Loading inventory...',
};

function PageLoader() {
  const { pathname } = useLocation();
  const message = LOADING_MESSAGES[pathname] ?? 'Loading page...';
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-opacity duration-300 ease-in-out">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-300 dark:border-gray-700"></div>
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm tracking-wide">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/city"      element={<City />}      />
            <Route path="/opd"       element={<OPD />}       />
            <Route path="/beds"      element={<Beds />}      />
            <Route path="/doctors"   element={<Doctors />}   />
            <Route path="/inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
