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
          'linear-gradient(to right, color-mix(in oklch, var(--foreground) 18%, transparent) 1px, transparent 1px)',
        backgroundSize: `${spacing / MINOR_TICKS}px 4px`,
        backgroundPosition: '0 100%',
        backgroundRepeat: 'repeat-x'
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="absolute bottom-0 h-2.5 border-l border-foreground/30"
          style={{ left: i * spacing }}
        >
          <span className="absolute bottom-2 left-1 leading-none">{tickLabel(i * step, step)}</span>
        </div>
      ))}
    </div>
  )
}
