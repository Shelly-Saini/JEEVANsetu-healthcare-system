import { useState, useMemo, useEffect, useRef } from 'react';
import { useHospital } from '../utils/hospitalStore.jsx';
import { onEvent, emitEvent } from '../utils/eventBus.js';
import Tooltip from '../components/Tooltip.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['PPE', 'Medicines', 'Equipment', 'Emergency'];

const INITIAL_ITEMS = [
  { id: 'I01', name: 'Surgical Masks',      category: 'PPE',       quantity: 120, minRequired: 200 },
  { id: 'I02', name: 'Nitrile Gloves',      category: 'PPE',       quantity: 300, minRequired: 400 },
  { id: 'I03', name: 'Face Shields',        category: 'PPE',       quantity: 40,  minRequired: 100 },
  { id: 'I04', name: 'Gowns',              category: 'PPE',       quantity: 85,  minRequired: 150 },
  { id: 'I05', name: 'Paracetamol',         category: 'Medicines', quantity: 500, minRequired: 600 },
  { id: 'I06', name: 'Amoxicillin',         category: 'Medicines', quantity: 80,  minRequired: 300 },
  { id: 'I07', name: 'IV Fluids',           category: 'Medicines', quantity: 60,  minRequired: 120 },
  { id: 'I08', name: 'Insulin',             category: 'Medicines', quantity: 25,  minRequired: 80  },
  { id: 'I09', name: 'Pulse Oximeter',      category: 'Equipment', quantity: 18,  minRequired: 20  },
  { id: 'I10', name: 'BP Monitor',          category: 'Equipment', quantity: 10,  minRequired: 15  },
  { id: 'I11', name: 'Ventilator',          category: 'Equipment', quantity: 3,   minRequired: 8   },
  { id: 'I12', name: 'Syringe (10ml)',      category: 'Equipment', quantity: 400, minRequired: 500 },
  { id: 'I13', name: 'Defibrillator Pads',  category: 'Emergency', quantity: 12,  minRequired: 30  },
  { id: 'I14', name: 'Epinephrine',         category: 'Emergency', quantity: 8,   minRequired: 50  },
  { id: 'I15', name: 'Oxygen Cylinders',    category: 'Emergency', quantity: 15,  minRequired: 25  },
  { id: 'I16', name: 'Crash Cart Supplies', category: 'Emergency', quantity: 5,   minRequired: 10  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const avgOf = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

const computeStatus = ({ quantity, minThreshold }) => {
  if (quantity >= minThreshold)              return 'OK';
  if (quantity >= minThreshold * 0.5)        return 'Low';
  return 'Critical';
};

const shortagePct = ({ quantity, minThreshold }) =>
  minThreshold > 0 ? Math.round(((minThreshold - quantity) / minThreshold) * 100) : 0;

// stock level as % of minThreshold (capped at 100)
const stockPct = ({ quantity, minThreshold }) =>
  minThreshold > 0 ? Math.min(Math.round((quantity / minThreshold) * 100), 100) : 100;

const withStatus = (items) => items.map(i => ({ ...i, status: computeStatus(i) }));

const STATUS_ORDER = { Critical: 0, Low: 1, OK: 2 };

const STATUS_STYLE = {
  OK:       'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  Low:      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Critical: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
};

const BAR_COLOR = (pct) => pct <= 30 ? 'bg-red-500' : pct <= 60 ? 'bg-yellow-500' : 'bg-green-500';

const USAGE_PER_DAY = { PPE: 20, Medicines: 15, Equipment: 5, Emergency: 10 };
const daysRemaining = (item) => Math.floor(item.quantity / (USAGE_PER_DAY[item.category] || 10));

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

function StockBar({ item }) {
  const sp   = stockPct(item);
  const days = daysRemaining(item);
  return (
    <div className="min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
          <div
            className={`${BAR_COLOR(sp)} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${sp}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8 text-right">{sp}%</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.quantity} / {item.minThreshold} units</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">Stock lasts ~{days} day{days !== 1 ? 's' : ''}</p>
    </div>
  );
}

function CategoryCard({ cat, items }) {
  const total    = items.length;
  const critical = items.filter(i => i.status === 'Critical').length;
  const avgStock = avgOf(items.map(i => stockPct(i)));
  const borderCls = avgStock < 50 ? 'border-red-400' : avgStock < 70 ? 'border-yellow-400' : 'border-gray-100 dark:border-gray-800';
  const bgTint    = avgStock < 50 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900';

  return (
    <div className={`${bgTint} rounded-2xl border-2 ${borderCls} shadow-sm p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">{cat}</h3>
        <span className="text-xs font-semibold text-gray-400">{total} items</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center mb-4">
        {[['Critical', critical, 'text-red-600'], ['Avg Stock', `${avgStock}%`, 'text-indigo-600']].map(([l, v, c]) => (
          <div key={l}>
            <p className={`text-xl font-black ${c} dark:opacity-90`}>{v}</p>
            <p className="text-xs text-gray-400">{l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Avg Stock Level</span><span className="font-semibold">{avgStock}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
          <div className={`${BAR_COLOR(avgStock)} h-2 rounded-full transition-all duration-500`} style={{ width: `${avgStock}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Inventory() {
  const { sharedItems, setSharedItems } = useHospital();
  const [items, setItems] = [sharedItems, setSharedItems];
  const [lastUpdated,  setLastUpdated] = useState({ time: fmt(new Date()), ts: Date.now(), prevTotal: INITIAL_ITEMS.reduce((s, i) => s + i.quantity, 0) });
  const [now,          setNow]         = useState(Date.now());
  const [filter,       setFilter]      = useState('All');
  const [highlightedId, setHighlightedId] = useState(null);
  const [pingId,         setPingId]        = useState(null);
  const rowRefs = useRef({});

  // ── Event bus: react to OPD patient additions ─────────────────────────────
  useEffect(() => {
    return onEvent('PATIENT_ADDED', ({ severity }) => {
      setItems(prev => {
        // Medicines: -5 units; Emergency severity: also -2 Emergency supplies
        let updated = prev;
        const medIdx = prev.findIndex(i => i.category === 'Medicines' && i.quantity > 0);
        if (medIdx !== -1) {
          updated = updated.map((item, i) =>
            i === medIdx ? { ...item, quantity: Math.max(item.quantity - 5, 0) } : item
          );
        }
        if (severity === 'Critical' || severity === 'High') {
          const emgIdx = updated.findIndex(i => i.category === 'Emergency' && i.quantity > 0);
          if (emgIdx !== -1) {
            updated = updated.map((item, i) =>
              i === emgIdx ? { ...item, quantity: Math.max(item.quantity - 2, 0) } : item
            );
          }
        }
        return withStatus(updated);
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
    const prevTotal = prev.reduce((s, i) => s + i.quantity, 0);
    setLastUpdated({ time: fmt(new Date()), ts: Date.now(), prevTotal });
    setNow(Date.now());
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total    = items.length;
  const okCount  = useMemo(() => items.filter(i => i.status === 'OK').length,       [items]);
  const lowCount = useMemo(() => items.filter(i => i.status === 'Low').length,      [items]);
  const critCount= useMemo(() => items.filter(i => i.status === 'Critical').length, [items]);

  const totalQty = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const qtyDelta = totalQty - lastUpdated.prevTotal;

  // Restock urgently: item with highest shortage %
  const urgentItem = useMemo(() => {
    const nonOk = items.filter(i => i.status !== 'OK');
    return nonOk.length
      ? nonOk.reduce((a, b) => shortagePct(a) >= shortagePct(b) ? a : b)
      : null;
  }, [items]);

  // Critical alert categories (deduplicated)
  const criticalCategories = useMemo(() =>
    [...new Set(items.filter(i => i.status === 'Critical').map(i => i.category))],
  [items]);

  // Filtered + sorted: Critical → Low → OK, then highest shortage % descending
  const filtered = useMemo(() => {
    const base = filter === 'All'
      ? items
      : items.filter(i => i.category === filter || i.status === filter);
    return base.slice().sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return sd !== 0 ? sd : shortagePct(b) - shortagePct(a);
    });
  }, [items, filter]);

  const hasCritOrLow = critCount + lowCount > 0;

  // ── Actions ────────────────────────────────────────────────────────────────
  const useSupplies = () => {
    setItems(prev => {
      stamp(prev);
      const idx = Math.floor(Math.random() * prev.length);
      const delta = Math.floor(Math.random() * 16) + 5;
      const updated = withStatus(prev.map((item, i) =>
        i === idx ? { ...item, quantity: clamp(item.quantity - delta, 0, Infinity) } : item
      ));
      // emit if the affected item just became critical
      const affected = updated[idx];
      if (affected.status === 'Critical' && prev[idx].status !== 'Critical') {
        emitEvent('LOW_STOCK_ALERT', { itemName: affected.name, category: affected.category });
      }
      return updated;
    });
  };

  const restock = () => {
    setItems(prev => {
      const critical = prev.filter(i => i.quantity < i.minRequired);
      if (!critical.length) return prev;
      const worst = [...critical].sort(
        (a, b) => (a.quantity / a.minThreshold) - (b.quantity / b.minThreshold)
      )[0];
      const updated = withStatus(prev.map(item =>
        item.id === worst.id
          ? { ...item, quantity: Math.min(item.quantity + 20, item.minThreshold * 2) }
          : item
      ));
      stamp(prev);
      emitEvent('ITEM_RESTOCKED', { item: worst.name, category: worst.category });
      return updated;
    });
  };

  const restockItem = (id) => {
    setItems(prev => {
      const target = prev.find(i => i.id === id);
      const updated = withStatus(prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.min(item.quantity + 20, item.minThreshold * 2) }
          : item
      ));
      stamp(prev);
      if (target) emitEvent('ITEM_RESTOCKED', { item: target.name, category: target.category });
      return updated;
    });
  };

  const scrollToUrgent = () => {
    if (!urgentItem) return;
    setFilter('All');
    setHighlightedId(urgentItem.id);
    setPingId(urgentItem.id);
    setTimeout(() => {
      rowRefs.current[urgentItem.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => { setHighlightedId(null); setPingId(null); }, 2000);
  };

  // alerts: critical items first, then low — capped at 2 visible
  const allAlerts = useMemo(() => [
    ...items.filter(i => i.status === 'Critical'),
    ...items.filter(i => i.status === 'Low'),
  ], [items]);
  const visibleAlerts = allAlerts.slice(0, 2);
  const hiddenAlertCount = allAlerts.length - visibleAlerts.length;

  // mins since last restock
  const minsSinceRestock = Math.floor((Date.now() - lastUpdated.ts) / 60000);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} items
            {critCount > 0 && <span className="text-red-500 font-semibold"> · {critCount} critical</span>}
            {lowCount > 0 && <span className="text-yellow-500 font-semibold"> · {lowCount} low</span>}
            <span className="text-gray-400"> · Last restock {minsSinceRestock === 0 ? 'just now' : `${minsSinceRestock} min${minsSinceRestock !== 1 ? 's' : ''} ago`}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last updated: {lastUpdated.time}
            {now - lastUpdated.ts < 10000 && <span className="ml-1 text-green-500 font-medium">· just now</span>}
            {qtyDelta !== 0 && (
              <span className={`ml-2 font-semibold ${qtyDelta < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {qtyDelta < 0 ? `${Math.abs(qtyDelta)} units consumed` : `+${qtyDelta} units restocked`}
              </span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <Tooltip text="Automatically restocks the most critically low item">
              <button onClick={restock} disabled={!hasCritOrLow} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                🔄 Restock
              </button>
            </Tooltip>
            <Tooltip text="Simulates consumption of a random inventory item">
              <button onClick={useSupplies} className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold rounded-lg transition-all duration-200">
                📦 Use Supplies
              </button>
            </Tooltip>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Tip: Restock targets the most critical item automatically</p>
        </div>
      </div>

      {/* Alerts — max 2 visible, differentiated by severity */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(item => {
            const isCrit = item.status === 'Critical';
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border-l-4 transition-all duration-200 hover:shadow-md ${
                  isCrit
                    ? 'bg-red-50 dark:bg-red-900/20 border-l-red-500 border border-red-200 dark:border-red-700 animate-[pulse_2s_ease-in-out_infinite]'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-400 border border-yellow-200 dark:border-yellow-700'
                }`}
              >
                <span className={isCrit ? 'text-red-500' : 'text-yellow-500'}>⚠️</span>
                <p className={`text-sm font-semibold flex-1 ${
                  isCrit ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                }`}>
                  {isCrit ? 'Critical' : 'Low stock'}: {item.name}
                  <span className="ml-1 font-normal opacity-70">({item.category} · {shortagePct(item)}% shortage)</span>
                </p>
              </div>
            );
          })}
          {hiddenAlertCount > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">+{hiddenAlertCount} more alert{hiddenAlertCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Restock recommendation — clickable with CTA */}
      {urgentItem && (
        <div
          role="button"
          onClick={scrollToUrgent}
          title="Click to highlight this item in the table"
          className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:shadow-md transition-all duration-200"
        >
          <span className="text-indigo-500">💡</span>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 flex-1">
            Restock urgently: <span className="font-bold">{urgentItem.name}</span>
            <span className="ml-1 opacity-70">({urgentItem.category} · {shortagePct(urgentItem)}% shortage)</span>
            <span className="text-xs text-indigo-400 ml-2">Auto-detected</span>
          </p>
          <button
            onClick={e => { e.stopPropagation(); restockItem(urgentItem.id); }}
            className="shrink-0 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all duration-200"
          >
            Restock Now →
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Items"   count={total}     total={total} color="blue"   icon="📦" />
        <SummaryCard label="OK"            count={okCount}   total={total} color="green"  icon="✅" />
        <SummaryCard label="Low Stock"     count={lowCount}  total={total} color="yellow" icon="🟡" />
        <SummaryCard label="Critical"      count={critCount} total={total} color="red"    icon="🔴" />
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {CATEGORIES.map(cat => (
          <CategoryCard key={cat} cat={cat} items={items.filter(i => i.category === cat)} />
        ))}
      </div>

      {/* Inventory table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">📦 Item List</h2>
          <div className="flex flex-wrap gap-2">
            {['All', ...CATEGORIES, 'OK', 'Low', 'Critical'].map(f => (
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
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Stock Level</th>
                <th className="px-4 py-3 text-left">Min Required</th>
                <th className="px-4 py-3 text-left">Shortage</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No items match this filter</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try selecting a different category or status</p>
                  </td>
                </tr>
              )}
              {filtered.map(item => {
                const isCritical  = item.status === 'Critical';
                const isFlashing  = highlightedId === item.id;
                const sp          = shortagePct(item);
                const rowCls      = isCritical
                  ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50';
                return (
                  <tr
                    key={item.id}
                    ref={el => rowRefs.current[item.id] = el}
                    className={`transition-all duration-300 ease-in-out ${rowCls} ${isCritical ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''} ${isFlashing ? 'ring-2 ring-inset ring-indigo-400' : ''} ${pingId === item.id ? 'animate-[ping_1s_ease-out]' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.category}</td>
                    <td className="px-4 py-3"><StockBar item={item} /></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.minThreshold}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${sp > 50 ? 'text-red-600 dark:text-red-400' : sp > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {sp > 0 ? `${sp}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
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
