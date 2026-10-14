export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function formatTime(seconds: number): string {
  const tenths = Math.floor(seconds * 10 + 1e-6)
  const minutes = Math.floor(tenths / 600)
  const secs = Math.floor(tenths / 10) % 60
  return `${minutes}:${String(secs).padStart(2, '0')}.${tenths % 10}`
}

export function formatClock(seconds: number): string {
  const hundredths = Math.floor(seconds * 100 + 1e-6)
  const minutes = Math.floor(hundredths / 6000)
  const secs = Math.floor(hundredths / 100) % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(minutes)}:${pad(secs)}.${pad(hundredths % 100)}`
}

export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds)
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60]
]

export function formatAgo(iso: string, now = Date.now()): string {
  const elapsedSeconds = (now - new Date(iso).getTime()) / 1000
  for (const [unit, size] of UNITS) {
    if (elapsedSeconds >= size) return relative.format(-Math.floor(elapsedSeconds / size), unit)
  }
  return 'just now'
}

export const fileName = (path: string): string => path.split(/[\\/]/).pop() ?? path

// Errors thrown in the main process arrive as "Error invoking remote method '…': Error: <message>".
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '').split('\n')[0]
}
