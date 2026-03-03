import { useEffect, useRef, useState } from 'react'

const supportsReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const previousRef = useRef(0)

  useEffect(() => {
    const next = Number(target || 0)
    if (!Number.isFinite(next)) return

    if (supportsReducedMotion()) {
      previousRef.current = next
      setValue(next)
      return
    }

    const from = Number(previousRef.current || 0)
    const delta = next - from

    if (delta === 0) {
      setValue(next)
      return
    }

    const startedAt = performance.now()
    const safeDuration = Math.max(180, Number(duration || 700))

    const tick = (timestamp) => {
      const elapsed = timestamp - startedAt
      const progress = Math.min(1, elapsed / safeDuration)
      const eased = 1 - (1 - progress) ** 3
      setValue(from + delta * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        previousRef.current = next
        setValue(next)
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [duration, target])

  return Math.round(value)
}
