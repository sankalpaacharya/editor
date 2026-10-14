import type { PointerEvent } from 'react'
import { Image01Icon, TextIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Edit } from '@/components/editor/editor'
import { overlayLayout, overlayTop } from '@/components/editor/timeline/geometry'
import type { MediaId, MediaItem, Overlay } from '../../../../../shared/sequence'
import { MIN_CLIP_LENGTH } from '../../../../../shared/sequence'
import { clamp } from '@/lib/format'
import { trackPointer } from '@/lib/pointer'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

interface OverlayRowProps {
  overlays: readonly Overlay[]
  mediaById: ReadonlyMap<MediaId, MediaItem>
  pixelsPerSecond: number
  duration: number
  selection: Selection
  onSelect: (selection: Selection) => void
  onSeek: (clientX: number) => void
  edit: Edit
}

type DragMode = 'move' | 'start' | 'end'

export function OverlayRow({
  overlays,
  mediaById,
  pixelsPerSecond: pps,
  duration,
  selection,
  onSelect,
  onSeek,
  edit
}: OverlayRowProps) {
  const layout = overlayLayout(overlays)

  function press(event: PointerEvent<HTMLElement>, overlay: Overlay, mode: DragMode) {
    event.stopPropagation()
    onSelect({ kind: 'overlay', id: overlay.id })
    const coalesce = crypto.randomUUID()
    const length = overlay.end - overlay.start
    let moved = false
    trackPointer(
      event,
      (_move, dx) => {
        moved ||= dx !== 0
        const delta = dx / pps
        let { start, end } = overlay
        if (mode === 'move') {
          start = clamp(overlay.start + delta, 0, Math.max(duration - length, 0))
          end = start + length
        } else if (mode === 'start') {
          start = clamp(overlay.start + delta, 0, overlay.end - MIN_CLIP_LENGTH)
        } else {
          end = clamp(overlay.end + delta, overlay.start + MIN_CLIP_LENGTH, duration)
        }
        edit({ type: 'updateOverlay', overlay: { ...overlay, start, end } }, coalesce)
      },
      (end) => {
        if (!moved && mode === 'move') onSeek(end.clientX)
      }
    )
  }

  return (
    <div className="relative rounded-md bg-white/[0.02]" style={{ height: layout.rowHeight }}>
      {overlays.map((overlay) => {
        const selected = selection?.id === overlay.id
        const label =
          overlay.kind === 'text' ? overlay.text : (mediaById.get(overlay.mediaId)?.name ?? 'Image')
        return (
          <div
            key={overlay.id}
            data-overlay-id={overlay.id}
            onPointerDown={(event) => press(event, overlay, 'move')}
            className={cn(
              'group absolute flex cursor-grab items-center gap-2 overflow-hidden rounded-md pr-2 pl-1 text-xs text-white ring-1 ring-white/20 ring-inset active:cursor-grabbing',
              overlay.kind === 'text' ? 'bg-track-text' : 'bg-track-image',
              selected && 'ring-2 ring-selection'
            )}
            style={{
              top: overlayTop(layout, overlay.id),
              height: layout.chipHeight,
              left: overlay.start * pps + 1,
              width: Math.max((overlay.end - overlay.start) * pps - 2, 6)
            }}
            title={label}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-black/25'
              )}
            >
              <HugeiconsIcon
                icon={overlay.kind === 'text' ? TextIcon : Image01Icon}
                strokeWidth={2}
                className="size-2.5"
              />
            </span>
            <span className="truncate">{label}</span>
            {(['start', 'end'] as const).map((edge) => (
              <div
                key={edge}
                onPointerDown={(event) => press(event, overlay, edge)}
                className={cn(
                  'absolute inset-y-0 w-1.5 cursor-ew-resize',
                  edge === 'start' ? 'left-0' : 'right-0',
                  selected && 'bg-brand/80'
                )}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
