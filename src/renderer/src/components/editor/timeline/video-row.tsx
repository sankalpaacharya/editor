import type { CSSProperties, PointerEvent } from 'react'
import { VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Edit } from '@/components/editor/editor'
import {
  insertionIndex,
  sourceSpan,
  VIDEO_ROW_HEIGHT,
  type ClipDrag
} from '@/components/editor/timeline/geometry'
import { mediaUrl } from '../../../../../shared/api'
import {
  timelineLength,
  type Clip,
  type MediaId,
  type MediaItem
} from '../../../../../shared/sequence'
import { useImageStatus } from '@/hooks/use-image-status'
import { trackPointer } from '@/lib/pointer'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

const DRAG_THRESHOLD = 3

interface VideoRowProps {
  clips: readonly Clip[]
  starts: number[]
  mediaById: ReadonlyMap<MediaId, MediaItem>
  pixelsPerSecond: number
  selection: Selection
  drag: ClipDrag | null
  onDrag: (drag: ClipDrag | null) => void
  onSelect: (selection: Selection) => void
  edit: Edit
}

export function VideoRow({
  clips,
  starts,
  mediaById,
  pixelsPerSecond: pps,
  selection,
  drag,
  onDrag,
  onSelect,
  edit
}: VideoRowProps) {
  function pressClip(event: PointerEvent<HTMLDivElement>, clip: Clip, index: number) {
    event.stopPropagation()
    onSelect({ kind: 'clip', id: clip.id })
    let dragging = false
    trackPointer(
      event,
      (_move, dx) => {
        dragging ||= Math.abs(dx) > DRAG_THRESHOLD
        if (dragging) onDrag({ clipId: clip.id, dx })
      },
      (_end, dx) => {
        onDrag(null)
        if (!dragging) return
        const center = starts[index] + timelineLength(clip) / 2 + dx / pps
        const toIndex = insertionIndex(clips, center, index)
        if (toIndex !== index) edit({ type: 'moveClip', clipId: clip.id, toIndex })
      }
    )
  }

  function pressEdge(event: PointerEvent<HTMLDivElement>, clip: Clip, edge: 'in' | 'out') {
    event.stopPropagation()
    const media = mediaById.get(clip.mediaId)
    const mediaDuration = media?.kind === 'video' ? media.duration : clip.out
    const coalesce = crypto.randomUUID()
    trackPointer(event, (_move, dx) => {
      const delta = (dx / pps) * clip.speed
      edit(
        {
          type: 'trim',
          clipId: clip.id,
          in: edge === 'in' ? clip.in + delta : clip.in,
          out: edge === 'out' ? clip.out + delta : clip.out,
          mediaDuration
        },
        coalesce
      )
    })
  }

  return (
    <div className="relative" style={{ height: VIDEO_ROW_HEIGHT }}>
      {clips.map((clip, index) => {
        const media = mediaById.get(clip.mediaId)
        const selected = selection?.id === clip.id
        const offset = drag?.clipId === clip.id ? drag.dx : 0
        return (
          <div
            key={clip.id}
            data-clip-id={clip.id}
            onPointerDown={(event) => pressClip(event, clip, index)}
            className={cn(
              'absolute inset-y-0 overflow-hidden rounded-md bg-muted ring-1 ring-white/10 ring-inset',
              selected && 'ring-2 ring-brand',
              offset !== 0 && 'z-10 opacity-85 shadow-lg'
            )}
            style={{
              left: starts[index] * pps + 1,
              width: Math.max(timelineLength(clip) * pps - 2, 2),
              transform: offset ? `translateX(${offset}px)` : undefined
            }}
          >
            <Filmstrip
              url={mediaUrl.filmstrip(clip.mediaId)}
              style={sourceSpan(clip, media, pps)}
            />
            <div className="pointer-events-none absolute top-1 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1">
              <span className="truncate rounded-[4px] bg-black/60 px-1 text-[10px] leading-4 text-white/90">
                {media?.name ?? 'Missing media'}
              </span>
              {clip.speed !== 1 && (
                <span className="shrink-0 rounded-[4px] bg-black/60 px-1 text-[10px] leading-4 font-medium text-white/90 tabular-nums">
                  {clip.speed}x
                </span>
              )}
              {clip.volume === 0 && (
                <span className="flex h-4 shrink-0 items-center rounded-[4px] bg-black/60 px-0.5 text-white/90">
                  <HugeiconsIcon icon={VolumeMute02Icon} strokeWidth={2} className="size-3" />
                </span>
              )}
            </div>
            {selected &&
              (['in', 'out'] as const).map((edge) => (
                <div
                  key={edge}
                  onPointerDown={(event) => pressEdge(event, clip, edge)}
                  className={cn(
                    'absolute inset-y-0 flex w-2 cursor-ew-resize items-center justify-center bg-brand',
                    edge === 'in' ? 'left-0' : 'right-0'
                  )}
                >
                  <div className="h-4 w-px bg-brand-foreground/60" />
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}

function Filmstrip({ url, style }: { url: string; style: CSSProperties }) {
  const status = useImageStatus(url)
  if (status !== 'loaded') return null
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="pointer-events-none absolute inset-y-0 h-full max-w-none"
      style={style}
    />
  )
}
