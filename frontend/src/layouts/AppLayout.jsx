import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';

const TITLES = {
  '/dashboard': 'Hospital Dashboard',
  '/city':      'City Overview',
  '/opd':       'OPD Queue Management',
  '/beds':      'Bed Management',
  '/doctors':   'Doctor Availability',
  '/inventory': 'Inventory Monitoring',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode,  setDarkMode]  = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const title = TITLES[location.pathname] || 'JEEVANsetu';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => setCollapsed((c) => !c)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
