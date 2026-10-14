import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode
} from 'react'
import { mediaUrl } from '../../../../shared/api'
import type { ImageMedia, MediaId, MediaItem, Overlay, Sequence } from '../../../../shared/sequence'
import type { Edit, MasterVolume } from '@/components/editor/editor'
import { Panel } from '@/components/editor/panel'
import { useElementSize } from '@/hooks/use-element-size'
import { clamp } from '@/lib/format'
import { draggedMediaId, isMediaDrag } from '@/lib/media-drag'
import { trackPointer } from '@/lib/pointer'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'
import { VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons'
import { Slider } from '@/components/ui/slider'
import { IconButton } from '@/components/icon-button'

const MARGIN = 12

interface PreviewProps {
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  playhead: number
  activeMediaId: MediaId | null
  registerVideo: (id: MediaId, video: HTMLVideoElement | null) => void
  selection: Selection
  onSelect: (selection: Selection) => void
  edit: Edit
  onDropImage: (image: ImageMedia, position: { x: number; y: number }) => void
  master: MasterVolume
  onMasterChange: (master: MasterVolume) => void
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
  master,
  onMasterChange,
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
  const videoIds = [...new Set(sequence.clips.map((clip) => clip.mediaId))]

  function startDrag(event: PointerEvent<HTMLDivElement>, overlay: Overlay) {
    event.stopPropagation()
    onSelect({ kind: 'overlay', id: overlay.id })
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
    <Panel className="min-w-0 flex-1 flex-row">
      <VolumeColumn master={master} onChange={onMasterChange} />
      <div className="flex min-w-0 flex-1 flex-col border-l">
        <div
          ref={areaRef}
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
                visible={id === activeMediaId}
                registerVideo={registerVideo}
              />
            ))}
            {sequence.clips.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                Drag media here or double-click a video to start
              </p>
            )}
            {sequence.overlays
              .filter((overlay) => overlay.start <= playhead && playhead <= overlay.end)
              .map((overlay) => (
                <div
                  key={overlay.id}
                  onPointerDown={(event) => startDrag(event, overlay)}
                  className={cn(
                    'absolute cursor-move touch-none select-none',
                    selection?.id === overlay.id && 'outline-1 outline-offset-2 outline-brand'
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
  id: MediaId
  visible: boolean
  registerVideo: (id: MediaId, video: HTMLVideoElement | null) => void
}

function PreviewVideo({ id, visible, registerVideo }: PreviewVideoProps) {
  const ref = useCallback(
    (video: HTMLVideoElement | null) => registerVideo(id, video),
    [id, registerVideo]
  )
  return (
    <video
      ref={ref}
      src={mediaUrl.source(id)}
      preload="auto"
      className={cn('absolute inset-0 size-full object-contain', !visible && 'invisible')}
    />
  )
}

function VolumeColumn({
  master,
  onChange
}: {
  master: MasterVolume
  onChange: (master: MasterVolume) => void
}) {
  const level = master.muted ? 0 : master.level
  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-3 py-4">
      <Slider
        orientation="vertical"
        aria-label="Preview volume"
        value={[level * 100]}
        max={100}
        step={1}
        onValueChange={([percent]) => onChange({ level: percent / 100, muted: false })}
        className="min-h-0 flex-1"
      />
      <IconButton
        icon={level > 0 ? VolumeHighIcon : VolumeMute02Icon}
        label={master.muted ? 'Unmute preview' : 'Mute preview'}
        aria-pressed={master.muted}
        onClick={() => onChange({ ...master, muted: !master.muted })}
      />
    </div>
  )
}
