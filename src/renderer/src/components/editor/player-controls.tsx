import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  VolumeHighIcon,
  VolumeMute02Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { MasterVolume } from '@/components/editor/editor'
import { IconButton } from '@/components/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import { formatClock } from '@/lib/format'

interface PlayerControlsProps {
  playing: boolean
  playhead: number
  duration: number
  onToggle: () => void
  onSeek: (time: number) => void
  master: MasterVolume
  onMasterChange: (master: MasterVolume) => void
}

export function PlayerControls({
  playing,
  playhead,
  duration,
  onToggle,
  onSeek,
  master,
  onMasterChange
}: PlayerControlsProps) {
  const empty = duration === 0
  const audible = !master.muted && master.level > 0
  return (
    <div className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-1">
      <div className="text-xs tabular-nums">
        <span>{formatClock(playhead)}</span>
        <span className="text-muted-foreground"> / {formatClock(duration)}</span>
      </div>

      <div className="flex items-center gap-1">
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
              className="flex size-9 items-center justify-center rounded-full bg-brand text-brand-foreground transition-[filter,transform] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-40"
            >
              <HugeiconsIcon
                icon={playing ? PauseIcon : PlayIcon}
                strokeWidth={2}
                className="size-4 fill-current"
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
      </div>

      <div className="flex items-center justify-end gap-1">
        <IconButton
          icon={audible ? VolumeHighIcon : VolumeMute02Icon}
          label={master.muted ? 'Unmute preview' : 'Mute preview'}
          aria-pressed={master.muted}
          onClick={() => onMasterChange({ ...master, muted: !master.muted })}
        />
        <Slider
          aria-label="Preview volume"
          value={[master.muted ? 0 : master.level * 100]}
          max={100}
          step={1}
          onValueChange={([percent]) => onMasterChange({ level: percent / 100, muted: false })}
          className="w-20"
        />
      </div>
    </div>
  )
}
