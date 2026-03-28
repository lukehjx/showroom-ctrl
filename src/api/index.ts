import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://36.134.146.69:8200'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('API Error:', err)
    return Promise.reject(err)
  }
)

// --- Monitor ---
export const getStatus = () => api.get('/api/status')
export const getLogs = (params?: { page?: number; limit?: number }) => api.get('/api/logs', { params })
export const openHall = () => api.post('/api/hall/open')
export const closeHall = () => api.post('/api/hall/close')
export const switchScene = (sceneId: string) => api.post('/api/scene/switch', { sceneId })
export const resetAll = () => api.post('/api/reset')
export const getFlowProgress = () => api.get('/api/flow/progress')
export const getDevicesStatus = () => api.get('/api/devices/status')
export const getCurrentReport = () => api.get('/api/reports/current')

// --- Routes / Flows ---
export const getFlows = () => api.get('/api/flows')
export const getFlow = (id: string) => api.get(`/api/flows/${id}`)
export const createFlow = (data: object) => api.post('/api/flows', data)
export const updateFlow = (id: string, data: object) => api.put(`/api/flows/${id}`, data)
export const deleteFlow = (id: string) => api.delete(`/api/flows/${id}`)
export const executeFlow = (id: string) => api.post(`/api/flows/${id}/execute`)
export const toggleFlow = (id: string, enabled: boolean) => api.patch(`/api/flows/${id}`, { enabled })

// --- Exhibits ---
export const getExhibits = () => api.get('/api/exhibits')
export const getExhibit = (id: string) => api.get(`/api/exhibits/${id}`)
export const createExhibit = (data: object) => api.post('/api/exhibits', data)
export const updateExhibit = (id: string, data: object) => api.put(`/api/exhibits/${id}`, data)
export const deleteExhibit = (id: string) => api.delete(`/api/exhibits/${id}`)
export const getExhibitQRCode = (id: string) => api.get(`/api/qrcode/${id}`)

// --- Terminals ---
export const getTerminals = () => api.get('/api/terminals')
export const getTerminalResources = (id: string) => api.get(`/api/terminals/${id}/resources`)
export const pushResource = (terminalId: string, resourceId: string, sceneId: string) =>
  api.post('/api/push', { terminalId, resourceId, sceneId })

// --- Cloud Resources ---
export const getCloudResources = () => api.get('/api/cloud_resources')

// --- Sync ---
export const getSyncStatus = () => api.get('/api/sync/status')
export const syncAll = () => api.post('/api/sync/all')
export const syncType = (type: string) => api.post(`/api/sync/${type}`)
export const getSyncLogs = () => api.get('/api/sync/logs')

// --- Nav Positions ---
export const getNavPositions = () => api.get('/api/nav_positions')
export const saveNavPositions = (data: object) => api.post('/api/nav_positions', data)
export const getRobotPOIs = () => api.get('/api/robot/pois')

// --- Commands ---
export const getCommands = () => api.get('/api/commands')
export const getScenes = () => api.get('/api/scenes')

// --- Config ---
export const getConfig = () => api.get('/api/config')
export const saveConfig = (data: object) => api.put('/api/config', data)

// --- Logs ---
export const getOperationLogs = (params?: { page?: number; pageSize?: number; keyword?: string }) =>
  api.get('/api/operation_logs', { params })

// --- Presets ---
export const getPresets = () => api.get('/api/presets')
export const getPreset = (id: string) => api.get(`/api/presets/${id}`)
export const createPreset = (data: object) => api.post('/api/presets', data)
export const updatePreset = (id: string, data: object) => api.put(`/api/presets/${id}`, data)
export const deletePreset = (id: string) => api.delete(`/api/presets/${id}`)
export const triggerPreset = (id: string) => api.post(`/api/presets/${id}/trigger`)
export const getPresetStatus = (id: string) => api.get(`/api/presets/${id}/status`)

// --- Schedules ---
export const getSchedules = () => api.get('/api/schedules')
export const createSchedule = (data: object) => api.post('/api/schedules', data)
export const updateSchedule = (id: string, data: object) => api.put(`/api/schedules/${id}`, data)
export const deleteSchedule = (id: string) => api.delete(`/api/schedules/${id}`)
export const toggleSchedule = (id: string, enabled: boolean) => api.patch(`/api/schedules/${id}`, { enabled })

// --- Reports ---
export const getReports = (params?: { page?: number; pageSize?: number }) =>
  api.get('/api/reports', { params })
export const getReport = (id: string) => api.get(`/api/reports/${id}`)

export default api
