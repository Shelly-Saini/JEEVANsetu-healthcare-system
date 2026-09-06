import axios from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';

const ALLOWED_API_ORIGINS = [
  '/api',
  'https://jeevansetuthealthcaresystem.vercel.app',
  'https://jeevansetu-healthcare-system-1.onrender.com',
];

const resolvedBase = import.meta.env.VITE_API_URL || '/api';

const isAllowed = ALLOWED_API_ORIGINS.some((origin) => resolvedBase.startsWith(origin));
if (!isAllowed) {
  throw new Error(`Blocked API base URL: "${resolvedBase}". Add it to ALLOWED_API_ORIGINS in api.js.`);
}

const api = axios.create({
  baseURL: resolvedBase,
  timeout: 10000,
  withCredentials: true, // sends the httpOnly refresh-token & csrf-token cookies
});

const getCsrfToken = () =>
  document.cookie.split('; ').find((c) => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

api.interceptors.request.use((config) => {
  const mutating = ['post', 'put', 'delete', 'patch'];
  if (mutating.includes(config.method)) {
    config.headers['x-csrf-token'] = getCsrfToken();
  }
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Silent-refresh on 401 ────────────────────────────────────────────────────
// If an access token expires mid-session, transparently exchange the httpOnly
// refresh cookie for a new one and retry the original request exactly once.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${resolvedBase}/auth/refresh`, {}, { withCredentials: true })
            .finally(() => { refreshPromise = null; });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error(`Invalid resource id: "${id}"`);
  return s;
};

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  refresh:  ()     => axios.post(`${resolvedBase}/auth/refresh`, {}, { withCredentials: true }),
  me:       ()     => api.get('/auth/me'),
};

export const opdService = {
  getAll:  (hospitalId) => api.get('/opd', { params: { hospitalId } }),
  getById: (id)         => api.get(`/opd/${safeId(id)}`),
  create:  (data)       => api.post('/opd', data),
  update:  (id, data)   => api.put(`/opd/${safeId(id)}`, data),
  remove:  (id)         => api.delete(`/opd/${safeId(id)}`),
};

export const bedService = {
  getAll:  (hospitalId) => api.get('/beds', { params: { hospitalId } }),
  create:  (data)       => api.post('/beds', data),
  update:  (id, data)   => api.put(`/beds/${safeId(id)}`, data),
  remove:  (id)         => api.delete(`/beds/${safeId(id)}`),
};

export const doctorService = {
  getAll:  (params)     => api.get('/doctors', { params }),
  create:  (data)       => api.post('/doctors', data),
  update:  (id, data)   => api.put(`/doctors/${safeId(id)}`, data),
  remove:  (id)         => api.delete(`/doctors/${safeId(id)}`),
};

export const inventoryService = {
  getAll:  (hospitalId) => api.get('/inventory', { params: { hospitalId } }),
  create:  (data)       => api.post('/inventory', data),
  update:  (id, data)   => api.put(`/inventory/${safeId(id)}`, data),
  remove:  (id)         => api.delete(`/inventory/${safeId(id)}`),
};

export const dashboardService = {
  get:     (hospitalId)         => api.get(`/dashboard/${safeId(hospitalId)}`),
  history: (hospitalId, hours)  => api.get(`/dashboard/${safeId(hospitalId)}/history`, { params: { hours } }),
};

export const cityService = {
  // Accepts { city } (by name, used by admin/doctor/staff via the city selector)
  // or { cityId } (used by city_admin accounts, whose scope is a city id, not a name).
  // Keeping these as two distinct named params — instead of collapsing them into
  // one positional argument — is what fixes city_admin's "No hospitals found":
  // the old single-argument version always sent the value as ?city=, so a
  // cityId like "city1" was compared against the Hospital.city name field and
  // never matched.
  get: ({ city, cityId } = {}) => api.get('/city', { params: { city, cityId } }),
};

export const hospitalService = {
  getAll: () => api.get('/hospitals'),
};

export const admissionService = {
  evaluate: (params)      => api.get('/admissions/evaluate', { params }),
  decide:   (data)        => api.post('/admissions', data),
  history:  (hospitalId)  => api.get('/admissions', { params: { hospitalId } }),
};

export const forecastService = {
  get: (hospitalId, hours) => api.get(`/forecast/${safeId(hospitalId)}`, { params: { hours } }),
};

export const auditService = {
  getAll: (params) => api.get('/audit', { params }),
};

export default api;
