import { z } from 'zod'

const seconds = z.number().finite().nonnegative()
const unit = z.number().finite().min(0).max(1)
const pixels = z.number().int().positive()

export const mediaIdSchema = z.string().uuid()
export type MediaId = z.infer<typeof mediaIdSchema>

export const videoMediaSchema = z.object({
  id: mediaIdSchema,
  kind: z.literal('video'),
  name: z.string(),
  width: pixels,
  height: pixels,
  duration: seconds.positive(),
  fps: z.number().finite().positive(),
  hasAudio: z.boolean()
})
export type VideoMedia = z.infer<typeof videoMediaSchema>

export const imageMediaSchema = z.object({
  id: mediaIdSchema,
  kind: z.literal('image'),
  name: z.string(),
  width: pixels,
  height: pixels
})
export type ImageMedia = z.infer<typeof imageMediaSchema>

export const mediaItemSchema = z.discriminatedUnion('kind', [videoMediaSchema, imageMediaSchema])
export type MediaItem = z.infer<typeof mediaItemSchema>

export const MIN_SPEED = 0.25
export const MAX_SPEED = 4
export const MIN_CLIP_LENGTH = 0.1
export const MIN_SCALE = 0.1
export const MAX_SCALE = 4

export const clipSchema = z.object({
  id: z.string(),
  mediaId: mediaIdSchema,
  in: seconds,
  out: seconds,
  speed: z.number().finite().min(MIN_SPEED).max(MAX_SPEED),
  volume: unit.default(1),
  // Empty timeline time before the clip. Trims open and close gaps instead of shifting later clips.
  gap: seconds.default(0),
  // Picture transform around the frame centre, applied after fitting the clip to the frame.
  scale: z.number().finite().min(MIN_SCALE).max(MAX_SCALE).default(1),
  opacity: unit.default(1),
  rotation: z.number().finite().min(-180).max(180).default(0)
})
export type Clip = z.infer<typeof clipSchema>
export type ClipTransform = Pick<Clip, 'scale' | 'opacity' | 'rotation'>

const overlayBase = {
  id: z.string(),
  start: seconds,
  end: seconds,
  x: unit,
  y: unit
}

export const textOverlaySchema = z.object({
  ...overlayBase,
  kind: z.literal('text'),
  text: z.string().min(1).max(500),
  fontSize: z.number().finite().min(4).max(1000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i)
})
export type TextOverlay = z.infer<typeof textOverlaySchema>

export const imageOverlaySchema = z.object({
  ...overlayBase,
  kind: z.literal('image'),
  mediaId: mediaIdSchema,
  widthRatio: z.number().finite().min(0.01).max(4)
})
export type ImageOverlay = z.infer<typeof imageOverlaySchema>

export const overlaySchema = z.discriminatedUnion('kind', [textOverlaySchema, imageOverlaySchema])
export type Overlay = z.infer<typeof overlaySchema>

export const formatSchema = z.object({
  width: pixels,
  height: pixels,
  fps: z.number().finite().positive()
})
export type Format = z.infer<typeof formatSchema>

export const TRACK_IDS = ['overlays', 'video', 'audio'] as const
export type TrackId = (typeof TRACK_IDS)[number]

// A disabled track is hidden (overlays, video) or muted (audio) in preview and export.
const trackSchema = z.object({ enabled: z.boolean(), locked: z.boolean() })
export type Track = z.infer<typeof trackSchema>
const OPEN_TRACK: Track = { enabled: true, locked: false }

export const sequenceSchema = z.object({
  format: formatSchema,
  clips: z.array(clipSchema),
  overlays: z.array(overlaySchema),
  tracks: z
    .object({ overlays: trackSchema, video: trackSchema, audio: trackSchema })
    .default({ overlays: OPEN_TRACK, video: OPEN_TRACK, audio: OPEN_TRACK })
})
export type Sequence = z.infer<typeof sequenceSchema>

export const DEFAULT_FORMAT: Format = { width: 1920, height: 1080, fps: 30 }

export function emptySequence(): Sequence {
  return {
    format: DEFAULT_FORMAT,
    clips: [],
    overlays: [],
    tracks: { overlays: OPEN_TRACK, video: OPEN_TRACK, audio: OPEN_TRACK }
  }
}

export function timelineLength(clip: Clip): number {
  return (clip.out - clip.in) / clip.speed
}

export function timelineDuration(clips: readonly Clip[]): number {
  return clips.reduce((sum, clip) => sum + clip.gap + timelineLength(clip), 0)
}

export function clipStarts(clips: readonly Clip[]): number[] {
  const starts: number[] = []
  let end = 0
  for (const clip of clips) {
    starts.push(end + clip.gap)
    end += clip.gap + timelineLength(clip)
  }
  return starts
}

export interface TimelinePosition {
  index: number
  clip: Clip
  clipStart: number
  sourceTime: number
  inGap: boolean
}

export function locate(clips: readonly Clip[], time: number): TimelinePosition | null {
  const starts = clipStarts(clips)
  for (let index = 0; index < clips.length; index++) {
    const clip = clips[index]
    const clipStart = starts[index]
    const length = timelineLength(clip)
    if (time < clipStart + length || index === clips.length - 1) {
      const offset = Math.min(Math.max(time - clipStart, 0), length)
      return {
        index,
        clip,
        clipStart,
        sourceTime: clip.in + offset * clip.speed,
        inGap: time < clipStart
      }
    }
  }
  return null
}

// Lays clips out at the given starts in order, pushing any clip that would overlap the one before.
function fromStarts(placed: readonly { clip: Clip; start: number }[]): Clip[] {
  let end = 0
  return placed.map(({ clip, start }) => {
    const gap = Math.max(start - end, 0)
    end += gap + timelineLength(clip)
    return { ...clip, gap }
  })
}

// The magnetic track: puts the clip at the index in the order and closes every gap.
export function reorderClips(clips: readonly Clip[], clipId: string, index: number): Clip[] {
  const from = clips.findIndex((clip) => clip.id === clipId)
  if (from === -1) return [...clips]
  return clips
    .toSpliced(from, 1)
    .toSpliced(index, 0, clips[from])
    .map((clip) => (clip.gap === 0 ? clip : { ...clip, gap: 0 }))
}

function withGap(clips: readonly Clip[], index: number, gap: number): Clip[] {
  const clip = clips[index]
  return clip ? clips.toSpliced(index, 1, { ...clip, gap: Math.max(gap, 0) }) : [...clips]
}

export type SequenceAction =
  | { type: 'addClip'; clipId: string; media: VideoMedia; index?: number }
  | { type: 'split'; time: number; newClipId: string }
  | { type: 'trim'; clipId: string; in: number; out: number; mediaDuration: number }
  | { type: 'setSpeed'; clipId: string; speed: number }
  | { type: 'setVolume'; clipId: string; volume: number }
  | { type: 'setTransform'; clipId: string; change: Partial<ClipTransform> }
  | { type: 'removeClip'; clipId: string }
  | { type: 'duplicateClip'; clipId: string; newClipId: string }
  | { type: 'moveClip'; clipId: string; start: number }
  | { type: 'reorderClip'; clipId: string; index: number }
  | { type: 'closeGap'; clipId: string }
  | { type: 'setTrack'; track: TrackId; change: Partial<Track> }
  | { type: 'setAspect'; width: number; height: number }
  | { type: 'addOverlay'; overlay: Overlay }
  | { type: 'updateOverlay'; overlay: Overlay }
  | { type: 'removeOverlay'; overlayId: string }
  | { type: 'removeMedia'; mediaId: MediaId }

// H.264 with yuv420p needs even frame dimensions.
const even = (pixels: number): number => Math.max(2, Math.round(pixels / 2) * 2)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function editSequence(sequence: Sequence, action: SequenceAction): Sequence {
  switch (action.type) {
    case 'addClip': {
      const { media } = action
      const clip: Clip = {
        id: action.clipId,
        mediaId: media.id,
        in: 0,
        out: media.duration,
        speed: 1,
        volume: 1,
        gap: 0,
        scale: 1,
        opacity: 1,
        rotation: 0
      }
      const index = clamp(action.index ?? sequence.clips.length, 0, sequence.clips.length)
      const format =
        sequence.clips.length === 0
          ? { width: even(media.width), height: even(media.height), fps: media.fps }
          : sequence.format
      return { ...sequence, format, clips: sequence.clips.toSpliced(index, 0, clip) }
    }
    case 'split': {
      const position = locate(sequence.clips, action.time)
      if (!position) return sequence
      const { index, clip, sourceTime } = position
      if (position.inGap) return sequence
      if (sourceTime - clip.in < MIN_CLIP_LENGTH || clip.out - sourceTime < MIN_CLIP_LENGTH) {
        return sequence
      }
      const clips = sequence.clips.toSpliced(
        index,
        1,
        { ...clip, out: sourceTime },
        { ...clip, id: action.newClipId, in: sourceTime, gap: 0 }
      )
      return { ...sequence, clips }
    }
    case 'trim': {
      // Edges move in place: the gaps on either side absorb the change, and later clips are
      // pushed only once the gap after the clip is used up.
      const index = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (index === -1) return sequence
      const clip = sequence.clips[index]
      const out = clamp(action.out, MIN_CLIP_LENGTH, action.mediaDuration)
      const trimmed = { ...clip, in: clamp(action.in, 0, out - MIN_CLIP_LENGTH), out }
      const start = clipStarts(sequence.clips)[index]
      const previousEnd = start - clip.gap
      const nextStart = start + timelineLength(clip) + (sequence.clips[index + 1]?.gap ?? 0)
      trimmed.gap = Math.max(clip.gap + (trimmed.in - clip.in) / clip.speed, 0)
      const end = previousEnd + trimmed.gap + timelineLength(trimmed)
      const clips = withGap(sequence.clips.toSpliced(index, 1, trimmed), index + 1, nextStart - end)
      return { ...sequence, clips }
    }
    case 'setSpeed': {
      const speed = clamp(action.speed, MIN_SPEED, MAX_SPEED)
      const clips = sequence.clips.map((clip) =>
        clip.id === action.clipId ? { ...clip, speed } : clip
      )
      return { ...sequence, clips }
    }
    case 'setVolume': {
      const volume = clamp(action.volume, 0, 1)
      const clips = sequence.clips.map((clip) =>
        clip.id === action.clipId ? { ...clip, volume } : clip
      )
      return { ...sequence, clips }
    }
    case 'setTransform': {
      const { scale, opacity, rotation } = action.change
      const clips = sequence.clips.map((clip) =>
        clip.id === action.clipId
          ? {
              ...clip,
              scale: scale === undefined ? clip.scale : clamp(scale, MIN_SCALE, MAX_SCALE),
              opacity: opacity === undefined ? clip.opacity : clamp(opacity, 0, 1),
              rotation: rotation === undefined ? clip.rotation : clamp(rotation, -180, 180)
            }
          : clip
      )
      return { ...sequence, clips }
    }
    case 'removeClip':
      return { ...sequence, clips: sequence.clips.filter((clip) => clip.id !== action.clipId) }
    case 'duplicateClip': {
      const index = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (index === -1) return sequence
      const copy = { ...sequence.clips[index], id: action.newClipId, gap: 0 }
      return { ...sequence, clips: sequence.clips.toSpliced(index + 1, 0, copy) }
    }
    case 'moveClip': {
      // Drops the clip at the requested time. Every other clip keeps its place unless the
      // dropped clip would overlap it, in which case it and the clips after it shift right.
      const from = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (from === -1) return sequence
      const moved = sequence.clips[from]
      const length = timelineLength(moved)
      const starts = clipStarts(sequence.clips)
      const others = sequence.clips
        .map((clip, index) => ({ clip, start: starts[index] }))
        .filter((_, index) => index !== from)
      const center = action.start + length / 2
      const to = others.filter(
        ({ clip, start }) => start + timelineLength(clip) / 2 < center
      ).length
      // Dropping onto a clip inserts at its edge rather than shoving it part of the way.
      const previous = others[to - 1]
      const previousEnd = previous ? previous.start + timelineLength(previous.clip) : 0
      const nextStart = others[to]?.start ?? Number.POSITIVE_INFINITY
      const start = Math.max(Math.min(action.start, nextStart), previousEnd)
      const placed = others.toSpliced(to, 0, { clip: moved, start })
      return { ...sequence, clips: fromStarts(placed) }
    }
    case 'reorderClip': {
      const clips = reorderClips(sequence.clips, action.clipId, action.index)
      const unchanged = clips.every((clip, index) => clip === sequence.clips[index])
      return unchanged ? sequence : { ...sequence, clips }
    }
    case 'closeGap': {
      const index = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      return index === -1 ? sequence : { ...sequence, clips: withGap(sequence.clips, index, 0) }
    }
    case 'setAspect': {
      // Keeps the frame's short side and reshapes the long side to the requested ratio.
      const short = Math.min(sequence.format.width, sequence.format.height)
      const scale = short / Math.min(action.width, action.height)
      const format = {
        ...sequence.format,
        width: even(action.width * scale),
        height: even(action.height * scale)
      }
      return { ...sequence, format }
    }
    case 'setTrack': {
      const track = { ...sequence.tracks[action.track], ...action.change }
      return { ...sequence, tracks: { ...sequence.tracks, [action.track]: track } }
    }
    case 'addOverlay':
      return { ...sequence, overlays: [...sequence.overlays, action.overlay] }
    case 'updateOverlay':
      return {
        ...sequence,
        overlays: sequence.overlays.map((overlay) =>
          overlay.id === action.overlay.id ? action.overlay : overlay
        )
      }
    case 'removeOverlay':
      return {
        ...sequence,
        overlays: sequence.overlays.filter((overlay) => overlay.id !== action.overlayId)
      }
    case 'removeMedia':
      return {
        ...sequence,
        clips: sequence.clips.filter((clip) => clip.mediaId !== action.mediaId),
        overlays: sequence.overlays.filter(
          (overlay) => overlay.kind !== 'image' || overlay.mediaId !== action.mediaId
        )
      }
  }
}
