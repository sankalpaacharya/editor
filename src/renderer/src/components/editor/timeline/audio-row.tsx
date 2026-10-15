import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'
import {
  AUDIO_ROW_HEIGHT,
  clipBox,
  MAKE_ROOM,
  shownStart,
  sourceSpan,
  type ClipDrag
} from '@/components/editor/timeline/geometry'
import { mediaUrl } from '../../../../../shared/api'
import {
  timelineLength,
  type Clip,
  type MediaId,
  type MediaItem
} from '../../../../../shared/sequence'
import { trackPointer } from '@/lib/pointer'
import { isAdditive, isSelected, type Select, type Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

interface AudioRowProps {
  clips: readonly Clip[]
  starts: number[]
  mediaById: ReadonlyMap<MediaId, MediaItem>
  pixelsPerSecond: number
  selection: Selection
  drag: ClipDrag | null
  onSelect: Select
  onPressAudio: () => void
  onSeek: (clientX: number) => void
}

export function AudioRow({
  clips,
  starts,
  mediaById,
  pixelsPerSecond: pps,
  selection,
  drag,
  onSelect,
  onPressAudio,
  onSeek
}: AudioRowProps) {
  return (
    <div className="relative rounded-md bg-white/[0.02]" style={{ height: AUDIO_ROW_HEIGHT }}>
      {clips.map((clip, index) => {
        const media = mediaById.get(clip.mediaId)
        const hasAudio = media?.kind === 'video' && media.hasAudio
        return (
          <div
            key={clip.id}
            onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
              event.stopPropagation()
              onSelect({ kind: 'clip', id: clip.id }, isAdditive(event))
              onPressAudio()
              onSeek(event.clientX)
              trackPointer(event, (move) => onSeek(move.clientX))
            }}
            className={cn(
              'absolute inset-y-0 overflow-hidden rounded-md bg-track-audio',
              clip.volume === 0 && 'opacity-40',
              drag?.clipId === clip.id && 'z-10 shadow-lg',
              drag?.starts && drag.clipId !== clip.id && MAKE_ROOM
            )}
            style={clipBox(shownStart(drag, clip, index, starts), timelineLength(clip), pps)}
          >
            <Waveform
              url={hasAudio ? mediaUrl.waveform(clip.mediaId) : null}
              style={sourceSpan(clip, media, pps)}
              volume={clip.volume}
            />
            <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-white">
              <span className="truncate">{hasAudio ? 'Original sound' : 'No audio'}</span>
            </div>
            <div
              className={cn(
                'pointer-events-none absolute inset-0 rounded-md ring-inset',
                isSelected(selection, 'clip', clip.id)
                  ? 'ring-[3px] ring-selection'
                  : 'ring-1 ring-white/20'
              )}
            />
          </div>
        )
      })}
    </div>
  )
}

interface Peaks {
  count: number
  path: string
}

const peaksByUrl = new Map<string, Promise<Peaks | null>>()

async function loadPeaks(url: string): Promise<Peaks | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const { width, height } = bitmap
    const context = new OffscreenCanvas(width, height).getContext('2d')
    if (!context) return null
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, width, height)
    const middle = height / 2
    const extents = Array.from({ length: width }, (_, x) => {
      let extent = 0
      for (let y = 0; y < height; y++) {
        if (data[(y * width + x) * 4 + 3] > 32) {
          extent = Math.max(extent, Math.abs(y + 0.5 - middle))
        }
      }
      return extent / middle
    })
    const loudest = Math.max(...extents, 1e-3)
    // The generated PNG is linear, so speech peaks are a few pixels tall. Normalizing to the
    // loudest column and taking a square root keeps quiet passages readable.
    const levels = extents.map((extent) => Math.max(Math.sqrt(extent / loudest), 0.04) / 2)
    const top = levels.map((level, x) => `${x + 0.5} ${(0.5 - level).toFixed(3)}`)
    const bottom = levels.map((level, x) => `${x + 0.5} ${(0.5 + level).toFixed(3)}`).reverse()
    return { count: width, path: `M${[...top, ...bottom].join('L')}Z` }
  } catch {
    return null
  }
}

function usePeaks(url: string | null): Peaks | null {
  const [loaded, setLoaded] = useState<{ url: string; peaks: Peaks | null } | null>(null)
  useEffect(() => {
    if (url === null) return
    let job = peaksByUrl.get(url)
    if (!job) {
      job = loadPeaks(url)
      peaksByUrl.set(url, job)
    }
    let live = true
    void job.then((peaks) => {
      if (live) setLoaded({ url, peaks })
    })
    return () => {
      live = false
    }
  }, [url])
  return loaded?.url === url ? loaded.peaks : null
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
  const peaks = usePeaks(url)
  if (peaks === null) {
    return <div className="absolute inset-x-2 top-1/2 h-px bg-white/30" />
  }
  return (
    <svg
      viewBox={`0 0 ${peaks.count} 1`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 fill-white/25"
      style={{ ...style, height: `${Math.max(volume, 0.08) * 76}%` }}
    >
      <path d={peaks.path} />
    </svg>
  )
}
