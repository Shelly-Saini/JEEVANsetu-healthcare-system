import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', icon: '🏥', label: 'Dashboard'  },
  { to: '/city',      icon: '🌆', label: 'City View'  },
  { to: '/opd',       icon: '🪑', label: 'OPD Queue'  },
  { to: '/beds',      icon: '🛏️',  label: 'Beds'       },
  { to: '/doctors',   icon: '👨‍⚕️', label: 'Doctors'    },
  { to: '/inventory', icon: '📦', label: 'Inventory'  },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} transition-all duration-300 bg-gray-900 dark:bg-gray-950 flex flex-col min-h-screen`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
        <span className="text-2xl">🩺</span>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-wide">
            JEEVAN<span className="text-indigo-400">setu</span>
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-indigo-600 text-white'
                 : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <span className="text-lg">{icon}</span>
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
