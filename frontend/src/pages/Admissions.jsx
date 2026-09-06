import { useState, useEffect, useCallback } from 'react';
import { BrainCircuit, CheckCircle2, AlertTriangle, ArrowRightCircle, History, Sparkles, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';
import { useNotifications } from '../utils/notificationStore.jsx';
import { emitEvent } from '../utils/eventBus.js';
import { admissionService } from '../services/api.js';
import { DOCTOR_DEPARTMENTS, BED_TYPES, OPD_SEVERITIES, ADMISSION_DECISION_META, ADMISSION_STATUS_META } from '../constants/enums.js';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import Badge from '../components/ui/Badge.jsx';

/**
 * Admissions — the Smart Admission decision workflow. Every number here (bed
 * availability, doctor availability, stress score) and the recommendation
 * itself come from the backend's admissionEngine — a deterministic,
 * explainable rules engine over real, current hospital data, not an AI
 * model. The engine only ever RECOMMENDS; a human with admit/doctor
 * permissions must explicitly confirm before anything is recorded or any
 * bed/doctor state changes.
 */
export default function Admissions() {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  const [form, setForm] = useState({ patientName: '', age: '', department: DOCTOR_DEPARTMENTS[0], bedType: BED_TYPES[0], severity: 'medium' });
  const [formError, setFormError] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);

  const canDecide = user.role === 'admin' || user.role === 'doctor';

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      const { data } = await admissionService.history(user.hospitalId);
      setHistory(data.data || []);
    } catch (err) {
      setHistoryError(err.response?.data?.message || err.message);
    }
  }, [user.hospitalId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const validateForm = () => {
    const name = form.patientName.trim();
    if (!name) return 'Patient name is required.';
    if (name.length < 2) return 'Patient name looks too short.';
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 120)) return 'Age must be between 0 and 120.';
    if (!form.department) return 'Department is required.';
    if (!form.bedType) return 'Bed type is required.';
    if (!OPD_SEVERITIES.includes(form.severity)) return 'Severity is required.';
    return '';
  };

  const runEvaluation = async () => {
    const validationError = validateForm();
    if (validationError) { setFormError(validationError); return; }
    setFormError('');
    setEvaluating(true);
    setEvaluation(null);
    setJustConfirmed(null);
    try {
      const { data } = await admissionService.evaluate({
        hospitalId: user.hospitalId, department: form.department, bedType: form.bedType, severity: form.severity,
      });
      setEvaluation(data.data);
    } catch (err) {
      addToast({ type: 'critical', title: 'Evaluation failed', message: err.response?.data?.message || err.message });
    } finally {
      setEvaluating(false);
    }
  };

  const confirmDecision = async () => {
    const validationError = validateForm();
    if (validationError) { setFormError(validationError); return; }
    setDeciding(true);
    try {
      const { data } = await admissionService.decide({
        hospitalId: user.hospitalId, patientName: form.patientName.trim(), age: form.age ? Number(form.age) : undefined,
        department: form.department, bedType: form.bedType, severity: form.severity,
      });
      const decision = data.data.result.decision;
      addToast({
        type: decision === 'admit' ? 'success' : decision === 'refer' ? 'critical' : 'warning',
        title: `Confirmed: ${ADMISSION_DECISION_META[decision].label}`,
      });
      emitEvent('ADMISSION_DECIDED', { patientName: form.patientName, decision });
      setJustConfirmed({ patientName: form.patientName.trim(), decision });
      setForm((f) => ({ ...f, patientName: '', age: '' }));
      setEvaluation(null);
      loadHistory();
    } catch (err) {
      addToast({ type: 'critical', title: 'Could not record decision', message: err.response?.data?.message || err.message });
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: patient + evaluation ─────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader
              title="Evaluate a new patient"
              subtitle="Runs a deterministic, rules-based engine against this hospital's current beds, doctors, and stress level — not an AI model"
              icon={BrainCircuit}
            />
            {formError && <p className="text-xs text-status-critical mb-3">{formError}</p>}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label htmlFor="adm-name" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Patient name</label>
                <input
                  id="adm-name"
                  value={form.patientName} onChange={(e) => { setForm((f) => ({ ...f, patientName: e.target.value })); setFormError(''); }}
                  placeholder="Required before evaluating"
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm"
                />
              </div>
              <div>
                <label htmlFor="adm-age" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Age</label>
                <input id="adm-age" type="number" min="0" max="120" value={form.age} onChange={(e) => { setForm((f) => ({ ...f, age: e.target.value })); setFormError(''); }} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm" />
              </div>
              <div>
                <label htmlFor="adm-severity" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Severity</label>
                <select id="adm-severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm capitalize">
                  {OPD_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="adm-dept" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Department</label>
                <select id="adm-dept" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
                  {DOCTOR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="adm-bedtype" className="block text-xs font-semibold text-surface-600 uppercase tracking-wide mb-1.5">Bed type needed</label>
                <select id="adm-bedtype" value={form.bedType} onChange={(e) => setForm((f) => ({ ...f, bedType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm">
                  {BED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <Button icon={Sparkles} loading={evaluating} onClick={runEvaluation} className="w-full">
              Evaluate against live hospital data
            </Button>
          </Card>

          {justConfirmed && (
            <Card className="border-status-success/30 bg-status-successBg/20">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-status-success shrink-0" />
                <p className="text-sm text-surface-800">
                  <span className="font-semibold">Confirmed decision recorded</span> for {justConfirmed.patientName}: {ADMISSION_DECISION_META[justConfirmed.decision].label}.
                  This is now a permanent record in the audit log — not just a recommendation.
                </p>
              </div>
            </Card>
          )}

          {evaluation && (
            <EvaluationResult
              evaluation={evaluation}
              canDecide={canDecide}
              deciding={deciding}
              patientNamed={!!form.patientName.trim()}
              onConfirm={confirmDecision}
            />
          )}
        </div>

        {/* ── Right: recent decisions ────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Recent admission decisions" icon={History} subtitle="Confirmed & recorded outcomes — not recommendations" />
            {historyError ? (
              <ErrorState description={historyError} onRetry={loadHistory} />
            ) : history.length === 0 ? (
              <EmptyState icon={History} title="No decisions recorded yet" description="Evaluate and confirm a patient to see it appear here." />
            ) : (
              <ul className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
                {history.map((h) => {
                  const meta = ADMISSION_STATUS_META[h.status] || ADMISSION_STATUS_META.pending;
                  return (
                    <li key={h.id} className="border border-surface-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-surface-800">{h.patientName}</p>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-surface-500">{h.department} · {h.bedType} bed</p>
                      <p className="text-xs text-surface-400 mt-1">{new Date(h.createdAt).toLocaleString()}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function EvaluationResult({ evaluation, canDecide, deciding, patientNamed, onConfirm }) {
  const { decision, reasons, metrics, referral } = evaluation;
  const meta = ADMISSION_DECISION_META[decision];
  const DecisionIcon = decision === 'admit' ? CheckCircle2 : decision === 'refer' ? ArrowRightCircle : AlertTriangle;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: 'currentColor' }}>
      <div className={`flex items-center gap-3 mb-4 ${decision === 'admit' ? 'text-status-success' : decision === 'refer' ? 'text-status-critical' : 'text-status-warning'}`}>
        <div className="w-11 h-11 rounded-xl bg-current/10 flex items-center justify-center">
          <DecisionIcon size={22} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">System Recommendation — not yet confirmed</p>
          <p className="text-xl font-bold">{meta.label}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Why the engine recommends this</p>
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-sm text-surface-700 flex gap-2">
              <span className="text-surface-300">—</span>{r}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Metric label="Hospital stress" value={`${metrics.hospitalStressScore}/100`} sub={metrics.hospitalStressLabel} />
        <Metric label={`${metrics.bedType} beds`} value={`${metrics.bedAvailable}/${metrics.bedTotal}`} sub={`${metrics.bedOccupancyPct}% occupied`} />
        <Metric label={`${metrics.department} doctors`} value={`${metrics.doctorsAvailableCount}/${metrics.doctorsInDeptCount}`} sub="available now" />
      </div>

      {referral && (
        <div className="bg-status-infoBg border border-status-info/20 rounded-xl p-3 mb-4">
          <p className="text-xs font-semibold text-status-info uppercase tracking-wide mb-1">Suggested alternative hospital</p>
          <p className="text-sm text-surface-800">{referral.name} — stress score {referral.stressScore}/100, {referral.availableBeds} beds available</p>
        </div>
      )}
      {decision === 'refer' && !referral && (
        <div className="bg-status-criticalBg border border-status-critical/20 rounded-xl p-3 mb-4">
          <p className="text-sm text-surface-800">No alternative hospital in this city currently has an available bed of this type either — this case needs manual coordination.</p>
        </div>
      )}

      {canDecide ? (
        <Button className="w-full" loading={deciding} disabled={!patientNamed} onClick={onConfirm}>
          {patientNamed ? `Confirm & record this decision` : 'Enter patient name to confirm'}
        </Button>
      ) : (
        <p className="text-xs text-surface-400 text-center">Your role can evaluate but not confirm admission decisions — that requires Admin or Doctor.</p>
      )}
    </Card>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div className="bg-surface-50 rounded-lg p-3 text-center">
      <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-surface-900 mt-0.5">{value}</p>
      <p className="text-[11px] text-surface-500">{sub}</p>
    </div>
  );
}
