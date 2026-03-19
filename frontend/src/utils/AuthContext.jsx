import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const ROLE_HOME = { admin: '/dashboard', doctor: '/opd', staff: '/beds' };

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('jeevan_user')) ?? null; }
    catch { return null; }
  });
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jeevan_users')) ?? []; }
    catch { return []; }
  });

  const signup = ({ name, username, role }) => {
    const trimmed = username.trim().toLowerCase();
    if (users.find(u => u.username === trimmed)) return { ok: false, msg: 'Username already taken' };
    const newUser = { name: name.trim(), username: trimmed, role };
    const updated = [...users, newUser];
    setUsers(updated);
    localStorage.setItem('jeevan_users', JSON.stringify(updated));
    return { ok: true };
  };

  const login = (username) => {
    const found = users.find(u => u.username === username.trim().toLowerCase());
    if (!found) return { ok: false, msg: 'User not found. Please sign up first.' };
    setUser(found);
    localStorage.setItem('jeevan_user', JSON.stringify(found));
    return { ok: true, user: found };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jeevan_user');
  };

  const homeFor = (role) => ROLE_HOME[role] ?? '/dashboard';

  // RBAC: which routes each role can access
  const ROLE_ACCESS = {
    admin:  ['/dashboard', '/city', '/opd', '/beds', '/doctors', '/inventory', '/admissions'],
    doctor: ['/opd', '/doctors', '/admissions'],
    staff:  ['/beds', '/inventory'],
  };

  const canAccess = (path) => {
    if (!user) return false;
    return ROLE_ACCESS[user.role]?.includes(path) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, users, signup, login, logout, homeFor, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
