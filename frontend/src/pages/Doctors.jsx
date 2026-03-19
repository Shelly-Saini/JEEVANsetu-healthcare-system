import { useState, useMemo, useEffect, useRef } from 'react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { onEvent, emitEvent } from '../utils/eventBus.js';
import Tooltip from '../components/Tooltip.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Cardiology', 'General', 'Emergency', 'Orthopedic'];

const INITIAL_DOCTORS = [
  { id: 'D01', name: 'Dr. Arjun Mehta',    department: 'Cardiology',  workload: 85, patients: 9 },
  { id: 'D02', name: 'Dr. Priya Sharma',   department: 'Cardiology',  workload: 45, patients: 4 },
  { id: 'D03', name: 'Dr. Ramesh Iyer',    department: 'General',     workload: 72, patients: 7 },
  { id: 'D04', name: 'Dr. Sunita Verma',   department: 'General',     workload: 30, patients: 3 },
  { id: 'D05', name: 'Dr. Anil Kapoor',    department: 'General',     workload: 92, patients: 11 },
  { id: 'D06', name: 'Dr. Kavita Nair',    department: 'Emergency',   workload: 78, patients: 8 },
  { id: 'D07', name: 'Dr. Suresh Pandey',  department: 'Emergency',   workload: 95, patients: 12 },
  { id: 'D08', name: 'Dr. Deepa Joshi',    department: 'Emergency',   workload: 40, patients: 4 },
  { id: 'D09', name: 'Dr. Vikram Singh',   department: 'Orthopedic',  workload: 60, patients: 6 },
  { id: 'D10', name: 'Dr. Meena Gupta',    department: 'Orthopedic',  workload: 25, patients: 2 },
  { id: 'D11', name: 'Dr. Rajesh Tiwari',  department: 'Orthopedic',  workload: 55, patients: 5 },
  { id: 'D12', name: 'Dr. Anita Dubey',    department: 'Cardiology',  workload: 68, patients: 7 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt      = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const clamp    = (v, min, max) => Math.min(Math.max(v, min), max);
const avgOf    = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

// Map API status (lowercase) + workload to UI status vocabulary
// API statuses: 'available', 'busy', 'unavailable'
// UI statuses:  'Available', 'Busy', 'Overloaded'
const computeStatus = (workload, apiStatus) => {
  if (apiStatus === 'unavailable' || workload > 80) return 'Overloaded';
  if (apiStatus === 'busy'        || workload > 50) return 'Busy';
  return 'Available';
};

const withStatus = (doctors) => doctors.map(d => ({ ...d, status: computeStatus(d.workload ?? 0, d.apiStatus ?? d.status?.toLowerCase()) }));

const STATUS_ORDER = { Overloaded: 0, Busy: 1, Available: 2 };

const STATUS_STYLE = {
  Available: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  Busy:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Overloaded:'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const BAR_COLOR = (w) => w > 80 ? 'bg-red-500' : w > 50 ? 'bg-yellow-500' : 'bg-green-500';

// Avg consultation time derived from workload bracket (higher load = shorter avg slot)
const consultMins = (w) => w > 80 ? 5 : w > 50 ? 8 : 12;

const patientLoad = (n) => {
  if (n >= 10) return { label: `${n} 🔴`, cls: 'text-red-600 dark:text-red-400 font-semibold' };
  if (n >= 5)  return { label: `${n} 🟡`, cls: 'text-yellow-600 dark:text-yellow-400 font-semibold' };
  return              { label: `${n} 🟢`, cls: 'text-green-600 dark:text-green-400 font-semibold' };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, count, total, color, icon }) {
  const colors = {
    blue:   'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-300',
    green:  'bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    red:    'bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-300',
  };
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-60">{icon} {label}</p>
      <p className="text-3xl font-black mt-1">{count}</p>
      <p className="text-xs mt-1 opacity-70">{pct}% of total</p>
    </div>
  );
}

function WorkloadBar({ value }) {
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
          <div
            className={`${BAR_COLOR(value)} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8 text-right">{value}%</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Avg consult: {consultMins(value)} mins</p>
    </div>
  );
}

function DeptCard({ dept, doctors }) {
  const total     = doctors.length;
  const available = doctors.filter(d => d.status === 'Available').length;
  const avgWork   = avgOf(doctors.map(d => d.workload));
  const borderCls = avgWork > 80 ? 'border-red-400' : avgWork > 50 ? 'border-yellow-400' : 'border-gray-100 dark:border-gray-800';
  const bgTint    = avgWork > 80 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900';

  return (
    <div className={`${bgTint} rounded-2xl border-2 ${borderCls} shadow-sm p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">{dept}</h3>
        <span className="text-xs font-semibold text-gray-400">{total} doctors</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center mb-4">
        {[['Available', available, 'text-green-600'], ['Avg Load', `${avgWork}%`, 'text-indigo-600']].map(([l, v, c]) => (
          <div key={l}>
            <p className={`text-xl font-black ${c} dark:opacity-90`}>{v}</p>
            <p className="text-xs text-gray-400">{l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Avg Workload</span><span className="font-semibold">{avgWork}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
          <div className={`${BAR_COLOR(avgWork)} h-2 rounded-full transition-all duration-500`} style={{ width: `${avgWork}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Doctors() {
  const { sharedDoctors, setSharedDoctors } = useHospital();
  // Normalise API doctors (lowercase status, workload field) to UI shape on arrival
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    if (!sharedDoctors.length) return;
    setDoctors(withStatus(
      sharedDoctors.map(d => ({
        ...d,
        patients:  d.patientsToday ?? 0,
        apiStatus: d.status,          // preserve original for computeStatus
      }))
    ));
  }, [sharedDoctors]);

  const [lastUpdated, setLastUpdated] = useState({ time: fmt(new Date()), ts: Date.now(), prevTotalLoad: 0 });
  const [now,         setNow]         = useState(Date.now());
  const [filter,        setFilter]        = useState('All');
  const [highlightedId,  setHighlightedId] = useState(null);
  const rowRefs = useRef({});

  // ── Event bus: react to OPD patient additions ─────────────────────────────
  useEffect(() => {
    return onEvent('PATIENT_ADDED', () => {
      setDoctors(prev => {
        const candidates = prev.filter(d => d.status === 'Available' || d.status === 'Busy');
        if (!candidates.length) return prev;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const delta  = Math.floor(Math.random() * 6) + 5; // 5–10
        return withStatus(prev.map(d =>
          d.id === target.id
            ? { ...d, workload: Math.min(d.workload + delta, 100), patients: d.patients + 1 }
            : d
        ));
      });
    });
  }, []);

  // "just now" ticker — only runs while within 10s window
  useEffect(() => {
    if (now - lastUpdated.ts >= 10000) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [lastUpdated.ts]);

  const stamp = (prev) => {
    const prevTotalLoad = prev.reduce((s, d) => s + d.workload, 0);
    setLastUpdated({ time: fmt(new Date()), ts: Date.now(), prevTotalLoad });
    setNow(Date.now());
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const total      = doctors.length;
  const available  = useMemo(() => doctors.filter(d => d.status === 'Available').length,  [doctors]);
  const busy       = useMemo(() => doctors.filter(d => d.status === 'Busy').length,       [doctors]);
  const overloaded = useMemo(() => doctors.filter(d => d.status === 'Overloaded').length, [doctors]);

  const totalLoad  = useMemo(() => doctors.reduce((s, d) => s + d.workload, 0), [doctors]);
  const loadDelta  = totalLoad - lastUpdated.prevTotalLoad;

  // Best doctor: lowest workload among Available
  const bestDoctor = useMemo(() => {
    const avail = doctors.filter(d => d.status === 'Available');
    return avail.length ? avail.reduce((a, b) => a.workload <= b.workload ? a : b) : null;
  }, [doctors]);

  // Overload alerts (workload > 90)
  const overloadAlerts = useMemo(() =>
    [...new Set(doctors.filter(d => d.workload > 90).map(d => d.department))],
  [doctors]);

  // Filtered + sorted list
  // Sorting always applies after filtering: Overloaded → Busy → Available, then workload descending
  const filtered = useMemo(() => {
    const base = filter === 'All'
      ? doctors
      : doctors.filter(d => d.department === filter || d.status === filter);
    return base.slice().sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return sd !== 0 ? sd : b.workload - a.workload;
    });
  }, [doctors, filter]);

  const scrollToBestDoctor = () => {
    if (!bestDoctor) return;
    setFilter('All'); // ensure row is visible regardless of active filter
    setHighlightedId(bestDoctor.id);
    setTimeout(() => {
      rowRefs.current[bestDoctor.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50); // small delay lets filter re-render first
    setTimeout(() => setHighlightedId(null), 2000);
  };

  const hasAvailOrBusy = available + busy > 0;
  const hasAnyPatients = doctors.some(d => d.patients > 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  const assignPatient = () => {
    setDoctors(prev => {
      stamp(prev);
      const candidates = prev.filter(d => d.status === 'Available' || d.status === 'Busy');
      if (!candidates.length) return prev;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const delta  = Math.floor(Math.random() * 11) + 5;
      const updated = withStatus(prev.map(d =>
        d.id === target.id
          ? { ...d, workload: clamp(d.workload + delta, 0, 100), patients: d.patients + 1 }
          : d
      ));
      // emit after computing new state
      emitEvent('DOCTOR_ASSIGNED', { doctor: target.name });
      const overloaded = updated.find(d => d.id === target.id && d.workload > 90);
      if (overloaded) emitEvent('DOCTOR_OVERLOADED', { department: overloaded.department, name: overloaded.name });
      return updated;
    });
  };

  const completeConsultation = () => {
    setDoctors(prev => {
      stamp(prev);
      const candidates = prev.filter(d => d.patients > 0);
      if (!candidates.length) return prev;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const delta  = Math.floor(Math.random() * 11) + 5;
      return withStatus(prev.map(d =>
        d.id === target.id
          ? { ...d, workload: clamp(d.workload - delta, 0, 100), patients: Math.max(d.patients - 1, 0) }
          : d
      ));
    });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Doctor Availability</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time workload monitoring & allocation</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last updated: {lastUpdated.time}
            {now - lastUpdated.ts < 10000 && <span className="ml-1 text-green-500 font-medium">· just now</span>}
            {loadDelta !== 0 && (
              <span className={`ml-2 font-semibold ${loadDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {loadDelta > 0 ? `+${loadDelta}% load increase` : `${Math.abs(loadDelta)}% load reduced`}
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Tooltip text="Assigns a patient to the least loaded available doctor">
              <button onClick={assignPatient} disabled={!hasAvailOrBusy} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                👤 Assign Patient
              </button>
            </Tooltip>
            <Tooltip text="Reduces a doctor's workload and patient count by one">
              <button onClick={completeConsultation} disabled={!hasAnyPatients} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                ✅ Complete Consultation
              </button>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Assign or complete consultations to update workloads</p>
        </div>
      </div>

      {/* Overload alerts */}
      {overloadAlerts.map(dept => (
        <div key={dept} className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 animate-[pulse_2s_ease-in-out_infinite]">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Doctor overload detected in {dept} — workload exceeds 90%
          </p>
        </div>
      ))}

      {/* Best doctor recommendation — clickable, scrolls to row */}
      {bestDoctor && (
        <div
          role="button"
          onClick={scrollToBestDoctor}
          title="Click to highlight this doctor in the table"
          className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
        >
          <span className="text-indigo-500">💡</span>
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Best available doctor: <span className="font-bold">{bestDoctor.name}</span>
            <span className="ml-1 opacity-70">({bestDoctor.department} · {bestDoctor.workload}% load)</span>
          </p>
          <span className="ml-auto text-xs text-indigo-400">↓ View</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Doctors"     count={total}      total={total} color="blue"   icon="👨‍⚕️" />
        <SummaryCard label="Available"         count={available}  total={total} color="green"  icon="✅" />
        <SummaryCard label="Busy"              count={busy}       total={total} color="yellow" icon="🟡" />
        <SummaryCard label="Overloaded"        count={overloaded} total={total} color="red"    icon="🔴" />
      </div>

      {/* Department breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {DEPARTMENTS.map(dept => (
          <DeptCard key={dept} dept={dept} doctors={doctors.filter(d => d.department === dept)} />
        ))}
      </div>

      {/* Doctor table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">👨‍⚕️ Doctor List</h2>
          <div className="flex flex-wrap gap-2">
            {['All', ...DEPARTMENTS, 'Available', 'Busy', 'Overloaded'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >{f}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Doctor</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Workload</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Patients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-3xl mb-2">👨‍⚕️</p>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No doctors match this filter</p>
                  </td>
                </tr>
              )}
              {filtered.map(doc => {
                const isOverloaded  = doc.status === 'Overloaded';
                const isBest        = bestDoctor?.id === doc.id;
                const isCriticalPulse = doc.workload > 90;
                // Overloaded styling takes priority over best-doctor highlight
                const rowCls = isOverloaded
                  ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-400'
                  : isBest
                  ? 'bg-green-50 dark:bg-green-900/10 border-l-4 border-l-green-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50';
                const load = patientLoad(doc.patients);
                const isFlashing = highlightedId === doc.id;
                return (
                  <tr
                    key={doc.id}
                    ref={el => rowRefs.current[doc.id] = el}
                    className={`transition-all duration-300 ease-in-out ${rowCls} ${isCriticalPulse ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''} ${isFlashing ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{doc.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{doc.department}</td>
                    <td className="px-4 py-3"><WorkloadBar value={doc.workload} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[doc.status]}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${load.cls}`}>{load.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
