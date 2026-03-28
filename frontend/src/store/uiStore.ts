import { create } from 'zustand'

interface UIState {
  xpGainInfo: { xp: number; id: number } | null
  showXpGain: (xp: number) => void
}

let xpSequenceId = 0

export const useUIStore = create<UIState>((set) => ({
  xpGainInfo: null,
  showXpGain: (xp: number) => {
    xpSequenceId++
    const currentId = xpSequenceId
    set({ xpGainInfo: { xp, id: currentId } })
    
    setTimeout(() => {
      set((state) => {
        if (state.xpGainInfo?.id === currentId) {
          return { xpGainInfo: null }
        }
        return state
      })
    }, 2000)
  }
}))
