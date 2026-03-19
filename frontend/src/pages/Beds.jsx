import { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../utils/hospitalStore.jsx';
import Tooltip from '../components/Tooltip.jsx';
import ApiStatusBanner from '../components/ApiStatusBanner.jsx';

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const PATIENT_NAMES = [
  'Ramesh Yadav', 'Sunita Devi', 'Mohan Lal', 'Anil Kumar', 'Geeta Singh',
  'Deepak Mishra', 'Lalita Verma', 'Suresh Tiwari', 'Rekha Pandey', 'Vijay Gupta',
];

const INITIAL_BEDS = [
  // ICU (10)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `ICU-${String(i + 1).padStart(2, '0')}`,
    type: 'ICU',
    status: i < 7 ? 'Occupied' : i < 9 ? 'Available' : 'Cleaning',
    patient: i < 7 ? PATIENT_NAMES[i] : null,
  })),
  // General (20)
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `GEN-${String(i + 1).padStart(2, '0')}`,
    type: 'General',
    status: i < 12 ? 'Occupied' : i < 18 ? 'Available' : 'Cleaning',
    patient: i < 12 ? PATIENT_NAMES[i % 10] : null,
  })),
  // Emergency (10)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `EMG-${String(i + 1).padStart(2, '0')}`,
    type: 'Emergency',
    status: i < 5 ? 'Occupied' : i < 8 ? 'Available' : 'Cleaning',
    patient: i < 5 ? PATIENT_NAMES[i] : null,
  })),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const getOccupancyStatus = (availablePct) => {
  if (availablePct < 20) return { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  if (availablePct < 40) return { label: 'Warning',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  return                        { label: 'Stable',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
};

const STATUS_STYLE = {
  Available: 'bg-green-100 text-green-700',
  Occupied:  'bg-red-100 text-red-700',
  Cleaning:  'bg-yellow-100 text-yellow-700',
};

const BAR_COLOR = (occupiedPct) =>
  occupiedPct >= 80 ? 'bg-red-500' : occupiedPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';

// Cleaning timer hook — tracks minutes since a bed entered Cleaning state
function useCleaningMinutes(cleaningStartedAt) {
  const [mins, setMins] = useState(() =>
    cleaningStartedAt ? Math.floor((Date.now() - cleaningStartedAt) / 60000) : 0
  );
  useEffect(() => {
    if (!cleaningStartedAt) return;
    const id = setInterval(() => setMins(Math.floor((Date.now() - cleaningStartedAt) / 60000)), 30000);
    return () => clearInterval(id);
  }, [cleaningStartedAt]);
  return mins;
}

function CleaningTimer({ startedAt }) {
  const mins = useCleaningMinutes(startedAt);
  return <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-1">🧹 {mins} min{mins !== 1 ? 's' : ''}</span>;
}

function SummaryCard({ label, count, total, color, icon }) {
  const percentage = pct(count, total);
  const colors = {
    green:  'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    red:    'bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-300',
    blue:   'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-300',
  };
  return (
    <div className={`rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-60">{icon} {label}</p>
      <p className="text-3xl font-black mt-1">{count}</p>
      <p className="text-xs mt-1 opacity-70">{percentage}% of total</p>
    </div>
  );
}

function ProgressBar({ pct: value, color }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function BedTypeCard({ type, beds }) {
  const total     = beds.length;
  const occupied  = beds.filter(b => b.status === 'Occupied').length;
  const available = beds.filter(b => b.status === 'Available').length;
  const cleaning  = beds.filter(b => b.status === 'Cleaning').length;
  const occPct    = pct(occupied, total);
  const availPct  = pct(available, total);
  const status    = getOccupancyStatus(availPct);

  const borderCls = availPct < 20
    ? 'border-red-400 shadow-red-100 dark:shadow-red-900/20'
    : availPct < 40
    ? 'border-yellow-400'
    : 'border-gray-100 dark:border-gray-800';
  const bgTint = availPct < 20 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900';

  return (
    <div className={`${bgTint} rounded-2xl border-2 ${borderCls} shadow-sm p-5 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">{type} Beds</h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
      </div>
      {availPct < 20 && (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-3">⚠️ Only {available} {type} bed{available !== 1 ? 's' : ''} left</p>
      )}
      <div className="grid grid-cols-4 gap-2 text-center mb-4">
        {[['Total', total, 'text-gray-700'], ['Occupied', occupied, 'text-red-600'], ['Available', available, 'text-green-600'], ['Cleaning', cleaning, 'text-yellow-600']].map(([l, v, c]) => (
          <div key={l}>
            <p className={`text-xl font-black ${c} dark:opacity-90`}>{v}</p>
            <p className="text-xs text-gray-400">{l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Occupancy</span><span className="font-semibold">{occPct}%</span>
        </div>
        <ProgressBar pct={occPct} color={BAR_COLOR(occPct)} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Beds() {
  const { sharedBeds, setSharedBeds, error, stale, refetch } = useHospital();
  // sharedBeds contains aggregated rows from API: {id, type, total, available, occupied, cleaning, occupancyPct}
  // Map to the individual-bed shape the UI expects only when API data arrives
  const [beds, setBeds] = useState([]);

  useEffect(() => {
    if (!sharedBeds.length) return;
    // Expand each aggregated row into individual bed slot objects for the table
    const expanded = [];
    sharedBeds.forEach(row => {
      const statusCounts = [
        ...Array(row.occupied  || 0).fill('Occupied'),
        ...Array(row.cleaning  || 0).fill('Cleaning'),
        ...Array(row.available || 0).fill('Available'),
      ];
      statusCounts.forEach((status, i) => {
        expanded.push({
          id:      `${row.type}-${String(i + 1).padStart(2, '0')}`,
          type:    row.type,
          status,
          patient: status === 'Occupied' ? PATIENT_NAMES[i % PATIENT_NAMES.length] : null,
          _rowId:  row.id,
        });
      });
    });
    setBeds(expanded);
  }, [sharedBeds]);

  const setSharedBedsProxy = (updater) => {
    setBeds(updater);
  };
  const [lastUpdated, setLastUpdated] = useState({ time: fmt(new Date()), ts: Date.now(), prevOccupied: 0 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (now - lastUpdated.ts >= 10000) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [lastUpdated.ts]);
  const [filter,      setFilter]      = useState('All');

  const stamp = (prev) => {
    const prevOccupied = prev.filter(b => b.status === 'Occupied').length;
    setLastUpdated({ time: fmt(new Date()), ts: Date.now(), prevOccupied });
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total     = beds.length;
  const occupied  = useMemo(() => beds.filter(b => b.status === 'Occupied').length,  [beds]);
  const available = useMemo(() => beds.filter(b => b.status === 'Available').length, [beds]);
  const cleaning  = useMemo(() => beds.filter(b => b.status === 'Cleaning').length,  [beds]);

  const byType = (type) => beds.filter(b => b.type === type);

  // Best available bed type
  const bestType = ['ICU', 'General', 'Emergency'].reduce((best, type) => {
    const t = byType(type);
    const avail = t.filter(b => b.status === 'Available').length;
    const bestAvail = byType(best).filter(b => b.status === 'Available').length;
    return avail > bestAvail ? type : best;
  }, 'General');

  // Critical alerts
  const criticalTypes = ['ICU', 'General', 'Emergency'].filter(type => {
    const t = byType(type);
    return pct(t.filter(b => b.status === 'Available').length, t.length) < 20;
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  const assignBed = () => {
    setBeds(prev => {
      stamp(prev);
      const idx = prev.findIndex(b => b.status === 'Available');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'Occupied', patient: PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)] };
      return updated;
    });
  };

  const releaseBed = () => {
    setBeds(prev => {
      stamp(prev);
      const idx = prev.findIndex(b => b.status === 'Occupied');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'Cleaning', patient: null, cleaningStartedAt: Date.now() };
      return updated;
    });
  };

  const cleanBed = () => {
    setBeds(prev => {
      stamp(prev);
      const idx = prev.findIndex(b => b.status === 'Cleaning');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'Available', patient: null };
      return updated;
    });
  };

  const simulateSurge = () => {
    setBeds(prev => {
      stamp(prev);
      const updated = [...prev];
      let surged = 0;
      for (let i = 0; i < updated.length && surged < 5; i++) {
        if (updated[i].status === 'Available') {
          updated[i] = { ...updated[i], status: 'Occupied', patient: PATIENT_NAMES[surged % PATIENT_NAMES.length] };
          surged++;
        }
      }
      return updated;
    });
  };

  const STATUS_ORDER = { Occupied: 0, Cleaning: 1, Available: 2 };
  const filtered = (filter === 'All' ? beds : beds.filter(b => b.type === filter || b.status === filter))
    .slice().sort((a, b) => {
      const sd = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      return sd !== 0 ? sd : a.id.localeCompare(b.id);
    });
  const hasOccupied = occupied > 0;
  const hasCleaning  = cleaning > 0;
  const trend        = occupied - lastUpdated.prevOccupied;

  return (
    <div className="space-y-6">
      <ApiStatusBanner error={error} stale={stale} onRetry={refetch} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bed Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time bed allocation & capacity monitoring</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last updated: {lastUpdated.time}{now - lastUpdated.ts < 10000 && <span className="ml-1 text-green-500 font-medium">· just now</span>}
            {trend !== 0 && (
              <span className={`ml-2 font-semibold ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {trend > 0 ? `+${trend} occupied` : `${Math.abs(trend)} freed`}
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Tooltip text="Assigns an available bed to an incoming patient">
              <button onClick={assignBed} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors">🛏 Assign Bed</button>
            </Tooltip>
            <Tooltip text="Marks an occupied bed as Cleaning">
              <button onClick={releaseBed} disabled={!hasOccupied} className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">🔄 Release Bed</button>
            </Tooltip>
            <Tooltip text="Marks a cleaning bed as Available">
              <button onClick={cleanBed} disabled={!hasCleaning} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">✅ Mark Clean</button>
            </Tooltip>
            <Tooltip text="Fills 5 available beds to simulate a patient surge">
              <button onClick={simulateSurge} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors">⚡ Simulate Surge</button>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Use action buttons to assign, release, or clean beds</p>
        </div>
      </div>

      {/* Critical alerts */}
      {criticalTypes.map(type => (
        <div key={type} className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 animate-pulse">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{type} beds running low — less than 20% available</p>
        </div>
      ))}

      {/* Best bed suggestion */}
      <div title="Based on highest availability percentage and lowest occupancy" className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 flex items-center gap-3 cursor-help">
        <span className="text-indigo-500">💡</span>
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Best available bed type: <span className="font-bold">{bestType}</span> — highest availability
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Beds"     count={total}     total={total}     color="blue"   icon="🛏️" />
        <SummaryCard label="Available"      count={available} total={total}     color="green"  icon="✅" />
        <SummaryCard label="Occupied"       count={occupied}  total={total}     color="red"    icon="🔴" />
        <SummaryCard label="Cleaning"       count={cleaning}  total={total}     color="yellow" icon="🧹" />
      </div>

      {/* Bed type breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {['ICU', 'General', 'Emergency'].map(type => (
          <BedTypeCard key={type} type={type} beds={byType(type)} />
        ))}
      </div>

      {/* Bed list table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">🛏️ Bed List</h2>
          <div className="flex flex-wrap gap-2">
            {['All', 'ICU', 'General', 'Emergency', 'Available', 'Occupied', 'Cleaning'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >{f}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Bed ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Patient</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(bed => (
                <tr key={bed.id} className="transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{bed.id}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{bed.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[bed.status]}`}>{bed.status}</span>
                    {bed.status === 'Cleaning' && bed.cleaningStartedAt && <CleaningTimer startedAt={bed.cleaningStartedAt} />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{bed.patient ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
