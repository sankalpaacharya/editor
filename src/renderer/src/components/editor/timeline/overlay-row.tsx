import type { PointerEvent } from 'react'
import { Image01Icon, TextIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Edit } from '@/components/editor/editor'
import {
  OVERLAY_LANE_HEIGHT,
  overlayLanes,
  overlayRowHeight
} from '@/components/editor/timeline/geometry'
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
  edit
}: OverlayRowProps) {
  const lanes = overlayLanes(overlays)

  function press(event: PointerEvent<HTMLElement>, overlay: Overlay, mode: DragMode) {
    event.stopPropagation()
    onSelect({ kind: 'overlay', id: overlay.id })
    const coalesce = crypto.randomUUID()
    const length = overlay.end - overlay.start
    trackPointer(event, (_move, dx) => {
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
    })
  }

  return (
    <div className="relative" style={{ height: overlayRowHeight(overlays) }}>
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
              'group absolute flex cursor-grab items-center gap-1 overflow-hidden rounded-[5px] pr-1.5 pl-0.5 text-[11px] text-white/90 ring-1 ring-white/10 ring-inset active:cursor-grabbing',
              overlay.kind === 'text' ? 'bg-track-text/70' : 'bg-track-image/70',
              selected && 'ring-brand'
            )}
            style={{
              top: 3 + (lanes.get(overlay.id) ?? 0) * OVERLAY_LANE_HEIGHT,
              height: OVERLAY_LANE_HEIGHT - 3,
              left: overlay.start * pps,
              width: Math.max((overlay.end - overlay.start) * pps, 6)
            }}
            title={label}
          >
            <span
              className={cn(
                'flex size-3.5 shrink-0 items-center justify-center rounded-[3px]',
                overlay.kind === 'text' ? 'bg-track-text' : 'bg-track-image'
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
