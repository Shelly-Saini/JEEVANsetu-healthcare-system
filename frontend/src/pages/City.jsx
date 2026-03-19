import { lazy, Suspense, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cityService } from '../services/api';

const CityMap = lazy(() => import('../components/CityMap'));

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20);
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(interval); }
      else { setCount(start); }
    }, 20);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{count}</span>;
}

// ─── Scale On Change ────────────────────────────────────────────────────────

function ScaleOnChange({ value, children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    setScale(1.05);
    const t = setTimeout(() => setScale(1), 300);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span style={{ display: 'inline-block', transform: `scale(${scale})`, transition: 'transform 300ms ease-in-out' }}>
      {children}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const levelStyle = {
  High:   { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',   bar: '#ef4444', ring: 'border-red-400',    text: 'text-red-500'    },
  Medium: { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', bar: '#eab308', ring: 'border-yellow-400', text: 'text-yellow-500' },
  Low:    { badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   bar: '#22c55e', ring: 'border-green-400',  text: 'text-green-500'  },
};

// ─── Small Components ─────────────────────────────────────────────────────────

function StatBadge({ label, value, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    green:  'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-300',
    red:    'bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-60 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

function MiniBar({ label, value, invert = false }) {
  const pct   = Math.min(value, 100);
  // invert=true means high value is GOOD (e.g. doctor availability)
  const color = invert
    ? (pct >= 60 ? 'bg-green-400' : pct >= 35 ? 'bg-yellow-400' : 'bg-red-400')
    : (pct >= 75 ? 'bg-red-400'   : pct >= 45 ? 'bg-yellow-400' : 'bg-green-400');
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{label}</span><span className="font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HospitalCard({ hospital }) {
  const { badge, ring, text } = levelStyle[hospital.level] || levelStyle.Low;
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border-2 ${ring} p-5 flex flex-col gap-4 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl ${
      hospital.level === 'High'   ? 'shadow-lg shadow-red-200 dark:shadow-red-900/40 animate-pulse' :
      hospital.level === 'Medium' ? 'shadow-md shadow-yellow-100 dark:shadow-yellow-900/20' :
      'shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{hospital.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{hospital.city}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${badge}`}>{hospital.level}</span>
      </div>

      <div className="flex items-center gap-3">
        <ScaleOnChange value={hospital.stressScore}>
          <span className={`text-4xl font-black ${text}`}><AnimatedNumber value={hospital.stressScore} /></span>
        </ScaleOnChange>
        <div>
          <p className="text-xs text-gray-400">Stress Score</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">/100</p>
        </div>
      </div>

      <div className="space-y-2">
        <MiniBar label="OPD Load"            value={hospital.opdLoad} />
        <MiniBar label="Bed Occupancy"        value={hospital.bedOccupancy} />
        <MiniBar label="Doctor Availability"  value={hospital.doctorAvailability} invert />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
        <span>🪑 {hospital.stats.activeOpdPatients} active OPD</span>
        <span>🛏️ {hospital.stats.availableBeds} beds free</span>
        <span>👨‍⚕️ {hospital.stats.availableDoctors} doctors avail</span>
        <span>📊 {hospital.stats.totalBeds} total beds</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
      </div>
      <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
      </div>
    </div>
  );
}

// ─── Surge Simulation ────────────────────────────────────────────────────────

const getStressLevel = (score) =>
  score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low';

const applySurge = (data) => {
  const surgedHospitals = data.hospitals.map((h) => {
    const stressScore    = Math.min(h.stressScore    + 20, 100);
    const opdLoad        = Math.min(h.opdLoad        + 30, 100);
    const bedOccupancy   = Math.min(h.bedOccupancy   + 20, 100);
    return { ...h, stressScore, opdLoad, bedOccupancy, level: getStressLevel(stressScore) };
  });

  const avgStressScore = Math.round(
    surgedHospitals.reduce((s, h) => s + h.stressScore, 0) / surgedHospitals.length
  );

  const best = [...surgedHospitals].sort((a, b) => a.stressScore - b.stressScore)[0];

  return {
    ...data,
    hospitals:   surgedHospitals,
    cityStats:   { ...data.cityStats, avgStressScore },
    bestHospital: { ...data.bestHospital, hospitalId: best.hospitalId, name: best.name, stressScore: best.stressScore },
  };
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function City() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [surging, setSurging] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [city,    setCity]    = useState('Delhi');

  const stampNow = () => setLastUpdated(new Date().toLocaleTimeString('en-GB'));

  useEffect(() => {
    setLoading(true);
    setError(null);
    cityService.get(city)
      .then((res) => { setData(res.data.data); setOriginalData(res.data.data); stampNow(); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [city]);

  const handleSurgeToggle = () => {
    if (surging) {
      setData(originalData);
    } else {
      setData(applySurge(originalData));
    }
    setSurging((s) => !s);
    stampNow();
  };

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-red-500 font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-1">Make sure the backend is running on port 5000</p>
      </div>
    </div>
  );

  const { cityStats, hospitals, bestHospital } = data;

  const chartData = hospitals.map((h) => ({
    name:  h.name.split(' ')[0],
    score: h.stressScore,
    level: h.level,
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">City Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time health system load across {cityStats.totalHospitals} hospitals
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* City selector — drives which hospitals are shown */}
          <select
            value={city}
            onChange={(e) => { setSurging(false); setCity(e.target.value); }}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="Delhi">🏙️ Delhi</option>
            <option value="Mumbai">🏙️ Mumbai</option>
            <option value="Bangalore">🏙️ Bangalore</option>
          </select>
          {surging && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-600 animate-pulse">
              ⚡ Surge Mode Active
            </span>
          )}
          <button
            onClick={handleSurgeToggle}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              surging
                ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-red-200'
            }`}
          >
            {surging ? '↩ Reset Data' : '⚡ Simulate Surge'}
          </button>
        </div>
      </div>

      {/* City Stats */}
      {lastUpdated && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-right -mt-4">Last updated: {lastUpdated}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBadge label="Total Hospitals"    value={<AnimatedNumber value={cityStats.totalHospitals} />}              color="indigo" />
        <StatBadge label="Avg Stress Score"   value={<ScaleOnChange value={cityStats.avgStressScore}><><AnimatedNumber value={cityStats.avgStressScore} />/100</></ScaleOnChange>}     color="yellow" />
        <StatBadge label="Critical Hospitals" value={cityStats.critical}                    color="red"    />
        <StatBadge label="Available Beds"     value={<AnimatedNumber value={cityStats.totalAvailableBedsCity} />}      color="green"  />
      </div>

      {/* Best Hospital */}
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
              ✅ Recommended Hospital
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{bestHospital.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{bestHospital.reason}</p>
        </div>
        <div className="text-center shrink-0">
          <ScaleOnChange value={bestHospital.stressScore}>
            <p className="text-4xl font-black text-green-600"><AnimatedNumber value={bestHospital.stressScore} /></p>
          </ScaleOnChange>
          <p className="text-xs text-gray-400">Stress Score</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          📊 Stress Score Comparison
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={40}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}/100`, 'Stress Score']}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={levelStyle[entry.level]?.bar ?? '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hospital Map */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          🗺️ Hospital Locations
        </h2>
        <Suspense fallback={<div className="h-80 flex items-center justify-center text-gray-400 text-sm">Loading map...</div>}>
          <CityMap hospitals={hospitals} city={city} />
        </Suspense>
      </div>

      {/* Hospital Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          🏥 All Hospitals — sorted by stress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospitals.map((h) => <HospitalCard key={h.hospitalId} hospital={h} />)}
        </div>
      </div>

    </div>
  );
}
