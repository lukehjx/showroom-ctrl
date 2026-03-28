import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE || '';

const api = axios.create({ baseURL: BASE, timeout: 8000 });

api.interceptors.response.use(
  r => r.data,
  e => {
    console.error('API error', e);
    return { success: false, data: null, message: e.message };
  }
);

export default api;

export const getMonitorData = () => Promise.all([
  api.get('/api/current-scene').catch(() => ({ data: null })),
  api.get('/api/device-status').catch(() => ({ data: [] })),
  api.get('/api/robots').catch(() => ({ data: [] })),
  api.get('/api/presets').catch(() => ({ data: [] })),
  api.get('/api/logs?page=1&page_size=30').catch(() => ({ data: { items: [] } })),
]);

export const getPresets = () => api.get('/api/presets');
export const createPreset = (d: any) => api.post('/api/presets', d);
export const updatePreset = (id: number, d: any) => api.put(`/api/presets/${id}`, d);
export const deletePreset = (id: number) => api.delete(`/api/presets/${id}`);
export const triggerPreset = (id: number) => api.post(`/api/presets/${id}/trigger`);

export const getRoutes = () => api.get('/api/routes');
export const createRoute = (d: any) => api.post('/api/routes', d);
export const updateRoute = (id: number, d: any) => api.put(`/api/routes/${id}`, d);
export const deleteRoute = (id: number) => api.delete(`/api/routes/${id}`);
export const triggerRoute = (id: number) => api.post(`/api/routes/${id}/trigger`);
export const getRouteLanes = (id: number) => api.get(`/api/routes/${id}/lanes`);
export const getLaneSteps = (id: number) => api.get(`/api/lanes/${id}/steps`);

export const getRobots = () => api.get('/api/robots');
export const createRobot = (d: any) => api.post('/api/robots', d);
export const updateRobot = (id: number, d: any) => api.put(`/api/robots/${id}`, d);
export const deleteRobot = (id: number) => api.delete(`/api/robots/${id}`);

export const getLogs = (page = 1, size = 30) => api.get(`/api/logs?page=${page}&page_size=${size}`);
export const getDeviceStatus = () => api.get('/api/device-status');
export const refreshDeviceStatus = () => api.post('/api/device-status/refresh');
export const getCurrentScene = () => api.get('/api/current-scene');
