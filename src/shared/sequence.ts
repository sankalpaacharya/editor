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

export const clipSchema = z.object({
  id: z.string(),
  mediaId: mediaIdSchema,
  in: seconds,
  out: seconds,
  speed: z.number().finite().min(MIN_SPEED).max(MAX_SPEED),
  volume: unit.default(1),
  // Empty timeline time before the clip. Trims open and close gaps instead of shifting later clips.
  gap: seconds.default(0)
})
export type Clip = z.infer<typeof clipSchema>

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

export const sequenceSchema = z.object({
  format: formatSchema,
  clips: z.array(clipSchema),
  overlays: z.array(overlaySchema)
})
export type Sequence = z.infer<typeof sequenceSchema>

export const DEFAULT_FORMAT: Format = { width: 1920, height: 1080, fps: 30 }

export function emptySequence(): Sequence {
  return { format: DEFAULT_FORMAT, clips: [], overlays: [] }
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
  | { type: 'removeClip'; clipId: string }
  | { type: 'duplicateClip'; clipId: string; newClipId: string }
  | { type: 'moveClip'; clipId: string; toIndex: number }
  | { type: 'placeClip'; clipId: string; start: number }
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
        gap: 0
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
    case 'removeClip':
      return { ...sequence, clips: sequence.clips.filter((clip) => clip.id !== action.clipId) }
    case 'duplicateClip': {
      const index = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (index === -1) return sequence
      const copy = { ...sequence.clips[index], id: action.newClipId, gap: 0 }
      return { ...sequence, clips: sequence.clips.toSpliced(index + 1, 0, copy) }
    }
    case 'moveClip': {
      const from = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (from === -1) return sequence
      const to = clamp(action.toIndex, 0, sequence.clips.length - 1)
      const clips = sequence.clips
        .toSpliced(from, 1)
        .toSpliced(to, 0, { ...sequence.clips[from], gap: 0 })
      return { ...sequence, clips }
    }
    case 'placeClip': {
      // Slides a clip between its neighbours without reordering, trading gap before for gap after.
      const index = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (index === -1) return sequence
      const clip = sequence.clips[index]
      const start = clipStarts(sequence.clips)[index]
      const previousEnd = start - clip.gap
      const next = sequence.clips[index + 1]
      const latest = next ? start + next.gap : Infinity
      const gap = clamp(action.start - previousEnd, 0, latest - start + clip.gap)
      const clips = withGap(sequence.clips, index, gap)
      return {
        ...sequence,
        clips: next ? withGap(clips, index + 1, next.gap + clip.gap - gap) : clips
      }
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
