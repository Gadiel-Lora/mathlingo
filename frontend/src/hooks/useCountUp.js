import { useEffect, useRef, useState } from 'react'

const supportsReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const normalizeTarget = (value) => {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function useCountUp(target, duration = 700) {
  const initialValue = normalizeTarget(target)
  const [value, setValue] = useState(initialValue)
  const rafRef = useRef(null)
  const previousRef = useRef(initialValue)

  useEffect(() => {
    const next = normalizeTarget(target)
    const cancelScheduledFrame = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const commitValue = (nextValue) => {
      cancelScheduledFrame()
      rafRef.current = requestAnimationFrame(() => {
        previousRef.current = nextValue
        setValue(nextValue)
      })
    }

    if (supportsReducedMotion()) {
      commitValue(next)
      return cancelScheduledFrame
    }

    const from = Number(previousRef.current || 0)
    const delta = next - from

    if (delta === 0) {
      commitValue(next)
      return cancelScheduledFrame
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
        rafRef.current = null
        setValue(next)
      }
    }

    cancelScheduledFrame()
    rafRef.current = requestAnimationFrame(tick)

    return cancelScheduledFrame
  }, [duration, target])

  return Math.round(value)
}
