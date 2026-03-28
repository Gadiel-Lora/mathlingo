import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audioManager } from '../utils/audioManager'

interface AudioState {
  soundsEnabled: boolean
  volume: number
  toggleSounds: () => void
  setVolume: (v: number) => void
  playSound: (type: 'correct' | 'incorrect' | 'achievement' | 'hint' | 'click' | 'notification') => void
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      soundsEnabled: true,
      volume: 0.5,
      toggleSounds: () => set((s) => ({ soundsEnabled: !s.soundsEnabled })),
      setVolume: (volume) => set({ volume }),
      playSound: (type) => {
        const { soundsEnabled, volume } = get()
        if (soundsEnabled) {
          audioManager.playSound(type, volume)
        }
      }
    }),
    {
      name: 'audio-preferences-storage'
    }
  )
)
