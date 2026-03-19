import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext.jsx';

export default function Unauthorized() {
  const { homeFor, user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl mb-4">🚫</p>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You do not have permission to view this page.</p>
        <button
          onClick={() => navigate(user ? homeFor(user.role) : '/login')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
