import { useRef } from 'react'

export function useCoalesceKey() {
  const key = useRef<string | null>(null)
  return {
    get: () => (key.current ??= crypto.randomUUID()),
    end: () => {
      key.current = null
    }
  }
}
