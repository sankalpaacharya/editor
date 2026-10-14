import type { CSSProperties, PointerEvent } from 'react'
import { AUDIO_ROW_HEIGHT, sourceSpan, type ClipDrag } from '@/components/editor/timeline/geometry'
import { mediaUrl } from '../../../../../shared/api'
import {
  timelineLength,
  type Clip,
  type MediaId,
  type MediaItem
} from '../../../../../shared/sequence'
import { useImageStatus } from '@/hooks/use-image-status'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

interface AudioRowProps {
  clips: readonly Clip[]
  starts: number[]
  mediaById: ReadonlyMap<MediaId, MediaItem>
  pixelsPerSecond: number
  selection: Selection
  drag: ClipDrag | null
  onSelect: (selection: Selection) => void
}

export function AudioRow({
  clips,
  starts,
  mediaById,
  pixelsPerSecond: pps,
  selection,
  drag,
  onSelect
}: AudioRowProps) {
  return (
    <div className="relative" style={{ height: AUDIO_ROW_HEIGHT }}>
      {clips.map((clip, index) => {
        const media = mediaById.get(clip.mediaId)
        const offset = drag?.clipId === clip.id ? drag.dx : 0
        const hasAudio = media?.kind === 'video' && media.hasAudio
        return (
          <div
            key={clip.id}
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation()
              onSelect({ kind: 'clip', id: clip.id })
            }}
            className={cn(
              'absolute inset-y-0 overflow-hidden rounded-md bg-track-audio/45 ring-1 ring-track-audio/60 ring-inset',
              selection?.id === clip.id && 'ring-brand/70',
              clip.volume === 0 && 'opacity-50'
            )}
            style={{
              left: starts[index] * pps + 1,
              width: Math.max(timelineLength(clip) * pps - 2, 2),
              transform: offset ? `translateX(${offset}px)` : undefined
            }}
          >
            <Waveform
              url={hasAudio ? mediaUrl.waveform(clip.mediaId) : null}
              style={sourceSpan(clip, media, pps)}
              volume={clip.volume}
            />
          </div>
        )
      })}
    </div>
  )
}

function Waveform({
  url,
  style,
  volume
}: {
  url: string | null
  style: CSSProperties
  volume: number
}) {
  const status = useImageStatus(url)
  if (status !== 'loaded' || url === null) {
    return <div className="absolute inset-x-1 top-1/2 h-px bg-white/30" />
  }
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="pointer-events-none absolute top-1/2 max-w-none -translate-y-1/2 opacity-60"
      style={{ ...style, height: `${Math.max(volume, 0.08) * 100}%` }}
    />
  )
}
