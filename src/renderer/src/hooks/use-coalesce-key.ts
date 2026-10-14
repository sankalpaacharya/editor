import { useRef } from 'react'

/**
 * A history coalesce key that stays the same until `end` is called, so every change made
 * during one slider drag or one typing session becomes a single undo step.
 */
export function useCoalesceKey() {
  const key = useRef<string | null>(null)
  return {
    get: () => (key.current ??= crypto.randomUUID()),
    end: () => {
      key.current = null
    }
  }
}
