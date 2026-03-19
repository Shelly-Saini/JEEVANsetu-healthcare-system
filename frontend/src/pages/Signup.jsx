import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.jsx';

const LABELS = {
  ui: {
    heading:        'Create account',
    subheading:     'Join the JEEVANsetu platform',
    successMsg:     'Account created successfully! Redirecting to login...',
    errorRequired:  'All fields are required.',
    labelName:      'Full Name',
    labelUsername:  'Username',
    labelRole:      'Role',
    submitBtn:      'Create Account →',
    signinPrompt:   'Already have an account?',
    signinLink:     'Sign in',
    footer:         '© 2024 JEEVANsetu · Healthcare Coordination',
    appTagline:     'Healthcare Coordination System',
  },
  roles: {
    admin:  { label: 'Admin',  desc: 'Full system access'      },
    doctor: { label: 'Doctor', desc: 'OPD & Doctor management' },
    staff:  { label: 'Staff',  desc: 'Beds & Inventory'        },
  },
};

const ROLES = Object.entries(LABELS.roles).map(([value, meta]) => ({ value, ...meta }));

export default function Signup() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ name: '', username: '', role: 'staff' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) { setError(LABELS.ui.errorRequired); return; }
    const result = signup(form);
    if (!result.ok) { setError(result.msg); return; }
    setSuccess(true);
    setTimeout(() => navigate('/login'), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🩺</span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            JEEVAN<span className="text-indigo-500">setu</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{LABELS.ui.appTagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{LABELS.ui.heading}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{LABELS.ui.subheading}</p>

          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
              <span>✅</span><span>{LABELS.ui.successMsg}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              <span>❌</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">{LABELS.ui.labelName}</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">{LABELS.ui.labelUsername}</label>
              <input
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                placeholder="e.g. jane_smith"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">{LABELS.ui.labelRole}</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                      form.role === r.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <p className={`text-xs font-bold ${form.role === r.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={success}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {LABELS.ui.submitBtn}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {LABELS.ui.signinPrompt}{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              {LABELS.ui.signinLink}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {LABELS.ui.footer}
        </p>
      </div>
    </div>
  );
}
