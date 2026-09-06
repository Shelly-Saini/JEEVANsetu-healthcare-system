import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../utils/AuthContext.jsx';

export default function Unauthorized() {
  const { homeFor, user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-status-criticalBg text-status-critical flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={26} />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Access denied</h1>
        <p className="text-surface-500 mb-6">
          Your account role doesn't have permission to view this page. Every route is enforced
          both here and on the server, so this isn't just a hidden link.
        </p>
        <button
          onClick={() => navigate(user ? homeFor(user.role) : '/login')}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Go to my dashboard
        </button>
      </div>
    </div>
  );
}
