import { useState, useEffect } from 'react';

const STEPS = [
  {
    title: 'OPD Queue Management',
    description: 'Manage patient flow here. Add patients, call next, and simulate rush scenarios.',
    icon: '🪑',
    position: 'center',
  },
  {
    title: 'Bed Management',
    description: 'Monitor and assign beds across ICU, General, and Emergency wards in real time.',
    icon: '🛏️',
    position: 'center',
  },
  {
    title: 'Inventory Monitoring',
    description: 'Track medical supplies, detect shortages, and restock critical items instantly.',
    icon: '📦',
    position: 'center',
  },
  {
    title: 'Doctor Availability',
    description: 'View workloads, assign patients, and identify overloaded departments.',
    icon: '👨‍⚕️',
    position: 'center',
  },
];

export default function GuidedTour() {
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tourCompleted')) setVisible(true);
  }, []);

  const finish = () => {
    localStorage.setItem('tourCompleted', 'true');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm mx-4 p-6 animate-[scaleIn_0.25s_ease-out]">

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-4xl text-center mb-3">{current.icon}</div>

        {/* Content */}
        <h3 className="text-base font-bold text-gray-900 dark:text-white text-center mb-2">
          {current.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Step counter */}
        <p className="text-xs text-gray-400 text-center mb-4">
          Step {step + 1} of {STEPS.length}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={finish}
            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {step < STEPS.length - 1 ? 'Next →' : 'Get Started ✓'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
