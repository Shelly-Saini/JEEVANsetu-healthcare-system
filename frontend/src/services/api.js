import axios from 'axios';

const ALLOWED_API_ORIGINS = [
  'http://localhost:5000',
  'https://jeevansetu-api.onrender.com',   // update when deployed
];

const resolvedBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const isAllowed = ALLOWED_API_ORIGINS.some((origin) =>
  resolvedBase.startsWith(origin)
);

if (!isAllowed) {
  throw new Error(`Blocked API base URL: "${resolvedBase}". Add it to ALLOWED_API_ORIGINS in api.js.`);
}

const api = axios.create({
  baseURL: resolvedBase,
  timeout: 10000,
  withCredentials: true,   // send/receive cookies cross-origin
});

// Read csrf-token cookie and attach as header on every mutating request
const getCsrfToken = () =>
  document.cookie.split('; ').find((c) => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

api.interceptors.request.use((config) => {
  const mutating = ['post', 'put', 'delete', 'patch'];
  if (mutating.includes(config.method)) {
    config.headers['x-csrf-token'] = getCsrfToken();
  }
  return config;
});

const safeId = (id) => {
  const s = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!s) throw new Error(`Invalid resource id: "${id}"`);
  return s;
};

export const opdService = {
  getAll:  (hospitalId) => api.get('/opd', { params: { hospitalId } }),
  getById: (id)         => { const cleanId = safeId(id); const url = '/opd/' + cleanId;       return api.get(url);       },
  create:  (data)       => api.post('/opd', data),
  update:  (id, data)   => { const cleanId = safeId(id); const url = '/opd/' + cleanId;       return api.put(url, data); },
  remove:  (id)         => { const cleanId = safeId(id); const url = '/opd/' + cleanId;       return api.delete(url);    },
};

export const bedService = {
  getAll:  (hospitalId) => api.get('/beds', { params: { hospitalId } }),
  update:  (id, data)   => { const cleanId = safeId(id); const url = '/beds/' + cleanId;      return api.put(url, data); },
};

export const doctorService = {
  getAll:  (params)     => api.get('/doctors', { params }),
  update:  (id, data)   => { const cleanId = safeId(id); const url = '/doctors/' + cleanId;   return api.put(url, data); },
};

export const inventoryService = {
  getAll:  (hospitalId) => api.get('/inventory', { params: { hospitalId } }),
  update:  (id, data)   => { const cleanId = safeId(id); const url = '/inventory/' + cleanId; return api.put(url, data); },
};

export const dashboardService = {
  get: (hospitalId) => {
    const cleanId = safeId(hospitalId);
    const url = '/dashboard/' + cleanId;
    return api.get(url);
  },
};

export const cityService = {
  get: (city) => api.get('/city', { params: { city } }),
};

export default api;
