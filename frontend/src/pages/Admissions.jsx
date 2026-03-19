import { useState, useEffect, useRef } from 'react';
import { useHospital } from '../utils/hospitalStore.jsx';
import Tooltip from '../components/Tooltip.jsx';

// ─── Decision engine ──────────────────────────────────────────────────────────

function computeMetrics(beds, doctors, items) {
  const total    = beds.length || 1;
  const occupied = beds.filter(b => b.status === 'Occupied').length;
  const available = beds.filter(b => b.status === 'Available').length;
  const bedPct   = Math.round((occupied / total) * 100);

  const overloaded = doctors.filter(d => d.status === 'Overloaded').length;
  const doctorPct  = Math.round((overloaded / (doctors.length || 1)) * 100);

  const criticalItems = items.filter(i => i.status === 'Critical').length;
  const lowItems      = items.filter(i => i.status === 'Low').length;
  const invRisk       = Math.min(100, Math.round(((criticalItems * 2 + lowItems) / (items.length || 1)) * 100));

  const opdLoad = Math.min(100, Math.round(doctors.reduce((s, d) => s + d.workload, 0) / (doctors.length || 1)));

  const stress = Math.round(opdLoad * 0.4 + bedPct * 0.4 + doctorPct * 0.2);

  return { bedPct, available, doctorPct, opdLoad, invRisk, stress };
}

function getAdmissionDecision(metrics) {
  const { bedPct, doctorPct, invRisk, stress } = metrics;

  const factors = [
    {
      label: 'Bed availability',
      ok: bedPct < 85, critical: bedPct >= 95,
      text: bedPct < 85 ? 'Beds sufficient' : bedPct >= 95 ? 'No beds available' : 'Beds running low',
    },
    {
      label: 'Doctor capacity',
      ok: doctorPct < 40, critical: doctorPct >= 70,
      text: doctorPct < 40 ? 'Doctors available' : doctorPct >= 70 ? 'Doctors critically loaded' : 'Doctor load high',
    },
    {
      label: 'Inventory readiness',
      ok: invRisk < 30, critical: invRisk >= 60,
      text: invRisk < 30 ? 'Inventory adequate' : invRisk >= 60 ? 'Inventory critical' : 'Some items low',
    },
    {
      label: 'Overall stress',
      ok: stress < 50, critical: stress >= 80,
      text: stress < 50 ? 'Hospital load normal' : stress >= 80 ? 'Hospital critically stressed' : 'Moderate hospital load',
    },
  ];

  const hasCritical = factors.some(f => f.critical);
  const okCount     = factors.filter(f => f.ok).length;

  let action, color, icon;
  if (hasCritical || stress >= 80) {
    action = 'Refer Patient';   color = 'red';    icon = '❌';
  } else if (okCount >= 3) {
    action = 'Admit';           color = 'green';  icon = '✔';
  } else {
    action = 'Delay / Monitor'; color = 'yellow'; icon = '⚠';
  }

  return { action, color, icon, factors };
}

// ─── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, className }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const diff  = value - start;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(Math.round(start + (diff * i) / steps));
      if (i >= steps) { clearInterval(id); prev.current = value; }
    }, 16);
    return () => clearInterval(id);
  }, [value]);

  return <span className={className}>{display}</span>;
}

// ─── Metric bar ───────────────────────────────────────────────────────────────

const BAR_COLOR = (pct) =>
  pct >= 80 ? 'bg-red-400/80' : pct >= 50 ? 'bg-yellow-400/80' : 'bg-emerald-500/80';

function MetricBar({ label, pct, note }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-mono font-semibold text-gray-500 dark:text-gray-400">
          {pct}%{note ? <span className="ml-1 text-xs text-gray-400">{note}</span> : null}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${BAR_COLOR(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Factor row ───────────────────────────────────────────────────────────────

function FactorRow({ factor }) {
  const icon  = factor.critical ? '❌' : factor.ok ? '✔' : '⚠';
  const color = factor.critical
    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : factor.ok
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    : 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${color}`}>
      <span className="text-base shrink-0">{icon}</span>
      <span>{factor.text}</span>
      <span className="ml-auto text-xs opacity-60">{factor.label}</span>
    </div>
  );
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const STRESS_PALETTE = {
  green:  { ring: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', label: 'Stable'   },
  yellow: { ring: 'text-yellow-400',  bg: 'bg-yellow-50 dark:bg-yellow-900/20',   badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',   label: 'Moderate' },
  red:    { ring: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',         badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',               label: 'Critical' },
};

const stressColor = (s) => s < 50 ? 'green' : s < 80 ? 'yellow' : 'red';

const ACTION_STYLE = {
  green:  'from-emerald-500 to-teal-500 shadow-emerald-200 dark:shadow-emerald-900/40',
  yellow: 'from-yellow-400 to-orange-400 shadow-yellow-200 dark:shadow-yellow-900/40',
  red:    'from-red-500 to-rose-500 shadow-red-200 dark:shadow-red-900/40',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function Admissions() {
  const { sharedBeds, sharedDoctors, sharedItems } = useHospital();

  // snapshot: null until Evaluate is clicked — freezes metrics+decision at that moment
  const [snapshot, setSnapshot] = useState(null);
  const [forced,   setForced]   = useState(null); // 'admit' | 'refer' | null

  // liveMetrics always reflects current store — drives bars + ring
  const liveMetrics  = computeMetrics(sharedBeds, sharedDoctors, sharedItems);
  const liveDecision = getAdmissionDecision(liveMetrics);

  // ring/badge use snapshot stress after evaluate so they match the recommendation
  const evaluated = snapshot !== null;
  const ringMetrics = evaluated ? snapshot.metrics  : liveMetrics;
  const decision    = evaluated ? snapshot.decision : liveDecision;

  const sc      = stressColor(ringMetrics.stress);
  const palette = STRESS_PALETTE[sc];

  const displayColor  = forced === 'admit' ? 'green' : forced === 'refer' ? 'red' : decision.color;
  const displayAction = forced === 'admit' ? 'Admit' : forced === 'refer' ? 'Refer Patient' : decision.action;
  const displayIcon   = forced === 'admit' ? '✔'     : forced === 'refer' ? '❌'            : decision.icon;

  const handleEvaluate = () => {
    const m = computeMetrics(sharedBeds, sharedDoctors, sharedItems);
    const d = getAdmissionDecision(m);
    console.log('Decision:', d);
    setForced(null);
    setSnapshot({ metrics: m, decision: d });
  };

  const handleForce = (type) => {
    const m = computeMetrics(sharedBeds, sharedDoctors, sharedItems);
    const d = getAdmissionDecision(m);
    setForced(type);
    setSnapshot({ metrics: m, decision: d });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">🧠 Smart Admissions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI-assisted admission decision engine — real-time hospital readiness</p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Decision panel */}
        <div className={`lg:col-span-2 rounded-3xl border p-8 flex flex-col items-center text-center gap-6 shadow-xl transition-all duration-500 ${palette.bg} border-gray-200 dark:border-gray-700`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Smart Admission Decision</p>

          {/* Stress ring */}
          <Tooltip text="Calculated using OPD load (40%), bed occupancy (40%), and doctor pressure (20%)">
            <div className="relative flex items-center justify-center w-36 h-36 cursor-help">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  className={`${palette.ring} transition-all duration-700`}
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - ringMetrics.stress / 100)}`}
                />
              </svg>
              <div className="flex flex-col items-center">
                <AnimatedNumber value={ringMetrics.stress} className={`text-4xl font-black ${palette.ring}`} />
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">/ 100</span>
              </div>
            </div>
          </Tooltip>

          {/* Status badge */}
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide ${palette.badge}`}>
            {palette.label}
          </span>

          {/* Recommendation box */}
          {evaluated ? (
            <div className={`w-full rounded-2xl bg-gradient-to-r ${ACTION_STYLE[displayColor]} p-px shadow-lg transition-all duration-500`}>
              <div className="rounded-2xl bg-white dark:bg-gray-900 px-6 py-5">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Recommendation</p>
                <p className={`text-4xl font-black bg-gradient-to-r ${ACTION_STYLE[displayColor]} bg-clip-text text-transparent leading-tight`}>
                  {displayIcon} {displayAction}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-6 py-5 text-gray-400 dark:text-gray-600 text-sm leading-relaxed">
              Run evaluation to get an AI-based admission recommendation
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 pt-2">
            <button
              onClick={handleEvaluate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              🔍 Evaluate Admission
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleForce('admit')}
                className="py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                ✔ Force Admit
              </button>
              <button
                onClick={() => handleForce('refer')}
                className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-md shadow-red-200 dark:shadow-red-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                ❌ Refer Patient
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* Live metric bars — always reflect current store state */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Hospital Readiness Metrics</p>
            <MetricBar label="Bed Occupancy"   pct={liveMetrics.bedPct}    note={`${liveMetrics.available} free`} />
            <MetricBar label="OPD Load"         pct={liveMetrics.opdLoad}   />
            <MetricBar label="Doctor Overload"  pct={liveMetrics.doctorPct} />
            <MetricBar label="Inventory Risk"   pct={liveMetrics.invRisk}   />
          </div>

          {/* Decision factors — reflect snapshot after evaluate, live before */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-3">
            <div className="flex flex-col gap-1 mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Decision Factors</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Decision based on:&nbsp;
                {decision.factors.map((f, i) => (
                  <span key={f.label}>
                    <span className={f.critical ? 'text-red-500 font-semibold' : f.ok ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-yellow-600 dark:text-yellow-400 font-semibold'}>
                      {f.label.split(' ')[0]} {f.critical ? '✕' : f.ok ? '✓' : '⚠'}
                    </span>
                    {i < decision.factors.length - 1 && <span className="text-gray-300 dark:text-gray-600"> | </span>}
                  </span>
                ))}
              </p>
            </div>
            {decision.factors.map(f => <FactorRow key={f.label} factor={f} />)}
          </div>

        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center pb-2">
        Decisions are advisory only. Clinical staff must confirm all admissions. · Stress formula: OPD (40%) + Beds (40%) + Doctors (20%)
      </p>
    </div>
  );
}
