import { FullScreenIcon, PauseIcon, PlayIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconButton } from '@/components/ui/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import type { Format } from '../../../../shared/sequence'
import { formatClock } from '@/lib/format'
import { Badge } from '@/components/ui/badge'

const RATIOS = [
  [16, 9],
  [9, 16],
  [1, 1],
  [4, 3],
  [3, 4],
  [4, 5],
  [21, 9]
]

function ratioLabel({ width, height }: Format): string {
  const ratio = width / height
  const known = RATIOS.find(([w, h]) => Math.abs(w / h - ratio) < 0.02)
  return known ? `${known[0]}:${known[1]}` : `${width}×${height}`
}

interface PlayerControlsProps {
  playing: boolean
  playhead: number
  duration: number
  format: Format
  onToggle: () => void
}

export function PlayerControls({
  playing,
  playhead,
  duration,
  format,
  onToggle
}: PlayerControlsProps) {
  return (
    <div className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3">
      <span className="text-xs tabular-nums">
        <span className="text-brand">{formatClock(playhead)}</span>
        <span className="text-muted-foreground"> / {formatClock(duration)}</span>
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={duration === 0}
            onClick={onToggle}
            className="flex size-9 items-center justify-center rounded-full text-foreground transition-[background-color,transform] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-40"
          >
            <HugeiconsIcon
              icon={playing ? PauseIcon : PlayIcon}
              strokeWidth={2}
              className="size-5 fill-current"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-md px-2 py-1">
          {playing ? 'Pause' : 'Play'}
          <kbd className="font-sans text-background/60">{SHORTCUTS.play}</kbd>
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center justify-self-end gap-1">
        <Badge variant="outline">{ratioLabel(format)}</Badge>
        <IconButton
          icon={FullScreenIcon}
          label="Full screen"
          onClick={(event) =>
            void event.currentTarget
              .closest('section')
              ?.querySelector<HTMLElement>('[data-player-stage]')
              ?.requestFullscreen()
          }
        />
      </div>
    </div>
  )
}
