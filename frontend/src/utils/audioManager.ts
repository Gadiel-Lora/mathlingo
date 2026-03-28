class AudioManager {
  private audioContext: AudioContext | null = null;
  
  private getContext() {
    if (!this.audioContext && typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  // Synthesizing accurate retro/modern UI sounds so we don't rely on local missing mp3 files.
  playSound(type: 'correct' | 'incorrect' | 'achievement' | 'hint' | 'click' | 'notification', volume: number = 0.5) {
    const ctx = this.getContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    const now = ctx.currentTime

    switch(type) {
      case 'correct':
        // Ding melodioso
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523.25, now) // C5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1) // A5
        gainNode.gain.setValueAtTime(volume, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
        break;
      case 'incorrect':
        // Buzzer
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, now)
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2)
        gainNode.gain.setValueAtTime(volume * 0.5, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
        break;
      case 'achievement':
        // Fanfarria
        osc.type = 'square'
        osc.frequency.setValueAtTime(440, now) // A4
        setTimeout(() => {
          if (ctx.state === 'running') {
            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.type = 'square'
            osc2.frequency.setValueAtTime(554.37, ctx.currentTime) // C#5
            osc2.connect(gain2)
            gain2.connect(ctx.destination)
            gain2.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
            osc2.start(ctx.currentTime)
            osc2.stop(ctx.currentTime + 0.5)
          }
        }, 150)
        gainNode.gain.setValueAtTime(volume * 0.5, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
        break;
      case 'hint':
        // Campanilla
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now) // A5
        gainNode.gain.setValueAtTime(volume * 0.3, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.2)
        break;
      case 'click':
        // Pop suave
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, now)
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05)
        gainNode.gain.setValueAtTime(volume * 0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
        osc.start(now)
        osc.stop(now + 0.05)
        break;
      case 'notification':
        // Tono doble
        osc.type = 'sine'
        osc.frequency.setValueAtTime(659.25, now) // E5
        setTimeout(() => {
           if (ctx.state === 'running') {
             const osc2 = ctx.createOscillator()
             const gain2 = ctx.createGain()
             osc2.connect(gain2)
             gain2.connect(ctx.destination)
             osc2.frequency.setValueAtTime(880, ctx.currentTime)
             gain2.gain.setValueAtTime(volume * 0.4, ctx.currentTime)
             gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
             osc2.start(ctx.currentTime)
             osc2.stop(ctx.currentTime + 0.3)
           }
        }, 150)
        gainNode.gain.setValueAtTime(volume * 0.4, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.2)
        break;
    }
  }
}

export const audioManager = new AudioManager()
