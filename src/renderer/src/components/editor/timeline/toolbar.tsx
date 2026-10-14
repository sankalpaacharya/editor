import type { ComponentProps } from 'react'
import {
  Delete02Icon,
  Magnet01Icon,
  RedoIcon,
  SearchAddIcon,
  SearchMinusIcon,
  UndoIcon
} from '@hugeicons/core-free-icons'
import { Slider } from '@/components/ui/slider'
import { IconButton } from '@/components/icon-button'
import { SHORTCUTS } from '@/hooks/use-editor-shortcuts'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  duration: number
  canUndo: boolean
  canRedo: boolean
  canDelete: boolean
  canDuplicate: boolean
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDuplicate: () => void
  onDelete: () => void
  zoom: number
  onZoom: (zoom: number) => void
  snapping: boolean
  onSnapping: (snapping: boolean) => void
}

const ZOOM_STEP = 0.1

function TextAction(props: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="rounded-md px-2.5 py-1.5 text-sm text-foreground/90 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
      {...props}
    />
  )
}

export function Toolbar(props: ToolbarProps) {
  const { zoom, onZoom } = props
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-t px-2">
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
        <IconButton
          icon={Delete02Icon}
          label="Delete"
          shortcut={SHORTCUTS.delete}
          disabled={!props.canDelete}
          onClick={props.onDelete}
        />
        <div className="mx-2 h-4 w-px bg-border" />
        <IconButton
          icon={Magnet01Icon}
          label={props.snapping ? 'Snapping on' : 'Snapping off'}
          shortcut={SHORTCUTS.snap}
          aria-pressed={props.snapping}
          className={cn(props.snapping && 'text-brand hover:text-brand')}
          onClick={() => props.onSnapping(!props.snapping)}
        />
        <div className="mx-2 h-4 w-px bg-border" />
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
          className="w-20"
        />
        <IconButton
          icon={SearchAddIcon}
          label="Zoom in"
          shortcut={SHORTCUTS.zoomIn}
          onClick={() => onZoom(Math.min(zoom + ZOOM_STEP, 1))}
        />
      </div>
      <div className="flex items-center gap-0.5">
        <TextAction
          disabled={props.duration === 0}
          onClick={props.onSplit}
          title={`Split (${SHORTCUTS.split})`}
        >
          Split
        </TextAction>
        <TextAction
          disabled={!props.canDuplicate}
          onClick={props.onDuplicate}
          title={`Duplicate (${SHORTCUTS.duplicate})`}
        >
          Duplicate
        </TextAction>
      </div>
    </div>
  )
}
