import {
  Copy01Icon,
  Delete02Icon,
  LayoutAlignLeftIcon,
  LayoutAlignRightIcon,
  Magnet01Icon,
  RedoIcon,
  ScissorIcon,
  SearchAddIcon,
  SearchMinusIcon,
  UndoIcon
} from '@hugeicons/core-free-icons'
import { Slider } from '@/components/ui/slider'
import { IconButton } from '@/components/ui/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
  canEdit: boolean
  canDuplicate: boolean
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onTrimLeft: () => void
  onTrimRight: () => void
  onDuplicate: () => void
  onDelete: () => void
  zoom: number
  onZoom: (zoom: number) => void
  snapping: boolean
  onSnapping: (snapping: boolean) => void
}

const ZOOM_STEP = 0.1

const Divider = () => <div className="mx-1.5 h-4 w-px bg-border" />

export function Toolbar(props: ToolbarProps) {
  const { zoom, onZoom } = props
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-2">
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
        <Divider />
        <IconButton
          icon={ScissorIcon}
          label="Split at playhead"
          shortcut={SHORTCUTS.split}
          disabled={!props.canEdit}
          onClick={props.onSplit}
        />
        <IconButton
          icon={LayoutAlignLeftIcon}
          label="Delete left of playhead"
          shortcut={SHORTCUTS.trimLeft}
          disabled={!props.canEdit}
          onClick={props.onTrimLeft}
        />
        <IconButton
          icon={LayoutAlignRightIcon}
          label="Delete right of playhead"
          shortcut={SHORTCUTS.trimRight}
          disabled={!props.canEdit}
          onClick={props.onTrimRight}
        />
        <IconButton
          icon={Copy01Icon}
          label="Duplicate"
          shortcut={SHORTCUTS.duplicate}
          disabled={!props.canDuplicate}
          onClick={props.onDuplicate}
        />
        <IconButton
          icon={Delete02Icon}
          label="Delete"
          shortcut={SHORTCUTS.delete}
          disabled={!props.canDelete}
          onClick={props.onDelete}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton
          icon={Magnet01Icon}
          label={props.snapping ? 'Snapping on' : 'Snapping off'}
          shortcut={SHORTCUTS.snap}
          aria-pressed={props.snapping}
          className={cn(props.snapping && 'text-brand hover:text-brand')}
          onClick={() => props.onSnapping(!props.snapping)}
        />
        <Divider />
        <IconButton
          icon={SearchMinusIcon}
          label="Zoom out"
          shortcut={SHORTCUTS.zoomOut}
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
          shortcut={SHORTCUTS.zoomIn}
          onClick={() => onZoom(Math.min(zoom + ZOOM_STEP, 1))}
        />
      </div>
    </div>
  )
}
