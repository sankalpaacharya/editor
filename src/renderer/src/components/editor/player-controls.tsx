import {
  Backward01Icon,
  Forward01Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconButton } from '@/components/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import { formatClock } from '@/lib/format'

const NUDGE_SECONDS = 5

interface PlayerControlsProps {
  playing: boolean
  playhead: number
  duration: number
  fps: number
  onToggle: () => void
  onSeek: (time: number) => void
}

export function PlayerControls({
  playing,
  playhead,
  duration,
  fps,
  onToggle,
  onSeek
}: PlayerControlsProps) {
  const empty = duration === 0
  return (
    <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t px-3">
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.round(playhead * fps)}/{Math.round(duration * fps)}
      </span>

      <div className="flex items-center gap-1">
        <IconButton
          icon={Backward01Icon}
          label="Back 5 seconds"
          disabled={empty}
          onClick={() => onSeek(Math.max(playhead - NUDGE_SECONDS, 0))}
        />
        <IconButton
          icon={PreviousIcon}
          label="Go to start"
          shortcut={SHORTCUTS.start}
          disabled={empty}
          onClick={() => onSeek(0)}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              disabled={empty}
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
        <IconButton
          icon={NextIcon}
          label="Go to end"
          shortcut={SHORTCUTS.end}
          disabled={empty}
          onClick={() => onSeek(duration)}
        />
        <IconButton
          icon={Forward01Icon}
          label="Forward 5 seconds"
          disabled={empty}
          onClick={() => onSeek(Math.min(playhead + NUDGE_SECONDS, duration))}
        />
      </div>

      <span className="justify-self-end text-xs tabular-nums">
        {formatClock(playhead)}
        <span className="text-muted-foreground"> / {formatClock(duration)}</span>
      </span>
    </div>
  )
}
