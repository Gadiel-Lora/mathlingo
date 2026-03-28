import confetti from 'canvas-confetti'
import { useAudioStore } from '../store/audioStore'

export const celebrateAchievement = () => {
  useAudioStore.getState().playSound('achievement')
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347', '#4CAF50', '#3B82F6'],
    disableForReducedMotion: true
  })
}
