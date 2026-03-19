import { useState, useCallback, useEffect } from 'react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { emitEvent } from '../utils/eventBus.js';
import Tooltip from '../components/Tooltip.jsx';
import { INITIAL_PATIENT_SEEDS, SAMPLE_NAME_POOL } from '../utils/opdMockData.js';
import ApiStatusBanner from '../components/ApiStatusBanner.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_SCORE   = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const DEPT_SCORE       = { Emergency: 4, ICU: 3, Surgery: 3, General: 2, Other: 1 };
const CONSULT_TIME     = { Critical: 5, High: 7, Medium: 10, Low: 12 };
const SEVERITY_STYLE    = {
  Critical: { badge: 'bg-red-100 text-red-700 border border-red-300',    dot: 'bg-red-500',    glow: 'ring-2 ring-red-400 animate-pulse' },
  High:     { badge: 'bg-orange-100 text-orange-700 border border-orange-300', dot: 'bg-orange-500', glow: '' },
  Medium:   { badge: 'bg-yellow-100 text-yellow-700 border border-yellow-300', dot: 'bg-yellow-500', glow: '' },
  Low:      { badge: 'bg-green-100 text-green-700 border border-green-300',  dot: 'bg-green-500',  glow: '' },
};
const STATUS_STYLE = {
  Waiting:     'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed:   'bg-green-100 text-green-700',
};

const SAMPLE_NAMES = SAMPLE_NAME_POOL;
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let tokenCounter = { A: 5 }; // start after dummy data

const generateToken = () => {
  tokenCounter.A = (tokenCounter.A || 0) + 1;
  return `A${String(tokenCounter.A).padStart(3, '0')}`;
};

const waitingMins  = (p) => Math.max(1, Math.floor((Date.now() - p.arrivalTime) / 60000));
const deptScore    = (p) => DEPT_SCORE[p.department ?? 'General'] ?? 2;
const getPriority  = (p) =>
  0.5 * SEVERITY_SCORE[p.severity] +
  0.3 * waitingMins(p) +
  0.2 * deptScore(p);

const sortQueue = (patients) =>
  [...patients].sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (b.status === 'Completed' && a.status !== 'Completed') return -1;
    const diff = getPriority(b) - getPriority(a);
    return diff !== 0 ? diff : a.arrivalTime - b.arrivalTime;
  });

const calcWaitTimes = (patients) => {
  let cumulativeWait = 0;
  return patients.map((p) => {
    if (p.status === 'Completed') return { ...p, estimatedWait: 0 };
    if (p.status === 'In Progress') return { ...p, estimatedWait: 0 };
    const wait = cumulativeWait;
    cumulativeWait += CONSULT_TIME[p.severity];
    return { ...p, estimatedWait: wait };
  });
};

const buildQueue = (patients) => calcWaitTimes(sortQueue(patients));

// ─── Initial Dummy Data ───────────────────────────────────────────────────────

const INITIAL_PATIENTS = buildQueue(
  INITIAL_PATIENT_SEEDS.map(({ offsetMins, ...p }) => ({
    ...p,
    arrivalTime: Date.now() - offsetMins * 60000,
  }))
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color = 'indigo', icon }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    red:    'bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-300',
    blue:   'bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-300',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
  };
  return (
    <div className={`rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-60">{icon} {label}</p>
      <p className="text-3xl font-black mt-1">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {severity}
    </span>
  );
}

function NowServingPanel({ queue }) {
  const serving  = queue.find((p) => p.status === 'In Progress');
  const next     = queue.find((p) => p.status === 'Waiting');
  const servingMins = useServingTimer(serving);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col sm:flex-row gap-4">
      <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Now Serving</p>
        {serving ? (
          <>
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{serving.token}</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">{serving.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <SeverityBadge severity={serving.severity} />
              <span className="text-xs text-indigo-400">⏱ Serving for: {servingMins} min{servingMins !== 1 ? 's' : ''}</span>
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm mt-1">No patient in progress</p>
        )}
      </div>
      <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Next Up</p>
        {next ? (
          <>
            <p className="text-2xl font-black text-gray-700 dark:text-gray-200">{next.token}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{next.name}</p>
            <SeverityBadge severity={next.severity} />
          </>
        ) : (
          <p className="text-gray-400 text-sm mt-1">Queue is empty</p>
        )}
      </div>
    </div>
  );
}

function AddPatientForm({ onAdd }) {
  const [name,     setName]     = useState('');
  const [severity, setSeverity] = useState('Medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), severity);
    setName('');
    setSeverity('Medium');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">➕ Register Patient</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Patient name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Add to Queue
        </button>
      </div>
    </form>
  );
}

// ─── Main OPD Component ───────────────────────────────────────────────────────

const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// "Serving for" live timer shown in NowServingPanel
function useServingTimer(serving) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    if (!serving) { setMins(0); return; }
    const calc = () => setMins(Math.floor((Date.now() - serving.arrivalTime) / 60000));
    calc();
    const id = setInterval(calc, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, [serving?.id]);
  return mins;
}

export default function OPD() {
  const [patients,    setPatients]    = useState(INITIAL_PATIENTS);
  const [lastUpdated, setLastUpdated] = useState({ time: fmt(new Date()), ts: Date.now() });
  const [prevLength,  setPrevLength]  = useState(INITIAL_PATIENTS.length);
  const { admitPatient, error, stale, refetch } = useHospital();

  useEffect(() => {
    setLastUpdated({ time: fmt(new Date()), ts: Date.now() });
    setPrevLength(patients.length);
  }, [patients]);

  const updateQueue = useCallback((updater) => {
    setPatients((prev) => buildQueue(updater(prev)));
  }, []);

  // Derived stats
  const active   = patients.filter((p) => p.status !== 'Completed');
  const critical = active.filter((p) => p.severity === 'Critical');
  const avgWait  = active.length
    ? Math.round(active.reduce((s, p) => s + p.estimatedWait, 0) / active.length)
    : 0;

  const addPatient = (name, severity) => {
    const newPatient = {
      id:          String(Date.now()),
      token:       generateToken(),
      name,
      severity,
      arrivalTime: Date.now(),
      status:      'Waiting',
      estimatedWait: 0,
    };
    updateQueue((prev) => [...prev, newPatient]);
    emitEvent('PATIENT_ADDED', { patient: newPatient, severity: newPatient.severity });
  };

  const callNext = () => {
    updateQueue((prev) => {
      const inProgress = prev.find((p) => p.status === 'In Progress');
      const next       = prev.find((p) => p.status === 'Waiting');
      if (inProgress) {
        admitPatient(inProgress.name);
        emitEvent('PATIENT_COMPLETED', { patientName: inProgress.name });
      }
      return prev.map((p) => {
        if (inProgress && p.id === inProgress.id) return { ...p, status: 'Completed' };
        if (next       && p.id === next.id)       return { ...p, status: 'In Progress' };
        return p;
      });
    });
  };

  const simulateSurge = () => {
    const count = Math.floor(Math.random() * 6) + 5; // 5–10
    const newPatients = Array.from({ length: count }, () => ({
      id:          String(Date.now() + Math.random()),
      token:       generateToken(),
      name:        SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)],
      severity:    SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
      arrivalTime: Date.now() + Math.random() * 1000,
      status:      'Waiting',
      estimatedWait: 0,
    }));
    updateQueue((prev) => [...prev, ...newPatients]);
  };

  return (
    <div className="space-y-6">
      <ApiStatusBanner error={error} stale={stale} onRetry={refetch} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OPD Queue Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Priority-based triage system</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last updated: {lastUpdated.time}
            {Date.now() - lastUpdated.ts < 10000 && (
              <span className="ml-1 text-green-500 font-medium">· just now</span>
            )}
            {patients.length !== prevLength && (
              <span className={`ml-2 font-semibold ${
                patients.length > prevLength ? 'text-red-500' : 'text-green-500'
              }`}>
                {patients.length > prevLength ? `+${patients.length - prevLength}` : `-${prevLength - patients.length}`} from last update
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Tooltip text="Moves current patient to Completed and calls the next Waiting patient">
              <button
                onClick={callNext}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95"
              >
                ▶ Call Next
              </button>
            </Tooltip>
            <Tooltip text="Adds 5–10 random patients to stress-test the queue">
              <button
                onClick={simulateSurge}
                className="px-4 py-2 border border-orange-400 text-orange-600 dark:text-orange-400 dark:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm font-semibold rounded-lg transition-all duration-200"
              >
                🚨 Simulate Rush
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Alert banners */}
      {critical.length > 2 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500 border border-red-300 dark:border-red-700 rounded-xl px-4 py-3 animate-[pulse_2s_ease-in-out_infinite]">
          <span className="text-red-500 text-lg">⚠️</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            High Emergency Load — {critical.length} critical patients in queue
          </p>
        </div>
      )}
      {avgWait > 30 && (
        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl px-4 py-3">
          <span className="text-yellow-500 text-lg">⚠️</span>
          <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
            Average wait time is {avgWait} min — Consider redirecting patients to a less busy hospital
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Patients"  value={patients.length} color="indigo" icon="🪑" />
        <SummaryCard label="Active Patients" value={active.length}   color="blue"   icon="⏳" />
        <SummaryCard label="Critical"        value={critical.length} color="red"    icon="🚨" />
        <SummaryCard label="Avg Wait"        value={`${avgWait}m`}   color="yellow" icon="⏱️" />
      </div>

      {/* Now serving */}
      <NowServingPanel queue={patients} />

      {/* Add patient form */}
      <AddPatientForm onAdd={addPatient} />

      {/* Queue table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            🪑 Patient Queue — {active.length} active
          </h2>
          {/* Severity count pills */}
          <div className="flex flex-wrap gap-2">
            {[['Critical','bg-red-100 text-red-700'],['High','bg-orange-100 text-orange-700'],['Medium','bg-yellow-100 text-yellow-700'],['Low','bg-green-100 text-green-700']].map(([sev, cls]) => (
              <span key={sev} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
                {sev}: {patients.filter(p => p.severity === sev && p.status !== 'Completed').length}
              </span>
            ))}
          </div>
        </div>
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <span className="text-5xl mb-3">🪑</span>
            <p className="text-sm font-medium">No patients in queue</p>
            <p className="text-xs mt-1">Add a patient or simulate a rush to get started</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Token</th>
                <th className="px-4 py-3 text-left">Patient Name</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">
                  <Tooltip text="Calculated using severity (50%), waiting time (30%), and department criticality (20%)">
                    <span className="cursor-help border-b border-dashed border-gray-400">Priority</span>
                  </Tooltip>
                </th>
                <th className="px-4 py-3 text-left">Est. Wait</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {(() => {
                const topId = patients.find((p) => p.status === 'Waiting')?.id;
                return patients.map((p) => {
                const isCritical    = p.severity === 'Critical' && p.status === 'Waiting';
                const isInProgress  = p.status === 'In Progress';
                const isCompleted   = p.status === 'Completed';
                const isTopPriority = p.id === topId;
                const score         = getPriority(p);
                return (
                  <tr
                    key={p.id}
                    className={`transition-all duration-300 ease-in-out
                      ${isCompleted   ? 'opacity-40' : ''}
                      ${isInProgress  ? 'bg-blue-50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : ''}
                      ${isCritical    ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]' : ''}
                      ${isTopPriority && !isCritical && !isInProgress ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500 shadow-sm' : ''}
                      ${!isInProgress && !isCritical && !isTopPriority && !isCompleted ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold text-gray-800 dark:text-gray-200 ${isCritical ? SEVERITY_STYLE.Critical.glow + ' rounded px-1' : ''}`}>
                        {p.token}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{p.name}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={p.severity} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold ${
                        isCompleted ? 'text-gray-300 dark:text-gray-600' :
                        isInProgress ? 'text-gray-400 dark:text-gray-500' :
                        isTopPriority ? 'text-red-600 dark:text-red-400' :
                        'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {isCompleted ? '—' : isTopPriority ? `🔥 ${score.toFixed(1)}` : `${score.toFixed(1)} ↑`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {isCompleted || isInProgress ? '—' : `${p.estimatedWait} min`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
                });
              })()}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span>Sort order: <strong className="text-gray-600 dark:text-gray-300">Adaptive Priority Engine</strong> → Severity (50%) + Waiting Time (30%) + Department (20%) | FIFO tiebreak</span>
        <span>Consult times: Critical 5m · High 7m · Medium 10m · Low 12m</span>
      </div>

    </div>
  );
}
