import { useState, useMemo } from 'react';
import { Package, Plus, AlertTriangle, Minus, Search, Info } from 'lucide-react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { emitEvent } from '../utils/eventBus.js';
import { inventoryService } from '../services/api.js';
import { INVENTORY_CATEGORIES, INVENTORY_STATUS_META } from '../constants/enums.js';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { Button, ProgressBar } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardSkeleton } from '../components/ui/States.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';

// Status tiers are mutually exclusive (an item is exactly one of ok/low/critical),
// not overlapping — "critical" is not double-counted inside "low". The two
// numbers are meant to be read together as a breakdown of "needs restocking",
// which is why the UI always shows them side by side with that sum spelled out.
const computeStatus = (quantity, threshold) => (quantity <= threshold * 0.5 ? 'critical' : quantity <= threshold ? 'low' : 'ok');

export default function Inventory() {
  const { sharedItems, loading, error, refetch, hospitalId } = useHospital();
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [restockOnly, setRestockOnly] = useState(false);
  const canManage = user.role === 'admin' || user.role === 'staff';

  const enriched = useMemo(() => sharedItems.map((i) => ({ ...i, status: computeStatus(i.quantity, i.minThreshold) })), [sharedItems]);
  const lowCount = enriched.filter((i) => i.status === 'low').length;
  const criticalCount = enriched.filter((i) => i.status === 'critical').length;
  const needsRestocking = enriched.filter((i) => i.status !== 'ok');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enriched.filter((i) => {
      if (restockOnly && i.status === 'ok') return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (term && !i.item.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [enriched, search, categoryFilter, restockOnly]);

  const adjust = async (item, delta) => {
    const next = Math.max(0, (item.quantity || 0) + delta);
    setBusyId(item.id);
    try {
      await inventoryService.update(item.id, { quantity: next });
      const status = computeStatus(next, item.minThreshold);
      if (status === 'critical' && item.status !== 'critical') {
        addToast({ type: 'critical', title: `${item.item} critically low`, message: `${next} ${item.unit} remaining` });
        emitEvent('LOW_STOCK_ALERT', { itemName: item.item, category: item.category });
      } else if (delta > 0 && item.status !== 'ok' && status === 'ok') {
        addToast({ type: 'success', title: `${item.item} restocked`, message: `${next} ${item.unit} — back above threshold` });
        emitEvent('ITEM_RESTOCKED', { item: item.item });
      } else {
        addToast({ type: 'info', title: `${item.item} → ${next} ${item.unit}` });
      }
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total items tracked" value={enriched.length} icon={Package} tone="brand" />
        <StatCard label="Low (above 50% of threshold)" value={lowCount} icon={AlertTriangle} tone="warning" />
        <StatCard label="Critical (at/below 50% of threshold)" value={criticalCount} icon={AlertTriangle} tone="critical" />
      </div>

      {needsRestocking.length > 0 ? (
        <Card className="border-status-warning/30 bg-status-warningBg/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-status-warning shrink-0" />
            <p className="text-sm font-semibold text-surface-800">
              {needsRestocking.length} item{needsRestocking.length > 1 ? 's' : ''} need restocking
              <span className="font-normal text-surface-500"> ({criticalCount} critical, {lowCount} low)</span>
            </p>
          </div>
          <p className="text-xs text-surface-600">{needsRestocking.map((a) => a.item).join(', ')}</p>
        </Card>
      ) : (
        <Card className="border-status-success/30 bg-status-successBg/20">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-status-success shrink-0" />
            <p className="text-sm text-surface-800">All tracked items are above their restocking threshold.</p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item name…" aria-label="Search inventory items"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All categories</option>
          {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setRestockOnly((r) => !r)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${restockOnly ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
        >
          Needs restocking only
        </button>
        <div className="flex-1" />
        {canManage && <Button size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Add item</Button>}
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={Package} title="No matching items" description="Try clearing filters, or add a new inventory item." /></Card>
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left text-xs text-surface-500 uppercase tracking-wide">
                  <th scope="col" className="px-5 py-3 font-medium">Item</th>
                  <th scope="col" className="px-5 py-3 font-medium">Category</th>
                  <th scope="col" className="px-5 py-3 font-medium">Stock level (relative to threshold)</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  {canManage && <th scope="col" className="px-5 py-3 font-medium text-right">Adjust</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {visible.map((item) => {
                  const meta = INVENTORY_STATUS_META[item.status];
                  const pct = Math.min(100, Math.round((item.quantity / (item.minThreshold * 2)) * 100));
                  return (
                    <tr key={item.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-surface-800">{item.item}</td>
                      <td className="px-5 py-3 text-surface-500 capitalize">{item.category}</td>
                      <td className="px-5 py-3 w-56">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={pct} tone={meta.tone} className="flex-1" />
                          <span className="text-xs text-surface-500 tabular-nums w-24 shrink-0">{item.quantity} / {item.minThreshold} min</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      {canManage && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => adjust(item, -Math.max(1, Math.round(item.minThreshold * 0.1)))}
                              disabled={busyId === item.id || item.quantity === 0}
                              aria-label={`Decrease ${item.item} stock`}
                              className="w-7 h-7 rounded-lg border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100 disabled:opacity-40"
                            >
                              <Minus size={13} />
                            </button>
                            <button
                              onClick={() => adjust(item, Math.max(1, Math.round(item.minThreshold * 0.25)))}
                              disabled={busyId === item.id}
                              aria-label={`Increase ${item.item} stock`}
                              className="w-7 h-7 rounded-lg border border-surface-200 flex items-center justify-center text-surface-500 hover:bg-surface-100 disabled:opacity-40"
                            >
                              <Plus size={13} />
                            </button>
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
        <AddItemModal hospitalId={hospitalId} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); refetch(); }} />
      )}
    </div>
  );
}

function AddItemModal({ hospitalId, onClose, onCreated }) {
  const { addToast } = useNotifications();
  const [form, setForm] = useState({ item: '', category: INVENTORY_CATEGORIES[0], quantity: 100, unit: 'units', minThreshold: 30 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const name = form.item.trim();
    const unit = form.unit.trim();
    const quantity = Number(form.quantity);
    const minThreshold = Number(form.minThreshold);

    if (!name) return setErr('Item name is required.');
    if (!unit) return setErr('Unit is required (e.g. boxes, cylinders, vials).');
    if (Number.isNaN(quantity) || quantity < 0) return setErr('Quantity must be 0 or more.');
    if (Number.isNaN(minThreshold) || minThreshold <= 0) return setErr('Minimum threshold must be greater than 0.');

    setSaving(true);
    setErr('');
    try {
      await inventoryService.create({ ...form, item: name, unit, hospitalId, quantity, minThreshold });
      addToast({ type: 'success', title: `${name} added to inventory` });
      onCreated();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add inventory item" onClose={onClose}>
      {err && <p className="text-xs text-status-critical mb-3">{err}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="inv-name" className="sr-only">Item name</label>
          <input id="inv-name" value={form.item} onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))} placeholder="e.g. N95 Masks" className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div>
          <label htmlFor="inv-category" className="sr-only">Category</label>
          <select id="inv-category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm capitalize">
            {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inv-qty" className="block text-xs text-surface-500 mb-1">Quantity</label>
            <input id="inv-qty" type="number" min="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
          </div>
          <div>
            <label htmlFor="inv-threshold" className="block text-xs text-surface-500 mb-1">Min threshold</label>
            <input id="inv-threshold" type="number" min="1" value={form.minThreshold} onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
          </div>
        </div>
        <div>
          <label htmlFor="inv-unit" className="sr-only">Unit</label>
          <input id="inv-unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="unit (e.g. boxes, cylinders)" className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={saving}>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
