import {
  Delete02Icon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  RedoIcon,
  ScissorIcon,
  SearchAddIcon,
  SearchMinusIcon,
  UndoIcon,
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

interface ToolbarProps {
  playing: boolean
  playhead: number
  duration: number
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDelete: () => void
  onToggle: () => void
  onSeek: (time: number) => void
  master: MasterVolume
  onMasterChange: (master: MasterVolume) => void
  zoom: number
  onZoom: (zoom: number) => void
}

const ZOOM_STEP = 0.1

export function Toolbar(props: ToolbarProps) {
  const { playing, playhead, duration, master, onMasterChange, zoom, onZoom } = props
  const empty = duration === 0
  const audible = !master.muted && master.level > 0
  return (
    <div className="m-2 mb-1 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center rounded-xl bg-muted px-2">
      <div className="flex items-center gap-0.5">
        <IconButton
          icon={UndoIcon}
          label="Undo"
          shortcut={SHORTCUTS.undo}
          disabled={!props.canUndo}
          onClick={props.onUndo}
        />
        <IconButton
          icon={RedoIcon}
          label="Redo"
          shortcut={SHORTCUTS.redo}
          disabled={!props.canRedo}
          onClick={props.onRedo}
        />
        <div className="mx-1.5 h-4 w-px bg-border" />
        <IconButton
          icon={ScissorIcon}
          label="Split at playhead"
          shortcut={SHORTCUTS.split}
          disabled={empty}
          onClick={props.onSplit}
        />
        <IconButton
          icon={Delete02Icon}
          label="Delete"
          shortcut={SHORTCUTS.delete}
          disabled={!props.canDelete}
          onClick={props.onDelete}
        />
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          icon={PreviousIcon}
          label="Go to start"
          shortcut={SHORTCUTS.start}
          disabled={empty}
          onClick={() => props.onSeek(0)}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              disabled={empty}
              onClick={props.onToggle}
              className="flex size-9 items-center justify-center rounded-full bg-brand text-brand-foreground transition-[filter] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-40"
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
          onClick={() => props.onSeek(duration)}
        />
        <div className="ml-2 w-[136px] text-xs tabular-nums">
          <span>{formatClock(playhead)}</span>
          <span className="text-muted-foreground"> / {formatClock(duration)}</span>
        </div>
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
          className="w-16 [&_[data-slot=slider-thumb]]:size-3"
        />
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <IconButton
          icon={SearchMinusIcon}
          label="Zoom out"
          onClick={() => onZoom(Math.max(zoom - ZOOM_STEP, 0))}
        />
        <Slider
          aria-label="Zoom"
          value={[zoom * 100]}
          max={100}
          step={1}
          onValueChange={([value]) => onZoom(value / 100)}
          className="w-24 [&_[data-slot=slider-thumb]]:size-3"
        />
        <IconButton
          icon={SearchAddIcon}
          label="Zoom in"
          onClick={() => onZoom(Math.min(zoom + ZOOM_STEP, 1))}
        />
      </div>
    </div>
  )
}
