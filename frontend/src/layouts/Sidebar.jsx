import { NavLink } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.jsx';

// SVG icons — all use className="w-5 h-5 shrink-0"
const Icons = {
  Dashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  City: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
    </svg>
  ),
  OPD: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Beds: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 14h20M7 10V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4" />
    </svg>
  ),
  Doctors: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M4.5 12.5a7.5 7.5 0 0 0 15 0V7a1 1 0 0 0-1-1h-2V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2h-2a1 1 0 0 0-1 1v5.5z" />
      <path d="M12 17v4M10 21h4" />
    </svg>
  ),
  Inventory: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Admissions: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" />
    </svg>
  ),
};

const ALL_NAV = [
  { to: '/dashboard', icon: Icons.Dashboard, label: 'Dashboard', roles: ['admin'] },
  { to: '/city',      icon: Icons.City,      label: 'City View',  roles: ['admin'] },
  { to: '/opd',       icon: Icons.OPD,       label: 'OPD Queue',  roles: ['admin', 'doctor'] },
  { to: '/beds',      icon: Icons.Beds,      label: 'Beds',       roles: ['admin', 'staff'] },
  { to: '/doctors',   icon: Icons.Doctors,   label: 'Doctors',    roles: ['admin', 'doctor'] },
  { to: '/inventory', icon: Icons.Inventory, label: 'Inventory',  roles: ['admin', 'staff'] },
  { to: '/admissions', icon: Icons.Admissions, label: 'Admissions', roles: ['admin', 'doctor'] },
];

export default function Sidebar({ collapsed }) {
  const { user } = useAuth();
  const nav = ALL_NAV.filter(n => !user || n.roles.includes(user.role));

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 bg-gray-900 dark:bg-gray-950 flex flex-col min-h-screen`}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <span className="text-2xl shrink-0">🩺</span>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-wide">
            JEEVAN<span className="text-indigo-400">setu</span>
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
               ${isActive
                 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/40 scale-[1.02]'
                 : 'text-gray-400 hover:bg-gray-800 hover:text-white hover:scale-[1.01]'}`
            }
          >
            <div className="w-6 flex justify-center shrink-0">{icon}</div>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
          v1.0.0 · JEEVANsetu
        </div>
      )}
    </aside>
  );
}
