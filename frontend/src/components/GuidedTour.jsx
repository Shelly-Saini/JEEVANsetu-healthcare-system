import { useState } from 'react';
import { Users, BedDouble, Package, Stethoscope, ArrowRight, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { title: 'OPD Queue Management', description: 'Manage patient flow here. Register patients, triage by severity, and move them through the queue.', icon: Users },
  { title: 'Bed Management', description: 'Monitor and transition beds across ICU, General, and Emergency wards in real time.', icon: BedDouble },
  { title: 'Inventory Monitoring', description: 'Track medical supplies, get alerted on shortages, and restock critical items instantly.', icon: Package },
  { title: 'Doctor Availability', description: 'View workloads, see who is available, and identify overloaded departments.', icon: Stethoscope },
];

export default function GuidedTour() {
  const [step, setStep] = useState(0);
  // Lazy initializer instead of an effect — avoids a synchronous setState-in-effect render cascade
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && !localStorage.getItem('tourCompleted'));

  const finish = () => {
    localStorage.setItem('tourCompleted', 'true');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-popover border border-surface-100 w-full max-w-sm mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-brand-600' : 'w-1.5 bg-surface-200'}`} />
          ))}
        </div>

        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-4">
          <Icon size={22} />
        </div>

        <h3 className="text-base font-bold text-surface-900 text-center mb-2">{current.title}</h3>
        <p className="text-sm text-surface-500 text-center leading-relaxed mb-6">{current.description}</p>
        <p className="text-xs text-surface-400 text-center mb-4">Step {step + 1} of {STEPS.length}</p>

        <div className="flex gap-3">
          <button onClick={finish} className="flex-1 py-2 rounded-xl border border-surface-200 text-sm font-medium text-surface-500 hover:bg-surface-50 transition-colors">
            Skip tour
          </button>
          <button onClick={next} className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5">
            {step < STEPS.length - 1 ? <>Next <ArrowRight size={14} /></> : <>Get Started <CheckCircle2 size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
