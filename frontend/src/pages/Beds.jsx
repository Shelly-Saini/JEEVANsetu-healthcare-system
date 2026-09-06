import { useState } from 'react';
import { BedDouble, Plus, ArrowRight, Sparkles, UserCheck, AlertTriangle } from 'lucide-react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { bedService } from '../services/api.js';
import { BED_TYPES } from '../constants/enums.js';
import { sumBedTotals, occupancyPct as pctOf } from '../utils/bedMath.js';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { Button, ProgressBar } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardSkeleton } from '../components/ui/States.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';

const NEAR_CRITICAL_THRESHOLD = 85; // occupancy % at which a bed type needs attention

export default function Beds() {
  const { sharedBeds, loading, error, refetch, hospitalId } = useHospital();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [busyId, setBusyId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const canManage = user.role === 'admin' || user.role === 'staff';

  const totals = sumBedTotals(sharedBeds);
  const totalOccupancyPct = pctOf(totals);

  const transition = async (bed, status, label) => {
    setBusyId(bed.id);
    try {
      await bedService.update(bed.id, { status });
      addToast({ type: 'success', title: `${bed.type} bed → ${label}` });
    } catch (err) {
      addToast({ type: 'critical', title: 'Update failed', message: err.response?.data?.message || err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  if (error) return <ErrorState description={error} onRetry={refetch} />;

  const missingTypes = BED_TYPES.filter((t) => !sharedBeds.some((b) => b.type === t));
  // Highest-occupancy type shown first so the bed type needing attention is never buried.
  const sortedBeds = [...sharedBeds].sort((a, b) => pctOf(b) - pctOf(a));
  const needsAttention = sortedBeds.filter((b) => pctOf(b) >= NEAR_CRITICAL_THRESHOLD);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total beds" value={totals.total} icon={BedDouble} tone="brand" />
        <StatCard label="Available" value={totals.available} icon={UserCheck} tone="success" footnote={`${totals.total ? Math.round((totals.available / totals.total) * 100) : 0}% of capacity`} />
        <StatCard label="Occupied" value={totals.occupied} icon={BedDouble} tone="critical" footnote={`${totalOccupancyPct}% occupancy`} />
        <StatCard label="Cleaning" value={totals.cleaning} icon={Sparkles} tone="warning" />
      </div>

      {totals.total > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-surface-600 uppercase tracking-wide">Hospital-wide bed breakdown</p>
            <p className="text-xs text-surface-400">{totals.available} available + {totals.occupied} occupied + {totals.cleaning} cleaning = {totals.total} total</p>
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-surface-100">
            <div className="h-full bg-status-success" style={{ width: `${(totals.available / totals.total) * 100}%` }} title={`${totals.available} available`} />
            <div className="h-full bg-status-critical" style={{ width: `${(totals.occupied / totals.total) * 100}%` }} title={`${totals.occupied} occupied`} />
            <div className="h-full bg-status-warning" style={{ width: `${(totals.cleaning / totals.total) * 100}%` }} title={`${totals.cleaning} cleaning`} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-surface-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-success" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-critical" /> Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-warning" /> Cleaning</span>
          </div>
        </Card>
      )}

      {needsAttention.length > 0 && (
        <Card className="border-status-critical/30 bg-status-criticalBg/20">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-status-critical shrink-0" />
            <p className="text-sm text-surface-800">
              <span className="font-semibold">{needsAttention.length} bed type{needsAttention.length > 1 ? 's' : ''} at or above {NEAR_CRITICAL_THRESHOLD}% occupancy:</span>{' '}
              {needsAttention.map((b) => `${b.type} (${pctOf(b)}%)`).join(', ')}
            </p>
          </div>
        </Card>
      )}

      {sharedBeds.length === 0 ? (
        <Card>
          <EmptyState
            icon={BedDouble}
            title="No bed records yet"
            description="Add a bed type to start tracking capacity for this hospital."
            action={canManage && <Button icon={Plus} onClick={() => setShowAdd(true)}>Add bed type</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {sortedBeds.map((bed) => {
            const bedOccupancyPct = pctOf(bed);
            const tone = bedOccupancyPct >= NEAR_CRITICAL_THRESHOLD ? 'critical' : bedOccupancyPct >= 60 ? 'warning' : 'success';
            return (
              <Card key={bed.id} hover className={bedOccupancyPct >= NEAR_CRITICAL_THRESHOLD ? 'border-status-critical/40' : ''}>
                <CardHeader
                  title={`${bed.type} Beds`}
                  subtitle={`${bed.total} total capacity`}
                  icon={BedDouble}
                  action={<Badge tone={tone}>{bedOccupancyPct}% full</Badge>}
                />
                <ProgressBar value={bedOccupancyPct} tone={tone} className="mb-4" />
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <p className="text-lg font-bold text-status-success">{bed.available}</p>
                    <p className="text-[11px] text-surface-500">Available</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-status-critical">{bed.occupied}</p>
                    <p className="text-[11px] text-surface-500">Occupied</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-status-warning">{bed.cleaning}</p>
                    <p className="text-[11px] text-surface-500">Cleaning</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="secondary" className="flex-1" icon={ArrowRight}
                      disabled={bed.available === 0 || busyId === bed.id}
                      loading={busyId === bed.id}
                      onClick={() => transition(bed, 'occupied', 'Occupied')}
                    >
                      Occupy
                    </Button>
                    <Button
                      size="sm" variant="secondary" className="flex-1"
                      disabled={bed.occupied === 0 || busyId === bed.id}
                      onClick={() => transition(bed, 'cleaning', 'Cleaning')}
                    >
                      Discharge
                    </Button>
                    <Button
                      size="sm" variant="secondary" className="flex-1"
                      disabled={bed.cleaning === 0 || busyId === bed.id}
                      onClick={() => transition(bed, 'available', 'Available')}
                    >
                      Ready
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {canManage && missingTypes.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="border-2 border-dashed border-surface-300 rounded-card flex flex-col items-center justify-center gap-2 text-surface-400 hover:border-brand-400 hover:text-brand-600 transition-colors min-h-[200px]"
            >
              <Plus size={22} />
              <span className="text-sm font-medium">Add {missingTypes[0]} beds</span>
            </button>
          )}
        </div>
      )}

      {showAdd && (
        <AddBedModal
          hospitalId={hospitalId}
          missingTypes={missingTypes}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </div>
  );
}

function AddBedModal({ hospitalId, missingTypes, onClose, onCreated }) {
  const { addToast } = useNotifications();
  const [type, setType] = useState(missingTypes[0] || BED_TYPES[0]);
  const [total, setTotal] = useState(10);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const totalNum = Number(total);
    if (Number.isNaN(totalNum) || totalNum <= 0) { setErr('Total capacity must be greater than 0.'); return; }
    setSaving(true);
    setErr('');
    try {
      await bedService.create({ hospitalId, type, total: totalNum, available: totalNum, occupied: 0, cleaning: 0 });
      addToast({ type: 'success', title: `${type} beds added`, message: `${total} beds now tracked` });
      onCreated();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to add bed type');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add bed type" onClose={onClose}>
      {err && <p className="text-xs text-status-critical mb-3">{err}</p>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="bed-type" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Bed type</label>
          <select id="bed-type" value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
            {missingTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bed-total" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Total capacity</label>
          <input id="bed-total" type="number" min="1" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={saving}>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
