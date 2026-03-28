import { create } from 'zustand'

interface AppState {
  currentScene: string
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  setCurrentScene: (scene: string) => void
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScene: '未知',
  connectionStatus: 'disconnected',
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}))
