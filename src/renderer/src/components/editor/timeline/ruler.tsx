import type { PointerEvent } from 'react'
import { RULER_HEIGHT, tickLabel, tickStep } from '@/components/editor/timeline/geometry'

const MINOR_TICKS = 5

interface RulerProps {
  pixelsPerSecond: number
  width: number
  onScrub: (event: PointerEvent<HTMLElement>) => void
}

export function Ruler({ pixelsPerSecond, width, onScrub }: RulerProps) {
  const step = tickStep(pixelsPerSecond)
  const spacing = step * pixelsPerSecond
  const count = Math.floor(width / spacing) + 1
  return (
    <div
      onPointerDown={onScrub}
      className="relative cursor-ew-resize overflow-hidden text-[10px] text-muted-foreground tabular-nums"
      style={{
        height: RULER_HEIGHT,
        width,
        backgroundImage:
          'radial-gradient(circle, color-mix(in oklch, var(--foreground) 28%, transparent) 1px, transparent 1.5px)',
        backgroundSize: `${spacing / MINOR_TICKS}px ${RULER_HEIGHT}px`,
        backgroundPosition: `${-spacing / MINOR_TICKS / 2}px 0`,
        backgroundRepeat: 'repeat-x'
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 bg-card px-1 leading-none"
          style={{ left: i * spacing - (i === 0 ? 0 : 4) }}
        >
          {tickLabel(i * step, step)}
        </span>
      ))}
    </div>
  )
}
