import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode
} from 'react'
import { AudioWave01Icon, TextIcon, Video01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import type { Edit, MasterVolume } from '@/components/editor/editor'
import { Panel } from '@/components/editor/panel'
import { AudioRow } from '@/components/editor/timeline/audio-row'
import {
  AUDIO_ROW_HEIGHT,
  clipStarts,
  GUTTER,
  insertionIndex,
  overlayRowHeight,
  ROW_GAP,
  RULER_HEIGHT,
  TAIL,
  VIDEO_ROW_HEIGHT,
  type ClipDrag
} from '@/components/editor/timeline/geometry'
import { OverlayRow } from '@/components/editor/timeline/overlay-row'
import { Ruler } from '@/components/editor/timeline/ruler'
import { Toolbar } from '@/components/editor/timeline/toolbar'
import { VideoRow } from '@/components/editor/timeline/video-row'
import { useElementSize } from '@/hooks/use-element-size'
import type { usePlayback } from '@/hooks/use-playback'
import type { MediaId, MediaItem, Sequence } from '../../../../../shared/sequence'
import { draggedMediaId, isImageDrag, isMediaDrag } from '@/lib/media-drag'
import { trackPointer } from '@/lib/pointer'
import type { Selection } from '@/lib/selection'
import { cn } from '@/lib/utils'

const MAX_ZOOM_FACTOR = 64
const EMPTY_PIXELS_PER_SECOND = 40
const FOLLOW_MARGIN = 24

interface TimelineProps {
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  playback: ReturnType<typeof usePlayback>
  selection: Selection
  onSelect: (selection: Selection) => void
  edit: Edit
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDelete: () => void
  master: MasterVolume
  onMasterChange: (master: MasterVolume) => void
  onDropMedia: (item: MediaItem, at: { index?: number; time?: number }) => void
}

type DropTarget = { kind: 'clip'; index: number } | { kind: 'overlay'; time: number }

export function Timeline({
  sequence,
  mediaById,
  playback,
  selection,
  onSelect,
  edit,
  onDropMedia,
  ...toolbar
}: TimelineProps) {
  const { playhead, duration, seek } = playback
  const scrollRef = useRef<HTMLDivElement>(null)
  const [sizeRef, viewport] = useElementSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(0)
  const [drag, setDrag] = useState<ClipDrag | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const { clips, overlays } = sequence
  const scrollerRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element
      return sizeRef(element)
    },
    [sizeRef]
  )

  const trackViewport = Math.max(viewport.width - GUTTER, 0)
  const fit = duration > 0 ? Math.floor(trackViewport - TAIL) / duration : EMPTY_PIXELS_PER_SECOND
  const pps = Math.max(fit, 1) * MAX_ZOOM_FACTOR ** zoom
  const trackWidth = Math.max(Math.ceil(duration * pps) + TAIL, Math.floor(trackViewport))
  const starts = clipStarts(clips)

  function zoomTo(next: number) {
    const scroller = scrollRef.current
    setZoom(next)
    if (!scroller) return
    const visible = scroller.clientWidth - GUTTER
    const offset = playhead * pps - scroller.scrollLeft
    const keep = offset >= 0 && offset <= visible ? offset : visible / 2
    const nextPps = Math.max(fit, 1) * MAX_ZOOM_FACTOR ** next
    requestAnimationFrame(() => {
      scroller.scrollLeft = playhead * nextPps - keep
    })
  }

  useEffect(() => {
    const scroller = scrollRef.current
    if (!playback.playing || !scroller) return
    const x = playhead * pps
    const visible = scroller.clientWidth - GUTTER
    if (x < scroller.scrollLeft || x > scroller.scrollLeft + visible - FOLLOW_MARGIN) {
      scroller.scrollLeft = x - FOLLOW_MARGIN
    }
  }, [playhead, pps, playback.playing])

  function timeAt(clientX: number): number {
    const scroller = scrollRef.current
    if (!scroller) return 0
    const left = scroller.getBoundingClientRect().left - scroller.scrollLeft + GUTTER
    return Math.max((clientX - left) / pps, 0)
  }

  function scrub(event: PointerEvent<HTMLElement>) {
    event.stopPropagation()
    seek(timeAt(event.clientX))
    trackPointer(event, (move) => seek(timeAt(move.clientX)))
  }

  function targetFor(event: DragEvent): DropTarget {
    const time = timeAt(event.clientX)
    return isImageDrag(event)
      ? { kind: 'overlay', time }
      : { kind: 'clip', index: insertionIndex(clips, time) }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    setDropTarget(null)
    const id = draggedMediaId(event)
    const item = id ? mediaById.get(id) : undefined
    if (!item) return
    event.preventDefault()
    const time = timeAt(event.clientX)
    if (item.kind === 'image') onDropMedia(item, { time: Math.min(time, duration) })
    else onDropMedia(item, { index: insertionIndex(clips, time) })
  }

  const dropX =
    dropTarget?.kind === 'clip'
      ? (dropTarget.index < clips.length ? starts[dropTarget.index] : duration) * pps
      : dropTarget
        ? Math.min(dropTarget.time, duration) * pps
        : null

  return (
    <Panel className="h-[264px] shrink-0">
      <Toolbar
        {...toolbar}
        playing={playback.playing}
        playhead={playhead}
        duration={duration}
        canDelete={selection !== null}
        onToggle={playback.toggle}
        onSeek={seek}
        zoom={zoom}
        onZoom={zoomTo}
      />
      <div
        ref={scrollerRef}
        onPointerDown={() => onSelect(null)}
        onDragOver={(event) => {
          if (!isMediaDrag(event)) return
          event.preventDefault()
          setDropTarget(targetFor(event))
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null)
        }}
        onDrop={drop}
        className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain"
      >
        <div className="relative pb-2" style={{ width: GUTTER + trackWidth }}>
          <Row icon={null} className="sticky top-0 z-20 bg-card">
            <Ruler pixelsPerSecond={pps} width={trackWidth} onScrub={scrub} />
          </Row>
          <Row icon={TextIcon} label="Overlays">
            <OverlayRow
              overlays={overlays}
              mediaById={mediaById}
              pixelsPerSecond={pps}
              duration={duration}
              selection={selection}
              onSelect={onSelect}
              edit={edit}
            />
          </Row>
          <Row icon={Video01Icon} label="Video">
            <VideoRow
              clips={clips}
              starts={starts}
              mediaById={mediaById}
              pixelsPerSecond={pps}
              selection={selection}
              drag={drag}
              onDrag={setDrag}
              onSelect={onSelect}
              edit={edit}
            />
          </Row>
          <Row icon={AudioWave01Icon} label="Audio">
            <AudioRow
              clips={clips}
              starts={starts}
              mediaById={mediaById}
              pixelsPerSecond={pps}
              selection={selection}
              drag={drag}
              onSelect={onSelect}
            />
          </Row>
          {dropX !== null && (
            <div
              className="pointer-events-none absolute bottom-2 z-10 w-0.5 -translate-x-1/2 rounded-full bg-brand/80"
              style={{ left: GUTTER + dropX, top: RULER_HEIGHT }}
            />
          )}
          {duration > 0 && (
            <Playhead
              x={GUTTER + playhead * pps}
              height={
                RULER_HEIGHT +
                overlayRowHeight(overlays) +
                VIDEO_ROW_HEIGHT +
                AUDIO_ROW_HEIGHT +
                ROW_GAP * 3
              }
              onScrub={scrub}
            />
          )}
        </div>
      </div>
    </Panel>
  )
}

interface RowProps {
  icon: IconSvgElement | null
  label?: string
  className?: string
  children: ReactNode
}

function Row({ icon, label, className, children }: RowProps) {
  return (
    <div className={cn('flex', className)} style={{ marginTop: icon ? ROW_GAP : 0 }}>
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center justify-center bg-card text-muted-foreground"
        style={{ width: GUTTER }}
        title={label}
      >
        {icon && <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-3.5" />}
      </div>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  )
}

function Playhead({
  x,
  height,
  onScrub
}: {
  x: number
  height: number
  onScrub: (event: PointerEvent<HTMLElement>) => void
}) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-30 w-px bg-brand"
      style={{ left: x, height }}
    >
      <div
        onPointerDown={onScrub}
        className="pointer-events-auto absolute -top-px left-1/2 h-3 w-2.5 -translate-x-1/2 cursor-ew-resize rounded-b-[3px] rounded-t-[1px] bg-brand"
      />
    </div>
  )
}
