import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, CheckCircle2, AlertCircle, UserCog, Stethoscope, ClipboardList, Building2 } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { hospitalService } from '../services/api.js';

const ROLES = [
  { value: 'admin',      label: 'Hospital Admin', desc: 'Full control of one hospital', icon: UserCog },
  { value: 'doctor',     label: 'Doctor',         desc: 'OPD, doctors & admissions',    icon: Stethoscope },
  { value: 'staff',      label: 'Ops Staff',      desc: 'Beds & inventory',             icon: ClipboardList },
  { value: 'city_admin', label: 'City Admin',     desc: 'Read-only, city-wide',         icon: Building2 },
];

// In a real deployment this would come from a /cities endpoint — kept static
// here since the seed data only models these three cities.
const CITIES = [
  { id: 'city1', name: 'Delhi' },
  { id: 'city2', name: 'Mumbai' },
  { id: 'city3', name: 'Bangalore' },
];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', hospitalId: '', cityId: '' });
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [hospitalsError, setHospitalsError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadHospitals = () => {
    setHospitalsLoading(true);
    setHospitalsError('');
    hospitalService.getAll()
      .then((res) => setHospitals(res.data?.data ?? []))
      .catch((err) => setHospitalsError(err.response?.data?.message || err.message || 'Could not load hospital list'))
      .finally(() => setHospitalsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    loadHospitals();
  }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Name, email, and a password of at least 8 characters are required.');
      return;
    }
    if (form.role !== 'city_admin' && !form.hospitalId) {
      setError('Please select the hospital this account belongs to.');
      return;
    }
    if (form.role === 'city_admin' && !form.cityId) {
      setError('Please select the city this account oversees.');
      return;
    }

    setLoading(true);
    const result = await signup(form);
    setLoading(false);
    if (!result.ok) { setError(result.msg); return; }
    setSuccess(true);
    setTimeout(() => navigate('/dashboard'), 900);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mx-auto mb-2">
            <Activity className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight">
            JEEVAN<span className="font-light text-brand-600">setu</span>
          </h1>
          <p className="text-sm text-surface-500 mt-1">Healthcare Operations Intelligence Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-raised border border-surface-200 p-8">
          <h2 className="text-xl font-bold text-surface-900 mb-1">Create account</h2>
          <p className="text-sm text-surface-500 mb-6">Provision a new operations account</p>

          {success && (
            <div className="flex items-center gap-2 bg-status-successBg border border-status-success/20 text-status-success text-sm rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 size={16} /><span>Account created — taking you in…</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-status-criticalBg border border-status-critical/20 text-status-critical text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={16} /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Full name</label>
              <input
                type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Dr. Priya Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="you@hospital.in"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Password</label>
              <input
                type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value} type="button" onClick={() => set('role', r.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                      form.role === r.value ? 'border-brand-500 bg-brand-50' : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <r.icon size={15} className={form.role === r.value ? 'text-brand-600 mt-0.5' : 'text-surface-400 mt-0.5'} />
                    <span>
                      <p className={`text-xs font-semibold ${form.role === r.value ? 'text-brand-700' : 'text-surface-700'}`}>{r.label}</p>
                      <p className="text-[11px] text-surface-400">{r.desc}</p>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {form.role === 'city_admin' ? (
              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">City</label>
                <select
                  value={form.cityId} onChange={(e) => set('cityId', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a city…</option>
                  {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Hospital</label>
                <select
                  value={form.hospitalId} onChange={(e) => set('hospitalId', e.target.value)}
                  disabled={hospitalsLoading || !!hospitalsError}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                >
                  <option value="">
                    {hospitalsLoading ? 'Loading hospitals…' : hospitalsError ? 'Could not load hospitals' : 'Select a hospital…'}
                  </option>
                  {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
                </select>
                {hospitalsError && (
                  <button
                    type="button" onClick={loadHospitals}
                    className="text-xs text-brand-600 font-semibold hover:text-brand-700 mt-1.5"
                  >
                    {hospitalsError} — tap to retry
                  </button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={success || loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all text-sm shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-surface-400 mt-6">© 2026 JEEVANsetu • Healthcare Operations Intelligence</p>
      </div>
    </div>
  );
}
