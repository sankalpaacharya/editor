import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode
} from 'react'
import { mediaUrl } from '../../../../shared/api'
import {
  locate,
  type ClipTransform,
  type ImageMedia,
  type MediaId,
  type MediaItem,
  type Overlay,
  type Sequence
} from '../../../../shared/sequence'
import type { Edit } from '@/components/editor/editor'
import { Panel } from '@/components/ui/panel'
import { useElementSize } from '@/hooks/use-element-size'
import { clamp } from '@/lib/format'
import { draggedMediaId, isMediaDrag } from '@/lib/media-drag'
import { trackPointer } from '@/lib/pointer'
import { isAdditive, isSelected, type Select, type Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

const MARGIN = 8

interface PreviewProps {
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  playhead: number
  activeMediaId: MediaId | null
  registerVideo: (id: MediaId, video: HTMLVideoElement | null) => void
  selection: Selection
  onSelect: Select
  edit: Edit
  onDropImage: (image: ImageMedia, position: { x: number; y: number }) => void
  children?: ReactNode
}

export function Preview({
  sequence,
  mediaById,
  playhead,
  activeMediaId,
  registerVideo,
  selection,
  onSelect,
  edit,
  onDropImage,
  children
}: PreviewProps) {
  const [areaRef, area] = useElementSize<HTMLDivElement>()
  const frameRef = useRef<HTMLDivElement>(null)
  const [dropping, setDropping] = useState(false)
  const { format } = sequence
  const fit = Math.max(
    Math.min((area.width - MARGIN * 2) / format.width, (area.height - MARGIN * 2) / format.height),
    0
  )
  const frame = { width: format.width * fit, height: format.height * fit }
  const position = locate(sequence.clips, playhead)
  const activeClip = position && !position.inGap ? position.clip : undefined
  const videoIds = [...new Set(sequence.clips.map((clip) => clip.mediaId))]

  function startDrag(event: PointerEvent<HTMLDivElement>, overlay: Overlay) {
    event.stopPropagation()
    if (sequence.tracks.overlays.locked) return
    onSelect({ kind: 'overlay', id: overlay.id }, isAdditive(event))
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    const coalesce = crypto.randomUUID()
    trackPointer(event, (_event, dx, dy) =>
      edit(
        {
          type: 'updateOverlay',
          overlay: {
            ...overlay,
            x: clamp(overlay.x + dx / rect.width, 0, 1),
            y: clamp(overlay.y + dy / rect.height, 0, 1)
          }
        },
        coalesce
      )
    )
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    setDropping(false)
    const id = draggedMediaId(event)
    const item = id ? mediaById.get(id) : undefined
    const rect = frameRef.current?.getBoundingClientRect()
    if (item?.kind !== 'image' || !rect) return
    event.preventDefault()
    onDropImage(item, {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
    })
  }

  return (
    <Panel title="Player" className="min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={areaRef}
          data-player-stage
          onPointerDown={() => onSelect(null)}
          onDragOver={(event) => {
            if (!isMediaDrag(event)) return
            event.preventDefault()
            setDropping(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDropping(false)
          }}
          onDrop={drop}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <div
            ref={frameRef}
            className={cn(
              'relative overflow-hidden rounded-lg bg-black',
              dropping && 'ring-2 ring-brand/70'
            )}
            style={frame}
          >
            {videoIds.map((id) => (
              <PreviewVideo
                key={id}
                id={id}
                visible={id === activeMediaId && sequence.tracks.video.enabled}
                transform={id === activeMediaId ? activeClip : undefined}
                registerVideo={registerVideo}
              />
            ))}
            {sequence.clips.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                Drag media here or double-click a video to start
              </p>
            )}
            {sequence.overlays
              .filter(
                (overlay) =>
                  sequence.tracks.overlays.enabled &&
                  overlay.start <= playhead &&
                  playhead <= overlay.end
              )
              .map((overlay) => (
                <div
                  key={overlay.id}
                  onPointerDown={(event) => startDrag(event, overlay)}
                  className={cn(
                    'absolute cursor-move touch-none select-none',
                    isSelected(selection, 'overlay', overlay.id) &&
                      'outline-1 outline-offset-2 outline-selection'
                  )}
                  style={{
                    left: `${overlay.x * 100}%`,
                    top: `${overlay.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: overlay.kind === 'image' ? `${overlay.widthRatio * 100}%` : undefined
                  }}
                >
                  {overlay.kind === 'text' ? (
                    <div
                      style={{
                        fontFamily: 'Overlay',
                        fontSize: (overlay.fontSize * frame.height) / format.height,
                        lineHeight: 1,
                        whiteSpace: 'pre',
                        color: overlay.color
                      }}
                    >
                      {overlay.text}
                    </div>
                  ) : (
                    <img
                      src={mediaUrl.source(overlay.mediaId)}
                      alt={mediaById.get(overlay.mediaId)?.name ?? ''}
                      draggable={false}
                      className="block w-full"
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
        {children}
      </div>
    </Panel>
  )
}

interface PreviewVideoProps {
  transform?: ClipTransform
  id: MediaId
  visible: boolean
  registerVideo: (id: MediaId, video: HTMLVideoElement | null) => void
}

function PreviewVideo({ id, visible, transform, registerVideo }: PreviewVideoProps) {
  const ref = useCallback(
    (video: HTMLVideoElement | null) => registerVideo(id, video),
    [id, registerVideo]
  )
  return (
    <video
      ref={ref}
      crossOrigin="anonymous"
      src={mediaUrl.source(id)}
      preload="auto"
      className={cn('absolute inset-0 size-full object-contain', !visible && 'invisible')}
      style={
        transform && {
          transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
          opacity: transform.opacity
        }
      }
    />
  )
}
