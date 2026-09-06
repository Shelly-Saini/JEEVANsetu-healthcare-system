import { useState, useMemo } from 'react';
import { Stethoscope, Plus, Users, Activity, AlertOctagon, AlertTriangle } from 'lucide-react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { emitEvent } from '../utils/eventBus.js';
import { doctorService } from '../services/api.js';
import { DOCTOR_DEPARTMENTS, DOCTOR_STATUS_META } from '../constants/enums.js';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { Button, ProgressBar } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardSkeleton } from '../components/ui/States.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';

const CRITICAL_WORKLOAD = 90; // workload % that flags a doctor as needing attention
const SORTS = { name: 'Name', workload: 'Workload (high → low)', status: 'Status' };
const STATUS_ORDER = { unavailable: 0, busy: 1, available: 2 };

export default function Doctors() {
  const { sharedDoctors, loading, error, refetch, hospitalId } = useHospital();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('workload');
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const canManage = user.role === 'admin' || user.role === 'doctor';

  const stats = useMemo(() => ({
    total: sharedDoctors.length,
    available: sharedDoctors.filter((d) => d.status === 'available').length,
    busy: sharedDoctors.filter((d) => d.status === 'busy').length,
    unavailable: sharedDoctors.filter((d) => d.status === 'unavailable').length,
  }), [sharedDoctors]);

  const departments = [...new Set(sharedDoctors.map((d) => d.department))];

  // Doctors sharing an exact name are distinguished using real data already
  // on the record (department + shift) rather than inventing anything.
  const nameCounts = useMemo(() => {
    const counts = {};
    sharedDoctors.forEach((d) => { counts[d.name] = (counts[d.name] || 0) + 1; });
    return counts;
  }, [sharedDoctors]);

  const needsAttention = useMemo(
    () => sharedDoctors.filter((d) => (d.workload ?? 0) >= CRITICAL_WORKLOAD).sort((a, b) => (b.workload ?? 0) - (a.workload ?? 0)),
    [sharedDoctors]
  );

  const visible = useMemo(() => {
    let list = sharedDoctors.filter((d) => {
      if (departmentFilter !== 'all' && d.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
    if (sortBy === 'workload') list = [...list].sort((a, b) => (b.workload ?? 0) - (a.workload ?? 0));
    else if (sortBy === 'status') list = [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [sharedDoctors, departmentFilter, statusFilter, sortBy]);

  const setStatus = async (doc, status) => {
    setBusyId(doc.id);
    try {
      const workload = status === 'available' ? Math.min(doc.workload ?? 0, 50) : status === 'busy' ? Math.max(doc.workload ?? 0, 70) : doc.workload;
      await doctorService.update(doc.id, { status, workload });
      addToast({ type: 'success', title: `Dr. ${doc.name} → ${DOCTOR_STATUS_META[status].label}` });
      emitEvent('DOCTOR_STATUS_CHANGED', { name: doc.name, status });
    } catch (err) {
      addToast({ type: 'critical', title: 'Update failed', message: err.response?.data?.message || err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (error) return <ErrorState description={error} onRetry={refetch} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total doctors" value={stats.total} icon={Users} tone="brand" />
        <StatCard label="Available" value={stats.available} icon={Activity} tone="success" />
        <StatCard label="Busy" value={stats.busy} icon={Stethoscope} tone="warning" />
        <StatCard label="Unavailable" value={stats.unavailable} icon={AlertOctagon} tone="critical" />
      </div>

      {needsAttention.length > 0 && (
        <Card className="border-status-critical/30 bg-status-criticalBg/20">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-status-critical shrink-0" />
            <p className="text-sm text-surface-800">
              <span className="font-semibold">{needsAttention.length} doctor{needsAttention.length > 1 ? 's' : ''} at or above {CRITICAL_WORKLOAD}% workload:</span>{' '}
              {needsAttention.map((d) => `Dr. ${d.name} (${d.workload}%)`).join(', ')}
            </p>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department" className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-xs text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-xs text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort doctors" className="px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-xs text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>Sort: {label}</option>)}
          </select>
        </div>
        {canManage && <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Add doctor</Button>}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={Stethoscope} title="No doctors found" description="Try different filters, or add a doctor to the roster." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((doc) => {
            const meta = DOCTOR_STATUS_META[doc.status] || DOCTOR_STATUS_META.available;
            const workload = doc.workload ?? 0;
            const critical = workload >= CRITICAL_WORKLOAD;
            const tone = critical ? 'critical' : workload > 60 ? 'warning' : 'success';
            const isDuplicateName = nameCounts[doc.name] > 1;
            return (
              <Card key={doc.id} hover className={critical ? 'border-status-critical/50' : ''}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {doc.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{doc.name}</p>
                      <p className="text-xs text-surface-500">
                        {doc.department}{isDuplicateName ? ` · ${doc.shift || 'morning'} shift` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-surface-500 mb-1">
                    <span>Workload</span><span className="font-medium">{workload}%{critical ? ' · needs attention' : ''}</span>
                  </div>
                  <ProgressBar value={workload} tone={tone} />
                </div>

                <p className="text-xs text-surface-500 mb-3">{doc.patientsToday ?? 0} patients today · {doc.shift || 'morning'} shift</p>

                {canManage && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" disabled={doc.status === 'available' || busyId === doc.id} onClick={() => setStatus(doc, 'available')}>Available</Button>
                    <Button size="sm" variant="secondary" className="flex-1" disabled={doc.status === 'busy' || busyId === doc.id} onClick={() => setStatus(doc, 'busy')}>Busy</Button>
                    <Button size="sm" variant="secondary" className="flex-1" disabled={doc.status === 'unavailable' || busyId === doc.id} onClick={() => setStatus(doc, 'unavailable')}>Unavailable</Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddDoctorModal hospitalId={hospitalId} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); refetch(); }} />
      )}
    </div>
  );
}

function AddDoctorModal({ hospitalId, onClose, onCreated }) {
  const { addToast } = useNotifications();
  const [form, setForm] = useState({ name: '', department: DOCTOR_DEPARTMENTS[0], shift: 'morning' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setErr('Doctor name is required.'); return; }
    if (name.length < 3) { setErr('Doctor name looks too short.'); return; }
    setSaving(true);
    setErr('');
    try {
      await doctorService.create({ ...form, name, hospitalId, status: 'available', workload: 20 });
      addToast({ type: 'success', title: `Dr. ${name} added to roster` });
      onCreated();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to add doctor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add doctor" onClose={onClose}>
      {err && <p className="text-xs text-status-critical mb-3">{err}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="doc-name" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Full name</label>
          <input id="doc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dr. Anita Rao" className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div>
          <label htmlFor="doc-dept" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Department</label>
          <select id="doc-dept" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
            {DOCTOR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="doc-shift" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Shift</label>
          <select id="doc-shift" value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
            <option value="morning">Morning</option><option value="evening">Evening</option><option value="night">Night</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={saving}>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
