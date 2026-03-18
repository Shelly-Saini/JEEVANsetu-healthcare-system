import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

export const opdService       = {
  getAll:   (hospitalId) => api.get('/opd', { params: { hospitalId } }),
  getById:  (id)         => api.get(`/opd/${id}`),
  create:   (data)       => api.post('/opd', data),
  update:   (id, data)   => api.put(`/opd/${id}`, data),
  remove:   (id)         => api.delete(`/opd/${id}`),
};

export const bedService       = {
  getAll:   (hospitalId) => api.get('/beds', { params: { hospitalId } }),
  update:   (id, data)   => api.put(`/beds/${id}`, data),
};

export const doctorService    = {
  getAll:   (params)     => api.get('/doctors', { params }),
  update:   (id, data)   => api.put(`/doctors/${id}`, data),
};

export const inventoryService = {
  getAll:   (hospitalId) => api.get('/inventory', { params: { hospitalId } }),
  update:   (id, data)   => api.put(`/inventory/${id}`, data),
};

export const dashboardService = {
  get:      (hospitalId) => api.get(`/dashboard/${hospitalId}`),
};

export const cityService      = {
  get:      ()           => api.get('/city'),
};

export default api;
