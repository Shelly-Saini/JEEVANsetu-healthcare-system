import { useState, useEffect, useCallback } from 'react';
import { History, User, BedDouble, Stethoscope, Package, Users, BrainCircuit, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { auditService, hospitalService } from '../services/api.js';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';

const RESOURCE_ICON = { bed: BedDouble, doctor: Stethoscope, inventory: Package, opd: Users, admission: BrainCircuit };
const RESOURCE_TYPES = ['bed', 'doctor', 'inventory', 'opd', 'admission'];
const ACTOR_ROLES = ['admin', 'doctor', 'staff', 'city_admin'];
const ROLE_TONE = { admin: 'text-status-critical', doctor: 'text-status-info', staff: 'text-status-success', city_admin: 'text-brand-700', system: 'text-surface-400' };

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [resourceType, setResourceType] = useState('all');
  const [actorRole, setActorRole] = useState('all');
  const [search, setSearch] = useState('');
  const [cityHospitalId, setCityHospitalId] = useState('all');
  const [cityHospitals, setCityHospitals] = useState([]);

  useEffect(() => {
    if (user.role !== 'city_admin') return;
    hospitalService.getAll().then((res) => {
      setCityHospitals((res.data?.data ?? []).filter((h) => h.cityId === user.cityId));
    }).catch(() => setCityHospitals([]));
  }, [user.role, user.cityId]);

  const load = useCallback(async (targetPage, append) => {
    try {
      setError(null);
      if (append) setLoadingMore(true); else setLoading(true);
      const params = { page: targetPage, limit: 20 };
      if (resourceType !== 'all') params.resourceType = resourceType;
      if (actorRole !== 'all') params.actorRole = actorRole;
      if (search.trim()) params.search = search.trim();
      if (user.role === 'city_admin' && cityHospitalId !== 'all') params.hospitalId = cityHospitalId;

      const { data } = await auditService.getAll(params);
      setLogs((prev) => (append ? [...prev, ...(data.data || [])] : data.data || []));
      setHasMore(!!data.hasMore);
      setPage(targetPage);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [resourceType, actorRole, search, cityHospitalId, user.role]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { load(1, false); }, [resourceType, actorRole, cityHospitalId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce the free-text search so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(1, false), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader
          title="Activity log"
          subtitle={user.role === 'city_admin' ? 'Scoped to hospitals in your assigned city' : 'Every mutation across beds, doctors, inventory, OPD & admissions'}
          icon={History}
        />

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity…" aria-label="Search activity log"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} aria-label="Filter by resource type" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 capitalize focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">All resource types</option>
            {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={actorRole} onChange={(e) => setActorRole(e.target.value)} aria-label="Filter by actor role" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="all">All roles</option>
            {ACTOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {user.role === 'city_admin' && (
            <select value={cityHospitalId} onChange={(e) => setCityHospitalId(e.target.value)} aria-label="Filter by hospital" className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="all">All hospitals in city</option>
              {cityHospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
          </ul>
        ) : error ? (
          <ErrorState description={error} onRetry={() => load(1, false)} />
        ) : logs.length === 0 ? (
          <EmptyState icon={History} title="No matching activity" description="Try clearing filters, or check back after actions are taken." />
        ) : (
          <>
            <ol className="relative border-l border-surface-100 ml-3 space-y-5">
              {logs.map((entry) => (
                <AuditEntry key={entry.id} entry={entry} expanded={expandedId === entry.id} onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)} />
              ))}
            </ol>
            {hasMore && (
              <div className="flex justify-center mt-5">
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={() => load(page + 1, true)}>Load more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function AuditEntry({ entry, expanded, onToggle }) {
  const Icon = RESOURCE_ICON[entry.resourceType] || History;
  const hasDetail = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <li className="ml-5">
      <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-white border-2 border-brand-500" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Icon size={15} className="text-surface-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-surface-800 font-medium">{entry.summary}</p>
            <p className="text-xs text-surface-400 mt-0.5">
              <User size={11} className="inline -mt-0.5 mr-1" />
              <span className={`font-medium ${ROLE_TONE[entry.actorRole] || ''}`}>{entry.actorName}</span>
              <span className="mx-1">·</span>{entry.actorRole}
              <span className="mx-1">·</span>{new Date(entry.createdAt).toLocaleString()}
              <span className="mx-1">·</span><span className="font-mono">{entry.resourceId?.slice(0, 8)}</span>
            </p>
            {hasDetail && expanded && (
              <pre className="mt-2 bg-surface-50 border border-surface-100 rounded-lg p-2.5 text-[11px] text-surface-600 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
        {hasDetail && (
          <button onClick={onToggle} aria-label={expanded ? 'Collapse details' : 'Expand details'} className="shrink-0 text-surface-400 hover:text-surface-600 transition-colors p-1">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
    </li>
  );
}
