import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Activity, BedDouble, Stethoscope, Users, Package, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { dashboardService, forecastService } from '../services/api.js';
import { getSocket } from '../lib/socket.js';
import { STRESS_LABEL_META } from '../constants/enums.js';
import { formatHours } from '../utils/formatDuration.js';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { ProgressBar } from '../components/ui/Button.jsx';
import { ErrorState, EmptyState } from '../components/ui/States.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [dashRes, histRes, fcRes] = await Promise.all([
        dashboardService.get(user.hospitalId),
        dashboardService.history(user.hospitalId, 24),
        forecastService.get(user.hospitalId, 24),
      ]);
      setData(dashRes.data.data);
      setHistory(histRes.data.data || []);
      setForecast(fcRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [user.hospitalId]);

  useEffect(() => { load(); }, [load]);

  // Live-refresh the dashboard when any resource changes (debounced-ish via a single re-fetch per burst is skipped for simplicity/portfolio clarity)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const refresh = () => load();
    ['bed:update', 'doctor:update', 'opd:update', 'inventory:update', 'admission:decided'].forEach((e) => socket.on(e, refresh));
    return () => ['bed:update', 'doctor:update', 'opd:update', 'inventory:update', 'admission:decided'].forEach((e) => socket.off(e, refresh));
  }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState description={error} onRetry={load} />;
  if (!data) return null;

  const { hospital, opd, beds, doctors, inventoryAlerts, stressScore } = data;
  const stressMeta = STRESS_LABEL_META[stressScore.label] || STRESS_LABEL_META.Low;

  const chartData = history.map((h) => ({
    time: new Date(h.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    stress: h.stressScore,
  }));

  const severityChart = [
    { name: 'Critical', value: opd.bySeverity.critical },
    { name: 'High', value: opd.bySeverity.high },
    { name: 'Medium', value: opd.bySeverity.medium },
    { name: 'Low', value: opd.bySeverity.low },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-surface-900">{hospital.name}</h2>
        <p className="text-sm text-surface-500">{hospital.address} · {hospital.city}</p>
      </div>

      {/* Stress score hero */}
      <Card className="bg-gradient-to-br from-surface-900 to-surface-800 text-white border-none">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <StressRing score={stressScore.score} label={stressScore.label} />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-surface-300">Hospital Stress Score</p>
              <Badge tone={stressMeta.tone}>{stressScore.label}</Badge>
            </div>
            <p className="text-xs text-surface-400 mb-4">Weighted: 40% OPD load · 40% bed occupancy · 20% doctor pressure</p>
            <div className="space-y-2.5">
              <BreakdownRow label="OPD load" value={stressScore.breakdown.opdLoad} />
              <BreakdownRow label="Bed occupancy" value={stressScore.breakdown.bedOccupancy} />
              <BreakdownRow label="Doctor pressure" value={stressScore.breakdown.doctorPressure} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active OPD patients" value={opd.active} icon={Users} tone="brand" footnote={`${opd.total} registered today`} />
        <StatCard label="Beds available" value={`${beds.summary.available}/${beds.summary.total}`} icon={BedDouble} tone={beds.summary.available === 0 ? 'critical' : 'success'} />
        <StatCard label="Doctors available" value={`${doctors.available}/${doctors.total}`} icon={Stethoscope} tone="info" footnote={`${doctors.busy} busy · ${doctors.unavailable} off`} />
        <StatCard label="Inventory alerts" value={inventoryAlerts.count} icon={Package} tone={inventoryAlerts.count > 0 ? 'warning' : 'success'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Stress score — last 24 hours" subtitle="Recorded automatically every few minutes" icon={Activity} />
          {chartData.length < 2 ? (
            <EmptyState title="Not enough history yet" description="Check back after a few snapshot cycles." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f3" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#98a3ac' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#98a3ac' }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dfe4e8' }} />
                <Line type="monotone" dataKey="stress" stroke="#0d7f71" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardHeader title="Forecast" subtitle="Explainable linear trend projection" icon={Sparkles} />
          <ForecastPanel forecast={forecast} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="OPD queue by severity" icon={Users} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#98a3ac' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#98a3ac' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #dfe4e8' }} />
              <Bar dataKey="value" fill="#159e8c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Inventory alerts" icon={Package} />
          {inventoryAlerts.items.length === 0 ? (
            <EmptyState title="All stock healthy" description="No items below their minimum threshold." />
          ) : (
            <ul className="space-y-2">
              {inventoryAlerts.items.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-surface-700">{item.item}</span>
                  <Badge tone={item.status === 'critical' ? 'critical' : 'warning'}>{item.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StressRing({ score, label }) {
  const color = label === 'High' ? '#c22b3f' : label === 'Medium' ? '#b5730a' : '#12946b';
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-28 h-28 -rotate-90">
        <circle cx="56" cy="56" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle cx="56" cy="56" r="42" fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] text-surface-400">/ 100</span>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-surface-300 mb-1"><span>{label}</span><span className="font-medium">{value}%</span></div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ForecastPanel({ forecast }) {
  if (!forecast?.available) {
    return <EmptyState icon={Sparkles} title="Not enough history yet" description={forecast?.reason || 'Forecasting needs a few more recorded snapshots.'} />;
  }
  const { bedTrend, stressTrend, horizonHours, sampleSize } = forecast;
  const horizonDays = Math.round(horizonHours / 24);

  const trendIconEl = (dir, size = 14, className = '') => {
    if (dir === 'declining' || dir === 'rising') return <TrendingUp size={size} className={className} />;
    if (dir === 'improving' || dir === 'falling') return <TrendingDown size={size} className={className} />;
    return <Minus size={size} className={className} />;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          {trendIconEl(bedTrend.direction, 14, bedTrend.direction === 'declining' ? 'text-status-critical' : bedTrend.direction === 'improving' ? 'text-status-success' : 'text-surface-400')}
          <p className="text-xs font-semibold text-surface-600 uppercase tracking-wide">Bed availability</p>
        </div>
        {bedTrend.direction === 'stable' ? (
          <p className="text-sm text-surface-700">Holding steady — no meaningful change in the recent trend.</p>
        ) : bedTrend.hoursToShortage != null ? (
          <p className="text-sm text-surface-700">
            Trending <span className="font-semibold">{bedTrend.direction}</span> at {Math.abs(bedTrend.slopePerHour)} beds/hour.{' '}
            <span className="text-status-critical font-medium">Could run out of beds in {formatHours(bedTrend.hoursToShortage)} at this rate.</span>
          </p>
        ) : (
          <p className="text-sm text-surface-700">
            {bedTrend.direction === 'declining' ? (
              <>Slowly declining, but not projected to cause a shortage within the next {horizonDays} days at this rate.</>
            ) : (
              <>Improving — availability is trending up.</>
            )}
          </p>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          {trendIconEl(stressTrend.direction, 14, stressTrend.direction === 'rising' ? 'text-status-critical' : stressTrend.direction === 'falling' ? 'text-status-success' : 'text-surface-400')}
          <p className="text-xs font-semibold text-surface-600 uppercase tracking-wide">Stress score</p>
        </div>
        {stressTrend.direction === 'stable' ? (
          <p className="text-sm text-surface-700">Holding steady — no meaningful change in the recent trend.</p>
        ) : stressTrend.hoursToHigh != null ? (
          <p className="text-sm text-surface-700">
            Trending <span className="font-semibold">{stressTrend.direction}</span> at {Math.abs(stressTrend.slopePerHour)} pts/hour.{' '}
            <span className="text-status-warning font-medium">Could reach High stress in {formatHours(stressTrend.hoursToHigh)}.</span>
          </p>
        ) : (
          <p className="text-sm text-surface-700">
            {stressTrend.direction === 'rising' ? (
              <>Rising, but not projected to reach High stress within the next {horizonDays} days at this rate.</>
            ) : (
              <>Falling — hospital load is trending down.</>
            )}
          </p>
        )}
      </div>
      <p className="text-[11px] text-surface-400 pt-2 border-t border-surface-100">
        Based on {sampleSize} recorded snapshots · linear trend projection, not a black-box model · {horizonDays}-day forecast horizon
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 bg-surface-100 rounded-card animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-surface-100 rounded-card animate-pulse" />)}
      </div>
      <div className="h-64 bg-surface-100 rounded-card animate-pulse" />
    </div>
  );
}
