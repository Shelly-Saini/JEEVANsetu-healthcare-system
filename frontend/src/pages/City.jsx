import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2, Zap, RotateCcw, CheckCircle2, BarChart3, Map as MapIcon, Hospital } from 'lucide-react';
import { cityService } from '../services/api';
import { useAuth } from '../utils/AuthContext.jsx';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { Button, ProgressBar } from '../components/ui/Button.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import Badge from '../components/ui/Badge.jsx';

const CityMap = lazy(() => import('../components/CityMap'));

const LEVEL_TONE = { High: 'critical', Medium: 'warning', Low: 'success' };
const LEVEL_BAR = { High: '#c22b3f', Medium: '#b5730a', Low: '#12946b' };
const CITIES = ['Delhi', 'Mumbai', 'Bangalore'];

function AnimatedNumber({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20) || 1;
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(interval); } else setCount(start);
    }, 20);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{count}</span>;
}

function HospitalCard({ hospital }) {
  const tone = LEVEL_TONE[hospital.level] || 'success';
  return (
    <Card hover className={hospital.level === 'High' ? 'border-status-critical/40' : ''}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-surface-800 text-sm leading-tight">{hospital.name}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{hospital.city}</p>
        </div>
        <Badge tone={tone}>{hospital.level}</Badge>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={`text-3xl font-black ${tone === 'critical' ? 'text-status-critical' : tone === 'warning' ? 'text-status-warning' : 'text-status-success'}`}>
          <AnimatedNumber value={hospital.stressScore} />
        </span>
        <div>
          <p className="text-xs text-surface-400">Stress Score</p>
          <p className="text-xs text-surface-400">/ 100</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <MiniBar label="OPD Load" value={hospital.opdLoad} />
        <MiniBar label="Bed Occupancy" value={hospital.bedOccupancy} />
        <MiniBar label="Doctor Availability" value={hospital.doctorAvailability} invert />
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs text-surface-500 border-t border-surface-100 pt-3">
        <span>{hospital.stats.activeOpdPatients} active OPD</span>
        <span>{hospital.stats.availableBeds} beds free</span>
        <span>{hospital.stats.availableDoctors} doctors avail.</span>
        <span>{hospital.stats.totalBeds} total beds</span>
      </div>
    </Card>
  );
}

function MiniBar({ label, value, invert = false }) {
  const pct = Math.min(value, 100);
  const tone = invert
    ? (pct >= 60 ? 'success' : pct >= 35 ? 'warning' : 'critical')
    : (pct >= 75 ? 'critical' : pct >= 45 ? 'warning' : 'success');
  return (
    <div>
      <div className="flex justify-between text-xs text-surface-500 mb-1"><span>{label}</span><span className="font-semibold">{value}%</span></div>
      <ProgressBar value={pct} tone={tone} />
    </div>
  );
}

const getStressLevel = (score) => (score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low');

const applySurge = (data) => {
  const surgedHospitals = data.hospitals.map((h) => {
    const stressScore = Math.min(h.stressScore + 20, 100);
    return { ...h, stressScore, opdLoad: Math.min(h.opdLoad + 30, 100), bedOccupancy: Math.min(h.bedOccupancy + 20, 100), level: getStressLevel(stressScore) };
  });
  const avgStressScore = Math.round(surgedHospitals.reduce((s, h) => s + h.stressScore, 0) / surgedHospitals.length);
  const best = [...surgedHospitals].sort((a, b) => a.stressScore - b.stressScore)[0];
  return {
    ...data,
    hospitals: surgedHospitals,
    cityStats: { ...data.cityStats, avgStressScore },
    bestHospital: {
      ...data.bestHospital,
      ...best,
      // Recompute the reason text from the surged numbers — the original
      // version carried over the pre-surge sentence verbatim, so it kept
      // quoting the old stress score even after the displayed score changed.
      reason: `Lowest stress score (${best.stressScore}/100) with ${best.stats.availableBeds} beds available`,
    },
  };
};

export default function City() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surging, setSurging] = useState(false);
  const [city, setCity] = useState('Delhi');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-param-change reset
    setLoading(true);
    setError(null);
    setSurging(false);
    const params = user.role === 'city_admin' ? { cityId: user.cityId } : { city };
    cityService.get(params)
      .then((res) => { setData(res.data.data); setOriginalData(res.data.data); })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [city, user.role, user.cityId]);

  const toggleSurge = () => {
    setData(surging ? originalData : applySurge(originalData));
    setSurging((s) => !s);
  };

  if (loading) return <CitySkeleton />;
  if (error) return <ErrorState description={error} onRetry={() => setCity((c) => c)} />;
  if (!data) return null;

  const { cityStats, hospitals, bestHospital } = data;
  const chartData = hospitals.map((h) => ({ name: h.name.split(' ')[0], score: h.stressScore, level: h.level }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-surface-900">City Operations</h1>
          <p className="text-sm text-surface-500 mt-0.5">Live load across {cityStats.totalHospitals} hospitals</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user.role !== 'city_admin' && (
            <select value={city} onChange={(e) => setCity(e.target.value)} className="text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {surging && <Badge tone="critical">Surge Mode Active</Badge>}
          <Button
            size="md" variant={surging ? 'secondary' : 'danger'} icon={surging ? RotateCcw : Zap}
            onClick={toggleSurge}
          >
            {surging ? 'Reset' : 'Simulate Surge'}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-surface-400 -mt-4">
        "Simulate Surge" is a local what-if preview — it doesn't change real data, just shows how the dashboard would react to a load spike.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total hospitals" value={<AnimatedNumber value={cityStats.totalHospitals} />} icon={Building2} tone="brand" />
        <StatCard label="Avg stress score" value={<>{<AnimatedNumber value={cityStats.avgStressScore} />}/100</>} icon={BarChart3} tone="warning" />
        <StatCard label="Critical hospitals" value={cityStats.critical} icon={Hospital} tone="critical" />
        <StatCard label="Available beds" value={<AnimatedNumber value={cityStats.totalAvailableBedsCity} />} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="border-status-success/30 bg-status-successBg/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <Badge tone="success" icon={CheckCircle2}>Recommended Hospital</Badge>
            <h2 className="text-lg font-bold text-surface-900 mt-2">{bestHospital.name}</h2>
            <p className="text-sm text-surface-500 mt-0.5">{bestHospital.reason}</p>
          </div>
          <div className="text-center shrink-0">
            <p className="text-3xl font-black text-status-success"><AnimatedNumber value={bestHospital.stressScore} /></p>
            <p className="text-xs text-surface-400">Stress Score</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Stress score comparison" icon={BarChart3} />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={40}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#98a3ac' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#98a3ac' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #dfe4e8' }} formatter={(v) => [`${v}/100`, 'Stress Score']} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={LEVEL_BAR[entry.level] ?? '#159e8c'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader title="Hospital locations" icon={MapIcon} />
        <Suspense fallback={<div className="h-80 flex items-center justify-center text-surface-400 text-sm">Loading map…</div>}>
          <CityMap hospitals={hospitals} city={city} />
        </Suspense>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wide mb-4">All hospitals — sorted by stress</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {hospitals.map((h) => <HospitalCard key={h.hospitalId} hospital={h} />)}
        </div>
      </div>
    </div>
  );
}

function CitySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-100 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-surface-100 rounded-xl" />)}</div>
      <div className="h-40 bg-surface-100 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 bg-surface-100 rounded-2xl" />)}</div>
    </div>
  );
}
