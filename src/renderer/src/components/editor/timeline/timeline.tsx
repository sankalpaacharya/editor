import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode
} from 'react'
import {
  AudioWave01Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  TextIcon,
  Video01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  VolumeHighIcon,
  VolumeMute02Icon
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { IconButton } from '@/components/ui/icon-button'
import type { Edit } from '@/components/editor/editor'
import { Panel } from '@/components/ui/panel'
import { ProgramMeter } from '@/components/editor/timeline/program-meter'
import type { FrameSource, MeterFrame } from '@/lib/audio/types'
import { AudioRow } from '@/components/editor/timeline/audio-row'
import {
  AUDIO_ROW_HEIGHT,
  GROUP_GAP,
  GUTTER,
  insertionIndex,
  overlayLayout,
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
import { isTyping } from '@/hooks/use-editor-shortcuts'
import { useElementSize } from '@/hooks/use-element-size'
import type { usePlayback } from '@/hooks/use-playback'
import {
  clipStarts,
  type Track,
  type TrackId,
  type MediaId,
  type MediaItem,
  type Sequence
} from '../../../../../shared/sequence'
import { draggedMediaId, isImageDrag, isMediaDrag } from '@/lib/media-drag'
import { trackPointer } from '@/lib/pointer'
import { isAdditive, onlySelected, type Select, type Selection } from '@/lib/selection'
import { clamp } from '@/lib/format'
import { cn } from '@/lib/utils'

const MAX_ZOOM_FACTOR = 64
const EMPTY_PIXELS_PER_SECOND = 40
const FOLLOW_MARGIN = 24
const WHEEL_ZOOM_RATE = 0.002
const ZOOM_STEP = 0.1

interface TimelineProps {
  meter: FrameSource<MeterFrame>
  sequence: Sequence
  mediaById: ReadonlyMap<MediaId, MediaItem>
  playback: ReturnType<typeof usePlayback>
  selection: Selection
  onSelect: Select
  edit: Edit
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onSplit: () => void
  onTrimLeft: () => void
  onTrimRight: () => void
  onDuplicate: () => void
  onRedo: () => void
  onDelete: () => void
  onDropMedia: (item: MediaItem, at: { index?: number; time?: number }) => void
}

type DropTarget = { kind: 'clip'; index: number } | { kind: 'overlay'; time: number }

export function Timeline({
  meter,
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
  const [snapGuide, setSnapGuide] = useState<number | null>(null)
  const [snapping, setSnapping] = useState(true)
  const { clips, overlays } = sequence
  const scrollerRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element
      return sizeRef(element)
    },
    [sizeRef]
  )

  const trackViewport = Math.max(viewport.width - GUTTER, 0)
  // The scale fits the length the timeline had when it was last fitted, so editing the length
  // doesn't rescale every clip under the pointer. Zooming all the way out fits it again.
  const [fitDuration, setFitDuration] = useState(duration)
  if (fitDuration === 0 && duration > 0) setFitDuration(duration)
  const fitFor = (length: number) =>
    length > 0 ? Math.floor(trackViewport - TAIL) / length : EMPTY_PIXELS_PER_SECOND
  const fit = fitFor(fitDuration)
  const pps = Math.max(fit, 1) * MAX_ZOOM_FACTOR ** zoom
  const trackWidth = Math.max(Math.ceil(duration * pps) + TAIL, Math.floor(trackViewport))
  const starts = clipStarts(clips)

  function zoomTo(next: number, anchor?: { time: number; offset: number }) {
    const scroller = scrollRef.current
    setZoom(next)
    const refit = next === 0 && fitDuration !== duration
    if (refit) setFitDuration(duration)
    if (!scroller) return
    const visible = scroller.clientWidth - GUTTER
    const offset = playhead * pps - scroller.scrollLeft
    const keep = anchor ?? {
      time: playhead,
      offset: offset >= 0 && offset <= visible ? offset : visible / 2
    }
    const nextPps = Math.max(refit ? fitFor(duration) : fit, 1) * MAX_ZOOM_FACTOR ** next
    requestAnimationFrame(() => {
      scroller.scrollLeft = keep.time * nextPps - keep.offset
    })
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTyping(event.target) || event.altKey) return
    const command = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (key === '=' || key === '+') zoomTo(Math.min(zoom + ZOOM_STEP, 1))
    else if (key === '-' || key === '_') zoomTo(Math.max(zoom - ZOOM_STEP, 0))
    else if ((key === 'z' && event.shiftKey && !command) || (key === '0' && command)) zoomTo(0)
    else if (key === 'n' && !command) setSnapping((on) => !on)
    else return
    event.preventDefault()
  })
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const onWheel = useRef<(event: WheelEvent) => void>(() => {})
  useEffect(() => {
    onWheel.current = (event) => {
      const scroller = scrollRef.current
      if (!scroller) return
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const offset = event.clientX - scroller.getBoundingClientRect().left - GUTTER
        const next = clamp(zoom - event.deltaY * WHEEL_ZOOM_RATE, 0, 1)
        zoomTo(next, { time: timeAt(event.clientX), offset })
      } else if (
        Math.abs(event.deltaY) > Math.abs(event.deltaX) &&
        !event.shiftKey &&
        scroller.scrollHeight <= scroller.clientHeight
      ) {
        event.preventDefault()
        scroller.scrollLeft += event.deltaY
      }
    }
  })
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const listener = (event: WheelEvent) => onWheel.current(event)
    scroller.addEventListener('wheel', listener, { passive: false })
    return () => scroller.removeEventListener('wheel', listener)
  }, [])

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

  function pressTracks(event: PointerEvent<HTMLDivElement>) {
    const scroller = event.currentTarget
    const { left, top } = scroller.getBoundingClientRect()
    const onScrollbar =
      event.clientX - left >= scroller.clientWidth || event.clientY - top >= scroller.clientHeight
    if (event.button !== 0 || onScrollbar) return
    onSelect(null, isAdditive(event))
    scrub(event)
  }

  const seekAt = (clientX: number) => seek(timeAt(clientX))

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

  const trackProps = {
    tracks: sequence.tracks,
    onTrack: (track: TrackId, change: Partial<Track>) => edit({ type: 'setTrack', track, change })
  }

  const dropX =
    dropTarget?.kind === 'clip'
      ? (dropTarget.index < clips.length ? starts[dropTarget.index] : duration) * pps
      : dropTarget
        ? Math.min(dropTarget.time, duration) * pps
        : null

  return (
    <Panel className="h-[300px] shrink-0">
      <Toolbar
        {...toolbar}
        canDelete={selection.length > 0}
        canEdit={duration > 0}
        canDuplicate={onlySelected(selection)?.kind === 'clip'}
        zoom={zoom}
        onZoom={zoomTo}
        snapping={snapping}
        onSnapping={setSnapping}
      />
      <div className="flex min-h-0 flex-1">
        <div
          ref={scrollerRef}
          onPointerDown={pressTracks}
          onDragOver={(event) => {
            if (!isMediaDrag(event)) return
            event.preventDefault()
            setDropTarget(targetFor(event))
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDropTarget(null)
          }}
          onDrop={drop}
          className="relative min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain"
        >
          <div className="relative pb-2" style={{ width: GUTTER + trackWidth }}>
            <Row icon={null} className="sticky top-0 z-20 bg-card">
              <Ruler pixelsPerSecond={pps} width={trackWidth} onScrub={scrub} />
            </Row>
            <Row icon={TextIcon} label="Overlays" track="overlays" {...trackProps}>
              <OverlayRow
                overlays={overlays}
                mediaById={mediaById}
                pixelsPerSecond={pps}
                duration={duration}
                selection={selection}
                onSelect={onSelect}
                onSeek={seekAt}
                edit={edit}
              />
            </Row>
            <Row icon={Video01Icon} label="Video" track="video" {...trackProps}>
              <VideoRow
                clips={clips}
                starts={starts}
                mediaById={mediaById}
                pixelsPerSecond={pps}
                selection={selection}
                drag={drag}
                onDrag={setDrag}
                onSelect={onSelect}
                onSeek={seekAt}
                playhead={playhead}
                snapping={snapping}
                onSnapGuide={setSnapGuide}
                edit={edit}
              />
            </Row>
            <div className="flex items-center" style={{ height: GROUP_GAP - ROW_GAP }}>
              <div
                className="sticky left-0 z-10 h-full shrink-0 bg-card"
                style={{ width: GUTTER }}
              />
              <div className="h-px flex-1 bg-border" />
            </div>
            <Row icon={AudioWave01Icon} label="Audio" track="audio" {...trackProps}>
              <AudioRow
                clips={clips}
                starts={starts}
                mediaById={mediaById}
                pixelsPerSecond={pps}
                selection={selection}
                drag={drag}
                onSelect={onSelect}
                onSeek={seekAt}
              />
            </Row>
            {dropX !== null && (
              <div
                className="pointer-events-none absolute bottom-2 z-10 w-0.5 -translate-x-1/2 rounded-full bg-brand/80"
                style={{ left: GUTTER + dropX, top: RULER_HEIGHT }}
              />
            )}
            {snapGuide !== null && (
              <div
                className="pointer-events-none absolute bottom-2 z-20 w-px -translate-x-1/2 bg-selection"
                style={{ left: GUTTER + snapGuide * pps, top: RULER_HEIGHT }}
              />
            )}
            {duration > 0 && (
              <Playhead
                x={GUTTER + playhead * pps}
                height={
                  RULER_HEIGHT +
                  overlayLayout(overlays).rowHeight +
                  VIDEO_ROW_HEIGHT +
                  AUDIO_ROW_HEIGHT +
                  ROW_GAP * 2 +
                  GROUP_GAP
                }
                onScrub={scrub}
              />
            )}
          </div>
        </div>
        <ProgramMeter source={meter} />
      </div>
    </Panel>
  )
}

interface RowProps {
  icon: IconSvgElement | null
  label?: string
  track?: TrackId
  tracks?: Record<TrackId, Track>
  onTrack?: (track: TrackId, change: Partial<Track>) => void
  className?: string
  children: ReactNode
}

function Row({ icon, label, track, tracks, onTrack, className, children }: RowProps) {
  const state = track && tracks?.[track]
  const audio = track === 'audio'
  return (
    <div className={cn('flex', className)} style={{ marginTop: icon ? ROW_GAP : 0 }}>
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r bg-card pr-1 pl-3 text-xs text-muted-foreground"
        style={{ width: GUTTER }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {icon && <HugeiconsIcon icon={icon} strokeWidth={1.6} className="size-4 shrink-0" />}
        <span className={cn('min-w-0 flex-1 truncate', state && !state.enabled && 'opacity-50')}>
          {label}
        </span>
        {track && state && onTrack && (
          <>
            <IconButton
              icon={
                audio
                  ? state.enabled
                    ? VolumeHighIcon
                    : VolumeMute02Icon
                  : state.enabled
                    ? ViewIcon
                    : ViewOffSlashIcon
              }
              label={`${audio ? (state.enabled ? 'Mute' : 'Unmute') : state.enabled ? 'Hide' : 'Show'} ${label?.toLowerCase()}`}
              size="icon-xs"
              aria-pressed={!state.enabled}
              className={cn(!state.enabled && 'text-foreground')}
              onClick={() => onTrack(track, { enabled: !state.enabled })}
            />
            <IconButton
              icon={state.locked ? SquareLock01Icon : SquareUnlock01Icon}
              label={`${state.locked ? 'Unlock' : 'Lock'} ${label?.toLowerCase()}`}
              size="icon-xs"
              aria-pressed={state.locked}
              className={cn(state.locked && 'text-foreground')}
              onClick={() => onTrack(track, { locked: !state.locked })}
            />
          </>
        )}
      </div>
      <div
        className={cn(
          'relative min-w-0 flex-1',
          state?.locked && 'pointer-events-none',
          state && (!state.enabled || state.locked) && 'opacity-50'
        )}
      >
        {children}
      </div>
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
      className="pointer-events-none absolute top-0 z-30 w-px bg-white"
      style={{ left: x, height }}
    >
      <div
        onPointerDown={onScrub}
        className="pointer-events-auto absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-ew-resize"
      />
      <div className="absolute top-2 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_var(--card)]" />
    </div>
  )
}
