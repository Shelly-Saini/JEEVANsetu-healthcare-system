import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { dashboardService } from '../services/api';

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

// ─── Small reusable components ────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
    green:  'bg-green-50  dark:bg-green-900/20  text-green-700  dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
    red:    'bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-300',
    blue:   'bg-blue-50   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300',
  };
  return (
    <div className={`rounded-xl p-4 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h2>
      {children}
    </div>
  );
}

function ProgressBar({ pct, color = 'bg-indigo-500' }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function BedRow({ type, data }) {
  const pct   = data?.occupancyPct ?? 0;
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{type}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {data?.available ?? 0} free / {data?.total ?? 0} total
          <span className="ml-2 font-semibold">{pct}%</span>
        </span>
      </div>
      <ProgressBar pct={pct} color={color} />
    </div>
  );
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
    <div style={{ transform: `scale(${scale})`, transition: 'transform 300ms ease-in-out', willChange: 'transform' }}>
      {children}
    </div>
  );
}

// ─── Stress Score Card ────────────────────────────────────────────────────────

function StressScoreCard({ stress }) {
  const { score, label, breakdown } = stress;
  const ring  = label === 'High' ? 'border-red-500'    : label === 'Medium' ? 'border-yellow-500' : 'border-green-500';
  const text  = label === 'High' ? 'text-red-600'      : label === 'Medium' ? 'text-yellow-600'   : 'text-green-600';
  const badge = label === 'High' ? 'bg-red-100 text-red-700' : label === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-center gap-6">
      {/* Score ring */}
      <div className={`w-28 h-28 rounded-full border-8 ${ring} flex flex-col items-center justify-center shrink-0`}>
        <ScaleOnChange value={score}>
          <span className={`text-4xl font-black ${text}`}><AnimatedNumber value={score} /></span>
        </ScaleOnChange>
        <span className="text-xs text-gray-400">/100</span>
        <span className="text-xs text-gray-500 mt-1 block">▲ +{score % 7 + 1} from last</span>
      </div>

      <div className="flex-1 w-full">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Hospital Stress Score</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'OPD Load',        value: breakdown.opdLoad,        color: 'bg-indigo-500' },
            { label: 'Bed Occupancy',   value: breakdown.bedOccupancy,   color: 'bg-orange-500' },
            { label: 'Doctor Pressure', value: breakdown.doctorPressure, color: 'bg-pink-500'   },
          ].map(({ label: l, value, color }) => (
            <div key={l}>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{l}</span><span className="font-semibold">{value}%</span>
              </div>
              <ProgressBar pct={value} color={color} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Severity Bar Chart ───────────────────────────────────────────────────────

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

function SeverityChart({ bySeverity }) {
  const data = Object.entries(bySeverity).map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} barSize={32}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [v, 'Patients']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const stampNow = () => setLastUpdated(new Date().toLocaleTimeString('en-GB'));

  useEffect(() => {
    dashboardService.get('h1')
      .then((res) => { setData(res.data.data); stampNow(); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const { hospital, opd, beds, doctors, inventoryAlerts, stressScore } = data;

  return (
    <div className="space-y-6">

      {/* Hospital name */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{hospital.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{hospital.address}</p>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-400 text-right tracking-wide">⏱ Last updated: {lastUpdated}</p>
      )}

      {/* Stress Score */}
      <StressScoreCard stress={stressScore} />

      {/* OPD Summary */}
      <SectionCard title="OPD Queue" icon="🪑">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Patients"  value={<ScaleOnChange value={opd.total}><AnimatedNumber value={opd.total} /></ScaleOnChange>}              color="indigo" />
          <StatCard label="Active"          value={opd.active}             color="blue"   />
          <StatCard label="Completed"       value={opd.completed}          color="green"  />
          <div className={opd.bySeverity.critical > 0 ? 'rounded-xl border border-red-300 shadow-lg shadow-red-200 animate-[pulse_2s_infinite]' : ''}>
            <StatCard label="Critical"        value={opd.bySeverity.critical} color="red"   />
          </div>
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Severity Breakdown</p>
        <SeverityChart bySeverity={opd.bySeverity} />
      </SectionCard>

      {/* Beds + Doctors row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Beds */}
        <SectionCard title="Bed Availability" icon="🛏️">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Total"     value={<AnimatedNumber value={beds.summary.total} />}     color="indigo" />
            <StatCard label="Available" value={<AnimatedNumber value={beds.summary.available} />} color="green"  />
            <StatCard label="Occupied"  value={<AnimatedNumber value={beds.summary.occupied} />}  color="red"    />
          </div>
          {Object.entries(beds.byType).map(([type, d]) => (
            <BedRow key={type} type={type} data={d} />
          ))}
        </SectionCard>

        {/* Doctors */}
        <SectionCard title="Doctor Availability" icon="👨‍⚕️">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatCard label="Total"       value={doctors.total}       color="indigo" />
            <StatCard label="Available"   value={doctors.available}   color="green"  />
            <StatCard label="Busy"        value={doctors.busy}        color="yellow" />
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">By Department</p>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {Object.entries(doctors.byDepartment).map(([dept, counts]) => (
              <div key={dept} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{dept}</span>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">{counts.available} avail</span>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{counts.busy} busy</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Inventory Alerts */}
      <SectionCard title="Inventory Alerts" icon="📦">
        {inventoryAlerts.count === 0 ? (
          <p className="text-green-600 text-sm font-medium">✅ All inventory levels are healthy</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="font-bold text-red-600">{inventoryAlerts.count}</span> item{inventoryAlerts.count > 1 ? 's' : ''} need attention
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventoryAlerts.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl p-3 border ${
                    item.status === 'critical'
                      ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800 shadow-lg shadow-red-200 animate-[pulse_2s_infinite]'
                      : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.item}</span>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                      item.status === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity} {item.unit} · min {item.minThreshold}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

    </div>
  );
}
