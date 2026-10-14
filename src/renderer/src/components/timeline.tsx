import { useState, type PointerEvent } from 'react'
import { Delete02Icon, Image01Icon, ScissorIcon, TextIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  clipLength,
  timelineDuration,
  type Clip,
  type Project,
  type ProjectAction
} from '../../../shared/project'
import { useElementSize } from '@/hooks/use-element-size'
import { formatTime, type Selection } from '@/lib/editor'
import { trackPointer } from '@/lib/pointer'

const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
const MIN_TICK_SPACING = 64
const DRAG_THRESHOLD = 3

interface TimelineProps {
  project: Project
  playhead: number
  duration: number
  selection: Selection
  onSelect: (selection: Selection) => void
  onSeek: (time: number) => void
  dispatch: (action: ProjectAction) => void
  onSplit: () => void
  onAddText: () => void
  onAddImage: () => void
  onDelete: () => void
}

export function Timeline({
  project,
  playhead,
  duration,
  selection,
  onSelect,
  onSeek,
  dispatch,
  onSplit,
  onAddText,
  onAddImage,
  onDelete
}: TimelineProps) {
  const [areaRef, { width }] = useElementSize<HTMLDivElement>()
  const [moving, setMoving] = useState<{ clipId: string; dx: number } | null>(null)
  const { clips, overlays } = project
  const pps = duration > 0 ? width / duration : 0
  const starts = clips.map((_, index) => timelineDuration(clips.slice(0, index)))
  const tickStep = TICK_STEPS.find((step) => step * pps >= MIN_TICK_SPACING) ?? 600
  const ticks = Array.from({ length: Math.floor(duration / tickStep) + 1 }, (_, i) => i * tickStep)

  function scrub(event: PointerEvent<HTMLDivElement>) {
    if (pps === 0) return
    const left = event.currentTarget.getBoundingClientRect().left
    onSeek((event.clientX - left) / pps)
    trackPointer(event, (move) => onSeek((move.clientX - left) / pps))
  }

  function pressClip(event: PointerEvent<HTMLDivElement>, clip: Clip, index: number) {
    event.stopPropagation()
    onSelect({ kind: 'clip', id: clip.id })
    let dragging = false
    trackPointer(
      event,
      (_move, dx) => {
        dragging ||= Math.abs(dx) > DRAG_THRESHOLD
        if (dragging) setMoving({ clipId: clip.id, dx })
      },
      (_end, dx) => {
        setMoving(null)
        if (!dragging) return
        const center = starts[index] + clipLength(clip) / 2 + dx / pps
        const toIndex = clips.filter(
          (other, i) => i !== index && starts[i] + clipLength(other) / 2 < center
        ).length
        if (toIndex !== index) dispatch({ type: 'moveClip', clipId: clip.id, toIndex })
      }
    )
  }

  function pressTrimHandle(event: PointerEvent<HTMLDivElement>, clip: Clip, edge: 'in' | 'out') {
    event.stopPropagation()
    trackPointer(event, (_move, dx) => {
      const delta = (dx / pps) * clip.speed
      dispatch({
        type: 'trim',
        clipId: clip.id,
        in: edge === 'in' ? clip.in + delta : clip.in,
        out: edge === 'out' ? clip.out + delta : clip.out
      })
    })
  }

  return (
    <section className="flex h-56 shrink-0 flex-col border-t">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b px-2">
        <ToolButton icon={ScissorIcon} label="Split" onClick={onSplit} />
        <ToolButton icon={TextIcon} label="Add text" onClick={onAddText} />
        <ToolButton icon={Image01Icon} label="Add image" onClick={onAddImage} />
        <ToolButton
          icon={Delete02Icon}
          label="Delete"
          onClick={onDelete}
          disabled={selection === null}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div ref={areaRef} className="relative overflow-x-clip" onPointerDown={scrub}>
          <div className="relative h-6 border-b text-[10px] text-muted-foreground tabular-nums">
            {ticks.map((time) => (
              <div
                key={time}
                className="absolute bottom-0 h-2 border-l border-foreground/20"
                style={{ left: time * pps }}
              >
                <span className="absolute bottom-2 left-1">{formatTime(time)}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-2 h-10">
            {clips.map((clip, index) => {
              const selected = selection?.kind === 'clip' && selection.id === clip.id
              const offset = moving?.clipId === clip.id ? moving.dx : 0
              return (
                <div
                  key={clip.id}
                  onPointerDown={(event) => pressClip(event, clip, index)}
                  className={cn(
                    'absolute inset-y-0 flex items-center overflow-hidden rounded-sm border border-foreground/10 bg-secondary text-[11px] text-secondary-foreground',
                    selected && 'border-foreground/60',
                    offset !== 0 && 'z-10 opacity-80'
                  )}
                  style={{
                    left: starts[index] * pps,
                    width: clipLength(clip) * pps,
                    transform: offset ? `translateX(${offset}px)` : undefined
                  }}
                >
                  <span className="truncate px-2 tabular-nums">
                    {formatTime(clip.in)}–{formatTime(clip.out)}
                    {clip.speed !== 1 && (
                      <span className="ml-1.5 text-muted-foreground">{clip.speed}x</span>
                    )}
                  </span>
                  {selected && (
                    <>
                      <div
                        onPointerDown={(event) => pressTrimHandle(event, clip, 'in')}
                        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-foreground/60"
                      />
                      <div
                        onPointerDown={(event) => pressTrimHandle(event, clip, 'out')}
                        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-foreground/60"
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {overlays.map((overlay) => {
            const selected = selection?.kind === 'overlay' && selection.id === overlay.id
            return (
              <div key={overlay.id} className="relative mt-1 h-5">
                <div
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onSelect({ kind: 'overlay', id: overlay.id })
                  }}
                  className={cn(
                    'absolute inset-y-0 flex items-center overflow-hidden rounded-sm border border-foreground/10 bg-muted text-[11px] text-muted-foreground',
                    selected && 'border-foreground/60 text-foreground'
                  )}
                  style={{
                    left: overlay.start * pps,
                    width: Math.max((overlay.end - overlay.start) * pps, 2)
                  }}
                >
                  <span className="truncate px-2">
                    {overlay.kind === 'text' ? overlay.text : overlay.image.name}
                  </span>
                </div>
              </div>
            )
          })}

          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground"
            style={{ left: playhead * pps }}
          />
        </div>
      </div>
    </section>
  )
}

interface ToolButtonProps {
  icon: IconSvgElement
  label: string
  onClick: () => void
  disabled?: boolean
}

function ToolButton({ icon, label, onClick, disabled }: ToolButtonProps) {
  return (
    <Button variant="ghost" size="xs" onClick={onClick} disabled={disabled}>
      <HugeiconsIcon icon={icon} strokeWidth={1.75} />
      {label}
    </Button>
  )
}
