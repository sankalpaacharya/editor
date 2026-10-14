import {
  FullScreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeMute02Icon
} from '@hugeicons/core-free-icons'
import { Slider } from '@/components/ui/slider'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconButton } from '@/components/ui/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import type { Format } from '../../../../shared/sequence'
import { formatClock } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const RATIOS = [
  [16, 9],
  [9, 16],
  [1, 1],
  [4, 5],
  [4, 3]
]

function ratioLabel({ width, height }: Format): string {
  const ratio = width / height
  const known = RATIOS.find(([w, h]) => Math.abs(w / h - ratio) < 0.02)
  return known ? `${known[0]}:${known[1]}` : `${width}×${height}`
}

export interface PreviewVolume {
  level: number
  muted: boolean
}

interface PlayerControlsProps {
  playing: boolean
  playhead: number
  duration: number
  format: Format
  onToggle: () => void
  onAspect: (width: number, height: number) => void
  volume: PreviewVolume
  onVolume: (volume: PreviewVolume) => void
}

export function PlayerControls({
  playing,
  playhead,
  duration,
  format,
  onToggle,
  onAspect,
  volume,
  onVolume
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
        <IconButton
          icon={volume.muted || volume.level === 0 ? VolumeMute02Icon : VolumeHighIcon}
          label={volume.muted ? 'Unmute preview' : 'Mute preview'}
          aria-pressed={volume.muted}
          onClick={() => onVolume({ ...volume, muted: !volume.muted })}
        />
        <Slider
          aria-label="Preview volume"
          value={[volume.muted ? 0 : volume.level * 100]}
          max={100}
          step={1}
          onValueChange={([percent]) => onVolume({ level: percent / 100, muted: false })}
          className="mr-2 w-20"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Aspect ratio"
              className="rounded-sm outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Badge variant="outline">{ratioLabel(format)}</Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-28">
            {RATIOS.map(([width, height]) => (
              <DropdownMenuItem key={`${width}:${height}`} onSelect={() => onAspect(width, height)}>
                <span
                  className="mr-1 inline-block rounded-xs border border-current"
                  style={{
                    width: (width / Math.max(width, height)) * 14,
                    height: (height / Math.max(width, height)) * 14
                  }}
                />
                {width}:{height}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
