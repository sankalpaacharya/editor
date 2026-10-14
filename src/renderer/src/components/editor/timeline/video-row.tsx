import { useState, type PointerEvent } from 'react'
import { ArrowLeft01Icon, ArrowRight01Icon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Edit } from '@/components/editor/editor'
import {
  clipBox,
  snapEdges,
  snapShift,
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
import { isAdditive, isSelected, type Select, type Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const DRAG_THRESHOLD = 3

interface VideoRowProps {
  clips: readonly Clip[]
  starts: number[]
  mediaById: ReadonlyMap<MediaId, MediaItem>
  pixelsPerSecond: number
  selection: Selection
  drag: ClipDrag | null
  onDrag: (drag: ClipDrag | null) => void
  onSelect: Select
  onSeek: (clientX: number) => void
  playhead: number
  snapping: boolean
  onSnapGuide: (time: number | null) => void
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
  onSeek,
  playhead,
  snapping,
  onSnapGuide,
  edit
}: VideoRowProps) {
  function pressClip(event: PointerEvent<HTMLDivElement>, clip: Clip, index: number) {
    event.stopPropagation()
    onSelect({ kind: 'clip', id: clip.id }, isAdditive(event))
    const length = timelineLength(clip)
    const targets = snapping ? snapEdges(clips, index, playhead) : []
    let dragging = false
    let start = starts[index]
    trackPointer(
      event,
      (_move, dx) => {
        dragging ||= Math.abs(dx) > DRAG_THRESHOLD
        if (!dragging) return
        const raw = starts[index] + dx / pps
        const snap = snapShift([raw, raw + length], targets, pps)
        start = Math.max(raw + snap.shift, 0)
        onSnapGuide(snap.at)
        onDrag({ clipId: clip.id, dx: (start - starts[index]) * pps })
      },
      (end) => {
        onDrag(null)
        onSnapGuide(null)
        if (!dragging) return onSeek(end.clientX)
        edit({ type: 'moveClip', clipId: clip.id, start })
      }
    )
  }

  function pressEdge(event: PointerEvent<HTMLDivElement>, clip: Clip, edge: 'in' | 'out') {
    event.stopPropagation()
    const media = mediaById.get(clip.mediaId)
    const mediaDuration = media?.kind === 'video' ? media.duration : clip.out
    const coalesce = crypto.randomUUID()
    const index = clips.indexOf(clip)
    const targets = snapping ? snapEdges(clips, index, playhead) : []
    const edgeTime = starts[index] + (edge === 'in' ? 0 : timelineLength(clip))
    trackPointer(
      event,
      (_move, dx) => {
        const snap = snapShift([edgeTime + dx / pps], targets, pps)
        onSnapGuide(snap.at)
        const delta = (dx / pps + snap.shift) * clip.speed
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
      },
      () => onSnapGuide(null)
    )
  }

  return (
    <div className="relative rounded-md bg-white/[0.02]" style={{ height: VIDEO_ROW_HEIGHT }}>
      {clips.map((clip, index) => {
        if (clip.gap === 0) return null
        const selected = isSelected(selection, 'gap', clip.id)
        return (
          <div
            key={`gap-${clip.id}`}
            onPointerDown={(event) => {
              event.stopPropagation()
              onSelect({ kind: 'gap', id: clip.id }, isAdditive(event))
              onSeek(event.clientX)
            }}
            className={cn(
              'absolute inset-y-0 rounded-md transition-colors',
              selected
                ? 'bg-selection/15 ring-1 ring-selection/60 ring-inset'
                : 'hover:bg-white/[0.03]'
            )}
            style={clipBox(starts[index] - clip.gap, clip.gap, pps)}
          />
        )
      })}
      {clips.map((clip, index) => {
        const media = mediaById.get(clip.mediaId)
        const selected = isSelected(selection, 'clip', clip.id)
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
                selected ? 'ring-[3px] ring-selection' : 'ring-1 ring-white/15'
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute top-1.5 flex max-w-[calc(100%-16px)] items-center gap-1',
                selected ? 'left-5' : 'left-1.5'
              )}
            >
              <Badge className="min-w-0 font-normal">
                <span className="truncate">{media?.name ?? 'Missing media'}</span>
              </Badge>
              {clip.speed !== 1 && <Badge>{clip.speed}x</Badge>}
              {clip.volume === 0 && (
                <Badge className="h-4 px-0.5">
                  <HugeiconsIcon icon={VolumeMute02Icon} strokeWidth={2} className="size-3" />
                </Badge>
              )}
            </div>
            {selected &&
              (['in', 'out'] as const).map((edge) => (
                <div
                  key={edge}
                  onPointerDown={(event) => pressEdge(event, clip, edge)}
                  className={cn(
                    'absolute inset-y-0 flex w-3.5 cursor-ew-resize items-center justify-center bg-selection',
                    edge === 'in' ? 'left-0' : 'right-0'
                  )}
                >
                  <HugeiconsIcon
                    icon={edge === 'in' ? ArrowLeft01Icon : ArrowRight01Icon}
                    strokeWidth={3}
                    className="size-3.5 text-black"
                  />
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
