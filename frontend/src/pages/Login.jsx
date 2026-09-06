import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Radio, BrainCircuit, BarChart3, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';

const FEATURES = [
  { icon: Radio, text: 'Real-time hospital load monitoring' },
  { icon: BrainCircuit, text: 'Explainable smart admission decisions' },
  { icon: BarChart3, text: 'Stress trends & bed-shortage forecasting' },
];

const DEMO_ACCOUNTS = [
  { label: 'Hospital Admin', email: 'admin@apollo.in' },
  { label: 'Doctor', email: 'doctor@hinduja.in' },
  { label: 'Operations Staff', email: 'opd@apollo.in' },
  { label: 'City Admin', email: 'cityadmin@jeevansetu.in' },
];

export default function Login() {
  const { login, homeFor } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) { setError(result.msg); return; }
    navigate(homeFor(result.user.role), { replace: true });
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* ── LEFT: Branding ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-950 flex-col items-center justify-center p-12">
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-brand-300/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-sm animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="text-white" size={30} strokeWidth={2} />
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1 leading-tight">
            JEEVAN<span className="font-light text-brand-200">setu</span>
          </h1>
          <p className="text-brand-100 text-sm font-medium tracking-wide mb-8">
            Healthcare Operations Intelligence Platform
          </p>

          <div className="space-y-3 text-left">
            {FEATURES.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 bg-white/[0.07] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 transition-colors hover:bg-white/[0.11]"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <f.icon size={16} className="text-brand-100" strokeWidth={2} />
                </div>
                <span className="text-white/90 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-medium tracking-wide">System Online</span>
          </div>
          <p className="text-brand-200/50 text-xs">Multi-city hospital operations, modeled end-to-end</p>
        </div>
      </div>

      {/* ── RIGHT: Login Form ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="lg:hidden text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-2">
            <Activity className="text-white" size={22} />
          </div>
          <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
            JEEVAN<span className="font-light text-brand-600">setu</span>
          </h1>
        </div>

        <div className="w-full max-w-[400px] animate-slide-up">
          <div className="bg-white rounded-2xl shadow-raised border border-surface-200 p-8">
            <h2 className="text-2xl font-bold text-surface-900 mb-1 tracking-tight">Welcome back</h2>
            <p className="text-sm text-surface-500 mb-7">Sign in to your hospital operations account</p>

            {error && (
              <div className="flex items-start gap-2 bg-status-criticalBg border border-status-critical/20 text-status-critical text-sm rounded-xl px-4 py-3 mb-5 animate-fade-in">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-widest mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@hospital.in"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!email.trim() || !password || loading}
                className="group w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-surface-400">demo accounts</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className="text-left px-3 py-2 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  <p className="text-[11px] font-semibold text-surface-700">{d.label}</p>
                  <p className="text-[10px] text-surface-400 truncate">{d.email}</p>
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-surface-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                Create one
              </Link>
            </p>
          </div>
          <p className="text-center text-xs text-surface-400 mt-6">© 2026 JEEVANsetu • Healthcare Operations Intelligence</p>
        </div>
      </div>
    </div>
  );
}
