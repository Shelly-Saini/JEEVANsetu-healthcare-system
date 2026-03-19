import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.jsx';

const FEATURES = [
  { icon: '📡', text: 'Real-time hospital monitoring' },
  { icon: '🧠', text: 'Smart patient triage system' },
  { icon: '📊', text: 'Resource optimization insights' },
];

export default function Login() {
  const { login, homeFor } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [remember, setRemember] = useState(false);

  // ── Auth logic unchanged ──────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter your username.'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = login(username);
      setLoading(false);
      if (!result.ok) { setError(result.msg); return; }
      navigate(homeFor(result.user.role), { replace: true });
    }, 600);
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Branding ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 flex-col items-center justify-center p-12">

        {/* Blur blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-300/10 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-sm animate-[fadeInUp_0.8s_ease-out]">

          {/* Icon */}
          <div className="text-6xl mb-6 animate-[float_3s_ease-in-out_infinite]">🩺</div>

          {/* Title */}
          <h1 className="text-5xl font-black text-white tracking-wide mb-1 leading-tight">
            JEEVAN<span className="font-light text-blue-200">setu</span>
          </h1>

          {/* Subtitle */}
          <p className="text-blue-100 text-base font-medium tracking-wide mb-2">
            Smart Hospital Coordination System
          </p>

          {/* Divider */}
          <div className="w-12 h-0.5 bg-white/30 mx-auto mb-8 rounded-full" />

          {/* Feature cards */}
          <div className="space-y-3 text-left">
            {FEATURES.map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:bg-white/15 cursor-default"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-white text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="absolute bottom-6 flex flex-col items-center gap-2">
          {/* System Online indicator */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-300 font-medium tracking-wide">System Online</span>
          </div>
          <p className="text-blue-200/50 text-xs">Built for modern healthcare workflows</p>
        </div>
      </div>

      {/* ── RIGHT: Login Form ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 sm:p-12">

        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <span className="text-4xl">🩺</span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2 tracking-wide">
            JEEVAN<span className="font-light text-indigo-500">setu</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Smart Hospital Coordination System</p>
          {/* Mobile system status */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400">System Online</span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-[400px] animate-[scaleIn_0.4s_ease-out]">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 transition-all duration-300">

            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-7">
              Sign in to your account to continue
            </p>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-5 animate-[fadeIn_0.2s_ease-out]">
                <span>❌</span><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-base pointer-events-none select-none">
                    👤
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-indigo-600"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!username.trim() || loading}
                className="group w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 text-sm shadow-md hover:shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">or</span>
              </div>
            </div>

            {/* Signup link */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
              >
                Create one free
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
            © 2026 JEEVANsetu • Healthcare Coordination
          </p>
        </div>
      </div>

      {/* ── Keyframes ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
