import {
  Delete02Icon,
  RedoIcon,
  ScissorIcon,
  SearchAddIcon,
  SearchMinusIcon,
  UndoIcon
} from '@hugeicons/core-free-icons'
import { Slider } from '@/components/ui/slider'
import { IconButton } from '@/components/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'

interface ToolbarProps {
  duration: number
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDelete: () => void
  zoom: number
  onZoom: (zoom: number) => void
}

const ZOOM_STEP = 0.1

export function Toolbar(props: ToolbarProps) {
  const { duration, zoom, onZoom } = props
  const empty = duration === 0
  return (
    <div className="mx-2 mt-2 flex h-9 shrink-0 items-center justify-between rounded-lg bg-muted px-1.5">
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
          className="w-24"
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
