import type { PointerEvent as ReactPointerEvent } from 'react'

export function trackPointer(
  event: ReactPointerEvent<HTMLElement>,
  onMove: (event: PointerEvent, dx: number, dy: number) => void,
  onEnd?: (event: PointerEvent, dx: number, dy: number) => void
): void {
  const target = event.currentTarget
  const { clientX, clientY, pointerId } = event
  target.setPointerCapture(pointerId)
  const move = (e: PointerEvent) => onMove(e, e.clientX - clientX, e.clientY - clientY)
  const end = (e: PointerEvent) => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', end)
    target.removeEventListener('pointercancel', end)
    onEnd?.(e, e.clientX - clientX, e.clientY - clientY)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', end)
  target.addEventListener('pointercancel', end)
}
