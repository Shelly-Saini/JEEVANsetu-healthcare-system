import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Clock, Plus, CheckCircle2, PlayCircle, XCircle, Search } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { emitEvent } from '../utils/eventBus.js';
import { getSocket } from '../lib/socket.js';
import { opdService } from '../services/api.js';
import { DOCTOR_DEPARTMENTS, OPD_SEVERITY_META, OPD_SEVERITIES, OPD_STATUSES } from '../constants/enums.js';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardSkeleton } from '../components/ui/States.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';

const SEVERITY_BORDER = { critical: 'border-l-status-critical', high: 'border-l-status-warning', medium: 'border-l-status-info', low: 'border-l-surface-200' };

export default function OPD() {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const canManage = user.role === 'admin' || user.role === 'doctor' || user.role === 'staff';

  const fetchQueue = useCallback(async () => {
    try {
      setError(null);
      const { data } = await opdService.getAll(user.hospitalId);
      setQueue(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [user.hospitalId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onUpdate = () => fetchQueue();
    socket.on('opd:update', onUpdate);
    socket.on('opd:delete', onUpdate);
    return () => { socket.off('opd:update', onUpdate); socket.off('opd:delete', onUpdate); };
  }, [fetchQueue]);

  const active = useMemo(() => queue.filter((q) => ['waiting', 'in-progress'].includes(q.status)), [queue]);
  const bySeverity = OPD_SEVERITIES.reduce((acc, s) => ({ ...acc, [s]: active.filter((q) => q.severity === s).length }), {});

  const departments = useMemo(() => [...new Set(queue.map((q) => q.department))], [queue]);

  const visible = useMemo(() => {
    const base = showCompleted ? queue : active;
    const term = search.trim().toLowerCase();
    return base.filter((q) => {
      if (severityFilter !== 'all' && q.severity !== severityFilter) return false;
      if (departmentFilter !== 'all' && q.department !== departmentFilter) return false;
      if (term && !(q.patientName.toLowerCase().includes(term) || q.token.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [queue, active, showCompleted, severityFilter, departmentFilter, search]);

  const updateStatus = async (entry, status) => {
    setBusyId(entry.id);
    try {
      await opdService.update(entry.id, { status });
      addToast({ type: status === 'completed' ? 'success' : 'info', title: `${entry.patientName} → ${status}` });
      emitEvent('PATIENT_STATUS_CHANGED', { patientName: entry.patientName, status });
      fetchQueue();
    } catch (err) {
      addToast({ type: 'critical', title: 'Update failed', message: err.response?.data?.message || err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  }
  if (error) return <ErrorState description={error} onRetry={fetchQueue} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active in queue" value={active.length} icon={Users} tone="brand" />
        <StatCard label="Critical / High" value={bySeverity.critical + bySeverity.high} icon={Clock} tone="critical" />
        <StatCard label="Completed today" value={queue.filter((q) => q.status === 'completed').length} icon={CheckCircle2} tone="success" />
        <StatCard label="Avg wait (active)" value={active.length ? `${Math.round(active.reduce((s, q) => s + (q.estimatedWait || 0), 0) / active.length)}m` : '—'} icon={Clock} tone="warning" footnote="Recalculated live from queue position" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or token…"
            aria-label="Search patient name or token"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} aria-label="Filter by severity" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
          <option value="all">All severities</option>
          {OPD_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button
          onClick={() => setShowCompleted((s) => !s)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showCompleted ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
        >
          {showCompleted ? 'Showing all' : 'Active only'}
        </button>
        {canManage && <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Register patient</Button>}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={Users} title="No matching patients" description="Try clearing filters, or register a new patient." /></Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">OPD patient queue, sorted by priority</caption>
              <thead>
                <tr className="border-b border-surface-100 text-left text-xs text-surface-500 uppercase tracking-wide">
                  <th scope="col" className="px-5 py-3 font-medium">Token</th>
                  <th scope="col" className="px-5 py-3 font-medium">Patient</th>
                  <th scope="col" className="px-5 py-3 font-medium">Department</th>
                  <th scope="col" className="px-5 py-3 font-medium">Severity</th>
                  <th scope="col" className="px-5 py-3 font-medium">Est. wait</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  {canManage && <th scope="col" className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {visible.map((entry) => {
                  const sev = OPD_SEVERITY_META[entry.severity];
                  return (
                    <tr key={entry.id} className={`hover:bg-surface-50/60 transition-colors border-l-4 ${SEVERITY_BORDER[entry.severity]}`}>
                      <td className="px-5 py-3 font-mono font-semibold text-brand-700">{entry.token}</td>
                      <td className="px-5 py-3 text-surface-800">{entry.patientName}{entry.age ? <span className="text-surface-400"> · {entry.age}y</span> : null}</td>
                      <td className="px-5 py-3 text-surface-600">{entry.department}</td>
                      <td className="px-5 py-3"><Badge tone={sev.tone}>{sev.label}</Badge></td>
                      <td className="px-5 py-3 text-surface-600">{entry.status === 'waiting' || entry.status === 'in-progress' ? `${entry.estimatedWait}m` : '—'}</td>
                      <td className="px-5 py-3 text-surface-600 capitalize">{entry.status}</td>
                      {canManage && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            {entry.status === 'waiting' && (
                              <Button size="sm" variant="secondary" icon={PlayCircle} disabled={busyId === entry.id} onClick={() => updateStatus(entry, 'in-progress')}>Start</Button>
                            )}
                            {entry.status === 'in-progress' && (
                              <Button size="sm" variant="secondary" icon={CheckCircle2} disabled={busyId === entry.id} onClick={() => updateStatus(entry, 'completed')}>Complete</Button>
                            )}
                            {['waiting', 'in-progress'].includes(entry.status) && (
                              <Button size="sm" variant="ghost" icon={XCircle} disabled={busyId === entry.id} onClick={() => updateStatus(entry, 'cancelled')} aria-label={`Cancel ${entry.patientName}`}>Cancel</Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showAdd && (
        <RegisterModal hospitalId={user.hospitalId} onClose={() => setShowAdd(false)} onCreated={(entry) => { setShowAdd(false); fetchQueue(); emitEvent('PATIENT_ADDED', { patient: entry, severity: entry.severity }); }} />
      )}
    </div>
  );
}

function RegisterModal({ hospitalId, onClose, onCreated }) {
  const { addToast } = useNotifications();
  const [form, setForm] = useState({ patientName: '', age: '', department: DOCTOR_DEPARTMENTS[0], severity: 'medium' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const name = form.patientName.trim();
    if (!name) { setErr('Patient name is required.'); return; }
    if (name.length < 2) { setErr('Patient name looks too short.'); return; }
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 120)) { setErr('Age must be between 0 and 120.'); return; }

    setSaving(true);
    setErr('');
    try {
      const { data } = await opdService.create({ ...form, patientName: name, age: form.age ? Number(form.age) : undefined, hospitalId });
      addToast({ type: 'success', title: data.message || 'Patient registered' });
      onCreated(data.data);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Register OPD patient" onClose={onClose}>
      {err && <p className="text-xs text-status-critical mb-3">{err}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="opd-patient-name" className="sr-only">Patient name</label>
          <input id="opd-patient-name" value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} placeholder="Patient name" className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div>
          <label htmlFor="opd-age" className="sr-only">Age (optional)</label>
          <input id="opd-age" type="number" min="0" max="120" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} placeholder="Age (optional)" className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div>
          <label htmlFor="opd-department" className="sr-only">Department</label>
          <select id="opd-department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
            {DOCTOR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Severity</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {OPD_SEVERITIES.map((s) => (
              <button
                type="button" key={s} onClick={() => setForm((f) => ({ ...f, severity: s }))}
                aria-pressed={form.severity === s}
                className={`py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${form.severity === s ? 'bg-brand-600 border-brand-600 text-white' : 'border-surface-200 text-surface-600 hover:bg-surface-50'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={saving}>Register</Button>
        </div>
      </form>
    </Modal>
  );
}
