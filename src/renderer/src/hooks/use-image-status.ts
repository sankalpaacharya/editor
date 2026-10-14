import { useSyncExternalStore } from 'react'

type Status = 'loading' | 'loaded' | 'failed'

const statuses = new Map<string, Status>()
const listeners = new Set<() => void>()

function load(url: string) {
  statuses.set(url, 'loading')
  const image = new Image()
  const settle = (status: Status) => {
    statuses.set(url, status)
    for (const listener of listeners) listener()
  }
  image.onload = () => settle('loaded')
  image.onerror = () => settle('failed')
  image.src = url
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Whether an image URL loads. Results are shared, so each URL is requested once. */
export function useImageStatus(url: string | null): Status {
  return useSyncExternalStore(subscribe, () => {
    if (url === null) return 'failed'
    if (!statuses.has(url)) load(url)
    return statuses.get(url) ?? 'loading'
  })
}
