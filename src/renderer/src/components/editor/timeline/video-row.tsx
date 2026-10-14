import { useState, type PointerEvent } from 'react'
import { VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Edit } from '@/components/editor/editor'
import {
  clipBox,
  insertionIndex,
  VIDEO_ROW_HEIGHT,
  type ClipDrag
} from '@/components/editor/timeline/geometry'
import { mediaUrl } from '../../../../../shared/api'
import {
  timelineLength,
  type Clip,
  type MediaId,
  type MediaItem,
  type VideoMedia
} from '../../../../../shared/sequence'
import { clamp } from '@/lib/format'
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
    <div className="relative rounded-md bg-white/[0.02]" style={{ height: VIDEO_ROW_HEIGHT }}>
      {clips.map((clip, index) => {
        const media = mediaById.get(clip.mediaId)
        const selected = selection?.id === clip.id
        const offset = drag?.clipId === clip.id ? drag.dx : 0
        const box = clipBox(starts[index], timelineLength(clip), pps)
        return (
          <div
            key={clip.id}
            data-clip-id={clip.id}
            onPointerDown={(event) => pressClip(event, clip, index)}
            className={cn(
              'absolute inset-y-0 overflow-hidden rounded-md bg-muted',
              offset !== 0 && 'z-10 opacity-85 shadow-lg'
            )}
            style={{ ...box, transform: offset ? `translateX(${offset}px)` : undefined }}
          >
            {media?.kind === 'video' && (
              <Filmstrip clip={clip} media={media} pps={pps} width={Number(box.width)} />
            )}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 rounded-md ring-inset',
                selected ? 'ring-2 ring-brand' : 'ring-1 ring-white/15'
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute top-1.5 flex max-w-[calc(100%-16px)] items-center gap-1 text-[10px] leading-4 text-white/90',
                selected ? 'left-3.5' : 'left-1.5'
              )}
            >
              <span className="truncate rounded-[4px] bg-black/55 px-1.5 backdrop-blur-sm">
                {media?.name ?? 'Missing media'}
              </span>
              {clip.speed !== 1 && (
                <span className="shrink-0 rounded-[4px] bg-black/55 px-1 font-medium tabular-nums backdrop-blur-sm">
                  {clip.speed}x
                </span>
              )}
              {clip.volume === 0 && (
                <span className="flex h-4 shrink-0 items-center rounded-[4px] bg-black/55 px-0.5 backdrop-blur-sm">
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
                    'absolute inset-y-0 flex w-3 cursor-ew-resize items-center justify-center',
                    edge === 'in' ? 'left-0.5' : 'right-0.5'
                  )}
                >
                  <div className="h-5 w-1 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}

const SPRITE_HEIGHT = 54

interface FilmstripProps {
  clip: Clip
  media: VideoMedia
  pps: number
  width: number
}

function Filmstrip({ clip, media, pps, width }: FilmstripProps) {
  const url = mediaUrl.filmstrip(clip.mediaId)
  const [frames, setFrames] = useState<number | null>(null)
  const aspect = media.width / media.height
  const spriteFrameWidth = Math.round((SPRITE_HEIGHT * aspect) / 2) * 2
  const tileWidth = VIDEO_ROW_HEIGHT * (spriteFrameWidth / SPRITE_HEIGHT)
  const frameAt = (time: number) =>
    frames === null ? 0 : clamp(Math.round((time / media.duration) * frames), 0, frames - 1)
  return (
    <>
      <img
        src={url}
        alt=""
        hidden
        onLoad={(event) =>
          setFrames(Math.max(Math.round(event.currentTarget.naturalWidth / spriteFrameWidth), 1))
        }
      />
      {frames !== null &&
        Array.from({ length: Math.ceil(width / tileWidth) }, (_, k) => (
          <div
            key={k}
            className="pointer-events-none absolute inset-y-0"
            style={{
              left: k * tileWidth,
              width: tileWidth,
              backgroundImage: `url("${url}")`,
              backgroundSize: `${frames * tileWidth}px 100%`,
              backgroundPositionX:
                -frameAt(clip.in + ((k + 0.5) * tileWidth * clip.speed) / pps) * tileWidth
            }}
          />
        ))}
    </>
  )
}
